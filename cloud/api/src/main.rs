use axum::{
    extract::{State, Json, Request},
    routing::{get, post, any},
    Router,
    response::{IntoResponse, Response},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing::{info, error};
use reqwest::Client;
use sqlx::{PgPool, postgres::PgPoolOptions};

#[derive(Clone)]
struct AppState {
    posthog_client: Client,
    posthog_key: String,
    stripe_webhook_secret: String,
    db: PgPool,
    http_client: Client,
}

#[derive(Deserialize)]
struct TelemetryPayload {
    event: String,
    session_id: Option<String>,
    properties: Value,
    ts: i64,
}

async fn health_check() -> &'static str {
    "OK"
}

// Telemetry Ingestion Endpoint
async fn ingest_telemetry(
    State(state): State<AppState>,
    Json(payload): Json<TelemetryPayload>,
) -> impl IntoResponse {
    let posthog_url = "https://app.posthog.com/capture/";
    
    let posthog_payload = serde_json::json!({
        "api_key": state.posthog_key,
        "event": payload.event,
        "properties": payload.properties,
        "distinct_id": payload.session_id.unwrap_or_else(|| "anonymous".to_string()),
        "timestamp": payload.ts,
    });

    match state.posthog_client.post(posthog_url).json(&posthog_payload).send().await {
        Ok(_) => (StatusCode::OK, "Telemetry tracked").into_response(),
        Err(e) => {
            error!("Failed to track telemetry: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to track telemetry").into_response()
        }
    }
}

// AI Proxy Layer
async fn ai_proxy(
    State(state): State<AppState>,
    req: Request<axum::body::Body>,
) -> Result<Response<axum::body::Body>, StatusCode> {
    // In a full implementation, we'd check session cookies or tokens here against the db.
    // Let's assume for now that requests provide an authorization token if we wanted.
    
    // We'll just read the body and forward it to Anthropic
    let anthropic_key = std::env::var("ANTHROPIC_API_KEY").unwrap_or_default();
    
    if anthropic_key.is_empty() {
        tracing::error!("ANTHROPIC_API_KEY is not configured on the server");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    let client = reqwest::Client::new();
    
    let path = req.uri().path().replace("/api/chat/stream", "/v1/messages").replace("/api/v1/messages", "/v1/messages");
    let url = format!("https://api.anthropic.com{}", path);
    
    let mut builder = client.post(&url)
        .header("x-api-key", anthropic_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json");

    // Optional: forward any incoming headers we want, but we'll keep it simple
    let body_bytes = axum::body::to_bytes(req.into_body(), 1024 * 1024 * 10).await.map_err(|_| StatusCode::BAD_REQUEST)?;
    
    let resp = builder.body(body_bytes).send().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    
    let status = resp.status();
    let stream = resp.bytes_stream();
    let body = axum::body::Body::from_stream(stream);
    
    let mut response = Response::new(body);
    *response.status_mut() = status;
    
    Ok(response)
}

// Stripe Webhook Endpoint for Paid Plans
async fn stripe_webhook() -> impl IntoResponse {
    // In a real implementation, we would use the `stripe` crate to verify the webhook signature
    // and update the user's tier in the Postgres database.
    (StatusCode::OK, "Webhook received").into_response()
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    let state = AppState {
        posthog_client: Client::new(),
        posthog_key: std::env::var("POSTHOG_API_KEY").unwrap_or_default(),
        stripe_webhook_secret: std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default(),
        db: pool,
        http_client: Client::new(),
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/telemetry/event", post(ingest_telemetry))
        .route("/api/chat/stream", post(ai_proxy))
        .route("/api/v1/messages", post(ai_proxy))
        .route("/api/webhooks/stripe", post(stripe_webhook))
        .with_state(state);

    let listener = TcpListener::bind("0.0.0.0:8080").await.unwrap();
    info!("Server running on 0.0.0.0:8080");
    axum::serve(listener, app).await.unwrap();
}
