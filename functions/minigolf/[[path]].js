// Reverse-proxies everything under /minigolf/* to the minigolf-app Worker,
// which is built with basePath "/minigolf" so its own asset URLs, redirects,
// and next/link hrefs already carry that prefix.
//
// fetch() to an absolute URL overrides the Host header, so the backend Worker
// only ever sees itself as "minigolf-app.edward-s-hansen.workers.dev" -- not
// this site's public domain. Clerk (and anything else building self-referential
// URLs) picks that host up and bakes it into things like the post-sign-in
// "return to" URL, which then leaks the backend's *.workers.dev host to the
// browser and bounces it off this proxy entirely. Two mitigations:
//  1. Forward X-Forwarded-Host/-Proto, which Clerk explicitly prefers over Host
//     when deriving its own request URL, so it builds the right origin up front.
//  2. As a backstop, rewrite any remaining occurrence of the backend origin in
//     a Location header -- not just as a prefix, since it can also show up
//     (raw or percent-encoded) inside a redirect's query string.
// Redirects are handled manually (not auto-followed) so this rewrite can run.

const BACKEND_ORIGIN = "https://minigolf-app.edward-s-hansen.workers.dev";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = new URL(url.pathname + url.search, BACKEND_ORIGIN);

  const proxiedHeaders = new Headers(context.request.headers);
  proxiedHeaders.set("x-forwarded-host", url.host);
  proxiedHeaders.set("x-forwarded-proto", url.protocol.replace(":", ""));

  const proxiedRequest = new Request(target.toString(), {
    method: context.request.method,
    headers: proxiedHeaders,
    body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
    redirect: "manual",
  });

  const response = await fetch(proxiedRequest);

  const location = response.headers.get("location");
  const encodedBackendOrigin = encodeURIComponent(BACKEND_ORIGIN);
  if (location && (location.includes(BACKEND_ORIGIN) || location.includes(encodedBackendOrigin))) {
    const rewritten = location
      .split(BACKEND_ORIGIN).join(url.origin)
      .split(encodedBackendOrigin).join(encodeURIComponent(url.origin));
    const rewrittenHeaders = new Headers(response.headers);
    rewrittenHeaders.set("location", rewritten);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: rewrittenHeaders,
    });
  }

  return response;
}
