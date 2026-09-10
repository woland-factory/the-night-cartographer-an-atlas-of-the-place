#!/bin/sh
set -e

# Write the runtime config from environment variables so one image serves any
# deploy. All values default to empty, which keeps analytics and error
# tracking switched off unless the deploy provides them.
cat > /usr/share/nginx/html/config.js <<EOF
window.__NC_CONFIG__ = {
  SEED_DEMO: "${SEED_DEMO:-}",
  UMAMI_URL: "${UMAMI_URL:-}",
  UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}",
  SENTRY_DSN: "${SENTRY_DSN:-}"
};
EOF
