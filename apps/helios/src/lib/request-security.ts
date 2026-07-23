export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || (fetchSite && fetchSite !== "same-origin")) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      requestUrl.host;
    const forwardedProtocol =
      request.headers.get("x-forwarded-proto") ||
      requestUrl.protocol.replace(":", "");
    return (
      originUrl.host === forwardedHost &&
      originUrl.protocol === `${forwardedProtocol}:`
    );
  } catch {
    return false;
  }
}

export function apiJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
