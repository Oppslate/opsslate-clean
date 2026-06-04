import { NextRequest, NextResponse } from "next/server";

const COOKIE_DOMAIN = ".opsslate.app";
const MAX_AGE = 60 * 60 * 24 * 30;
const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?opsslate\.app$/i;

function cookieDomainForRequest(req: NextRequest) {
  const hostname = req.nextUrl.hostname;
  return hostname.endsWith("opsslate.app") ? COOKIE_DOMAIN : undefined;
}

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };

  if (ALLOWED_ORIGIN.test(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(req: NextRequest, body: unknown) {
  return NextResponse.json(body, { headers: corsHeaders(req) });
}

function setSuiteCookie(req: NextRequest, res: NextResponse, name: string, value: string) {
  res.cookies.set(name, value, {
    domain: cookieDomainForRequest(req),
    path: "/",
    maxAge: MAX_AGE,
    secure: true,
    sameSite: "lax",
  });
}

function clearSuiteCookie(req: NextRequest, res: NextResponse, name: string) {
  res.cookies.set(name, "", {
    domain: cookieDomainForRequest(req),
    path: "/",
    maxAge: 0,
    secure: true,
    sameSite: "lax",
  });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("opsslate_token")?.value || req.cookies.get("opsslate_convex_token")?.value;
  const loggedOut = req.cookies.get("opsslate_logged_out")?.value === "1";

  return json(req, {
    ok: true,
    loggedIn: Boolean(token && !loggedOut),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = json(req, { ok: true });

  if (typeof body.sharedToken === "string" && body.sharedToken) {
    setSuiteCookie(req, res, "opsslate_token", body.sharedToken);
  }

  if (typeof body.convexToken === "string" && body.convexToken) {
    setSuiteCookie(req, res, "opsslate_convex_token", body.convexToken);
  }

  clearSuiteCookie(req, res, "opsslate_logged_out");
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = json(req, { ok: true });
  clearSuiteCookie(req, res, "opsslate_token");
  clearSuiteCookie(req, res, "opsslate_convex_token");
  setSuiteCookie(req, res, "opsslate_logged_out", "1");
  return res;
}
