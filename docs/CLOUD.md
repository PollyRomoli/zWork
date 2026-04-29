# zWork Cloud Infrastructure

This document describes the cloud infrastructure powering zWork's backend services.

## Architecture Overview

```
                    +------------------+
                    |   Cloudflare DNS  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
        +-----v------+              +------v------+
        |  api.tryzwork.app  |      |  db.tryzwork.app  |
        |  (Caddy Proxy)     |      |  (pgAdmin)        |
        +--------+---------+          +-----------------+
                 |
       +---------+----------+
       |                      |
  +----v-----+          +----v---------+
  | Axum API |          | Better Auth  |
  | :8080    |          | :3000        |
  +----+-----+          +----+---------+
       |                     |
       +----------+----------+
                  |
           +------v-------+
           |  PostgreSQL   |
           |   :5432       |
           +---------------+
```

## Services

### Caddy Reverse Proxy

- **Image**: `caddy:2-alpine`
- **Ports**: `80`, `443` (auto HTTPS via Let's Encrypt)
- **Config**: `cloud/Caddyfile`
- **Routes**:
  - `api.tryzwork.app/api/auth/*` → Better Auth (`better_auth:3000`)
  - `api.tryzwork.app/api/*` → Axum API (`axum_api:8080`)
  - `api.tryzwork.app/health` → Axum health check
  - `db.tryzwork.app` → pgAdmin (`pgadmin:80`)
  - `analytics.tryzwork.app` → PostHog redirect

### Axum API (Rust)

- **Build**: `cloud/api/Dockerfile`
- **Port**: `8080`
- **Features**:
  - AI proxy to Ollama Cloud (minimax-m2.7:cloud enforced)
  - Chat streaming (`/api/chat/stream`)
  - OpenAI-compatible endpoints (`/api/v1/*`)
  - User management endpoints (`/api/users/*`)
  - Stripe webhook stub
  - Telemetry proxy

### Better Auth (Node/Bun)

- **Build**: `cloud/auth/Dockerfile`
- **Port**: `3000`
- **Features**:
  - Email + password authentication
  - Google OAuth 2.0
  - Session management
  - PostgreSQL-backed user storage

### PostgreSQL

- **Image**: `postgres:15-alpine`
- **Database**: `zwork_db`
- **User**: `zwork`
- **Schema**: `cloud/db/schema.sql`
- **Tables**:
  - `users` — custom user tracking (tier, subscription)
  - Better Auth managed tables (auto-created)

### pgAdmin

- **Image**: `dpage/pgadmin4`
- **Login**: `admin@tryzwork.app` / `zwork_admin_pass`
- **Access**: `db.tryzwork.app`

## Deployment

```bash
cd cloud/
docker compose up -d --build
```

## Environment Variables

Create `cloud/.env`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
POSTHOG_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Server Details

- **IP**: `129.213.43.152`
- **OS**: Ubuntu (OCI VM)
- **SSH Key**: `~/Downloads/ssh-key-2026-04-19.key`
- **User**: `ubuntu`

## Subdomains

| Subdomain | Service | Status |
|-----------|---------|--------|
| `api.tryzwork.app` | API + Auth | Active |
| `db.tryzwork.app` | pgAdmin | Active |
| `analytics.tryzwork.app` | PostHog redirect | Active |

## Health Checks

```bash
curl https://api.tryzwork.app/health        # Axum API
curl https://api.tryzwork.app/api/auth/health # Better Auth (via Caddy)
```
