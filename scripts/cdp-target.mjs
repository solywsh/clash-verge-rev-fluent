// Resolve a debuggable page's WebSocket URL from the CDP HTTP endpoint, so the
// scripts don't hardcode a page id (it changes every time WebView2 restarts).
// Override the endpoint with CDP_ENDPOINT; optionally pass a URL substring to
// pick a specific page when several are open.
export async function resolveWsUrl(match) {
  const endpoint = process.env.CDP_ENDPOINT || "http://localhost:9222";
  const res = await fetch(`${endpoint}/json`);
  const targets = await res.json();
  const pages = targets.filter(
    (t) => t.type === "page" && t.webSocketDebuggerUrl,
  );
  const page = match
    ? pages.find((t) => (t.url || "").includes(match))
    : pages[0];
  if (!page) {
    throw new Error(
      `no debuggable page found at ${endpoint}${match ? ` matching "${match}"` : ""}`,
    );
  }
  return page.webSocketDebuggerUrl;
}
