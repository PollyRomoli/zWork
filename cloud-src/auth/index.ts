import { Hono } from "hono";
import { cors } from "hono/cors";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "https://api.tryzwork.app";
const TRUSTED_ORIGINS = [
  "https://tryzwork.app",
  "https://www.tryzwork.app",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://localhost:5173",
  "tauri://localhost",
  "https://tauri.localhost",
  "http://tauri.localhost",
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  appName: "zWork",
  baseURL: BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectURI: "https://api.tryzwork.app/api/auth/callback/google",
    },
  },
  trustedOrigins: TRUSTED_ORIGINS,
});

const app = new Hono();

type DesktopGoogleQuery = {
  callbackURL?: string;
  errorCallbackURL?: string;
};

app.use("*", cors({
  origin: (origin) => {
    const allowed = TRUSTED_ORIGINS;
    if (!origin || allowed.includes(origin)) return origin;
    return allowed[0];
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
}));

app.on(["POST", "GET", "PUT", "DELETE", "PATCH", "OPTIONS"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

app.get("/api/auth/desktop/google", async (c) => {
  const query = c.req.query() as DesktopGoogleQuery;
  const callbackURL = query.callbackURL;
  const errorCallbackURL = query.errorCallbackURL || callbackURL;

  if (!callbackURL) {
    return c.text("Missing callbackURL", 400);
  }

  const response = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL,
      errorCallbackURL,
    },
    headers: c.req.raw.headers,
    asResponse: true,
  });

  return response;
});

app.get("/health", (c) => c.text("OK"));
app.get("/", (c) => c.text("OK"));

export default {
  port: 3000,
  fetch: app.fetch,
};
