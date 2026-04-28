import { Hono } from "hono";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: {
    dialect: "postgres",
    pool,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
});

const app = new Hono();

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

export default {
  port: 3000,
  fetch: app.fetch,
};
