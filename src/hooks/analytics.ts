import { getConfig } from "../config";

// Optional Umami analytics. Inert unless BOTH the script URL and the website
// id are present. Uses only Umami's automatic pageview. It never sends a
// custom event, so no atlas text, place name, or entry body can reach it.

export function initAnalytics(doc: Document = document): void {
  const { umamiUrl, umamiWebsiteId } = getConfig();
  if (!umamiUrl || !umamiWebsiteId) return;

  // Inject at most once.
  if (doc.querySelector("script[data-nc-analytics]")) return;

  const script = doc.createElement("script");
  script.defer = true;
  script.src = umamiUrl;
  script.setAttribute("data-website-id", umamiWebsiteId);
  script.setAttribute("data-nc-analytics", "1");
  doc.head.appendChild(script);
}
