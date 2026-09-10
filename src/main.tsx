import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./ui/tokens.css";
import { App } from "./ui/App";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { initAnalytics } from "./hooks/analytics";
import { initErrorTracking } from "./hooks/errors";
import { init as initStore } from "./state/atlasStore";

// Wire the optional hooks (inert without their env) before anything else, so
// an error during startup can still be reported.
initErrorTracking();
initAnalytics();

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root");
const root = createRoot(container);

// Read persisted state first, then mount. The inline app shell stays visible
// until this resolves, so the first paint is never blank and never white.
void initStore().then(() => {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
});
