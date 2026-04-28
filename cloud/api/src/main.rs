use axum::{
    extract::{State, Json},
    routing::{get, post},
    Router,
    response::IntoResponse,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing::info;
use reqwest::Client;

#[derive(Clone)]
struct AppState {
    posthog_client: Client,
    posthog_key: String,
    stripe_webhook_secret: String,
}

#[derive(Deserialize)]
struct TelemetryPayload {
    event: String,
    session_id: String,
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
    // Forward to PostHog
    let posthog_url = format!("https://app.posthog.com/capture/");
    
    let posthog_payload = serde_json::json!({
        "api_key": state.posthog_key,
        "event": payload.event,
        "properties": payload.properties,
        "distinct_id": payload.session_id,
        "timestamp": payload.ts,
    });

    match state.posthog_client.post(&posthog_url).json(&posthog_payload).send().await {
        Ok(_) => (StatusCode::OK, "Telemetry tracked"),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to track telemetry"),
    }
}

// Stripe Webhook Endpoint for Paid Plans
async fn stripe_webhook() -> impl IntoResponse {
    // In a real implementation, we would use the `stripe` crate to verify the webhook signature
    // and update the user's tier in the Postgres database.
    (StatusCode::OK, "Webhook received")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = AppState {
        posthog_client: Client::new(),
        posthog_key: std::env::var("POSTHOG_API_KEY").unwrap_or_default(),
        stripe_webhook_secret: std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default(),
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/telemetry/event", post(ingest_telemetry))
        .route("/api/webhooks/stripe", post(stripe_webhook))
        .with_state(state);

    let listener = TcpListener::bind("0.0.0.0:8080").await.unwrap();
    info!("Server running on 0.0.0.0:8080");
    axum::serve(listener, app).await.unwrap();
}
