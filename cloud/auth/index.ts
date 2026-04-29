import { Hono } from "hono";
import { cors } from "hono/cors";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
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
  trustedOrigins: [
    "https://tryzwork.app",
    "https://www.tryzwork.app",
    "http://localhost:1420",
    "http://127.0.0.1:1420",
    "http://localhost:5173",
    "tauri://localhost",
    "https://tauri.localhost",
    "http://tauri.localhost",
  ],
});

const app = new Hono();

app.use("*", cors({
  origin: (origin) => {
    const allowed = [
      "https://tryzwork.app",
      "https://www.tryzwork.app",
      "http://localhost:1420",
      "http://127.0.0.1:1420",
      "http://localhost:5173",
      "tauri://localhost",
      "https://tauri.localhost",
      "http://tauri.localhost",
    ];
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

app.get("/health", (c) => c.text("OK"));

export default {
  port: 3000,
  fetch: app.fetch,
};
