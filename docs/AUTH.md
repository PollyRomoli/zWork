# zWork Authentication

This document describes the authentication architecture for zWork.

## Overview

zWork uses a hybrid authentication model:
- **Desktop app**: Google OAuth 2.0 (implicit flow via popup window)
- **Cloud auth service**: Better Auth (v1.6.9) with PostgreSQL backing
- **Future**: Email + password with verification codes

## Desktop App Flow (Google OAuth)

1. User clicks "Sign in with Google" in `LoginScreen.tsx`
2. App opens a popup to Google's OAuth consent screen
3. User authenticates with Google
4. Popup redirects to `oauth-callback.html` with access token in hash
5. Callback page posts `OAUTH_SUCCESS` message to parent window
6. App fetches user info from Google API and stores in Zustand + localStorage

### Desktop OAuth Configuration

- Client ID: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- Redirect URI: `http://localhost:1420/oauth-callback.html` (desktop) / `https://tryzwork.app/oauth-callback.html` (web)
- Scope: `openid email profile`

### Known Issues

- **Desktop client type** in Google Cloud Console does not support `response_type=token` (implicit flow). For local testing, create a **Web application** OAuth client with redirect URIs registered.
- Production deployment uses the Web application client type.

## Cloud Auth Service (Better Auth)

The `better_auth` service runs at `api.tryzwork.app/api/auth/*` behind Caddy.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-in/email` | POST | Email + password login |
| `/api/auth/sign-up/email` | POST | Email + password registration |
| `/api/auth/sign-in/social` | POST | Social login (Google) |
| `/api/auth/sign-out` | POST | Sign out |
| `/api/auth/session` | GET | Get current session |

### Database Schema

Better Auth manages its own tables (`user`, `session`, `account`, `verification`).

Our custom `users` table (for tier/subscription tracking):

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture_url TEXT,
    tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
    subscription_id VARCHAR(255),
    subscription_status VARCHAR(50),
    subscription_end_date TIMESTAMP WITH TIME ZONE
);
```

## User Tier System

| Tier | Models | Features |
|------|--------|----------|
| `free` | minimax-m2.7:cloud | Basic chat, file ops |
| `pro` | All models | Cloud sync, priority, advanced features |

Tier enforcement happens in the Axum API proxy (`cloud/api/src/main.rs`).

## Environment Variables

```bash
# Auth service
DATABASE_URL=postgres://zwork:zwork_password@postgres:5432/zwork_db
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://api.tryzwork.app
```

## Future Work

- [ ] Email verification codes
- [ ] Password reset flow
- [ ] Session refresh tokens
- [ ] Cross-device sync via Better Auth sessions
