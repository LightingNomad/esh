// Reverse-proxies everything under /minigolf/* to the minigolf-app Worker,
// which is built with basePath "/minigolf" so its own asset URLs, redirects,
// and next/link hrefs already carry that prefix. Redirects are handled
// manually (not auto-followed) so any Location header pointing at the
// backend's real *.workers.dev host gets rewritten back to this site's
// domain instead of bouncing the browser off it.

const BACKEND_ORIGIN = "https://minigolf-app.edward-s-hansen.workers.dev";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = new URL(url.pathname + url.search, BACKEND_ORIGIN);

  const proxiedRequest = new Request(target.toString(), {
    method: context.request.method,
    headers: context.request.headers,
    body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
    redirect: "manual",
  });

  const response = await fetch(proxiedRequest);

  const location = response.headers.get("location");
  if (location && location.startsWith(BACKEND_ORIGIN)) {
    const rewrittenHeaders = new Headers(response.headers);
    rewrittenHeaders.set("location", location.replace(BACKEND_ORIGIN, url.origin));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: rewrittenHeaders,
    });
  }

  return response;
}
