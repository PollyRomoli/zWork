import React from "react";
import ReactDOM from "react-dom/client";
import { PostHogProvider } from "@posthog/react";
import App from "./App";
import "./index.css";
import { posthogOptions, posthogProjectToken } from "./lib/posthog";
import { initTheme } from "./lib/theme";

// Apply stored/system theme BEFORE React mounts to avoid a color flash.
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PostHogProvider apiKey={posthogProjectToken} options={posthogOptions}>
      <App />
    </PostHogProvider>
  </React.StrictMode>,
);
