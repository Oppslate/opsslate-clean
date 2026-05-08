import { NextRequest, NextResponse } from "next/server";

const COOKIE_DOMAIN = ".opsslate.app";
const MAX_AGE = 60 * 60 * 24 * 30;

function setSuiteCookie(res: NextResponse, name: string, value: string) {
  res.cookies.set(name, value, {
    domain: COOKIE_DOMAIN,
    path: "/",
    maxAge: MAX_AGE,
    secure: true,
    sameSite: "lax",
  });
}

function clearSuiteCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", {
    domain: COOKIE_DOMAIN,
    path: "/",
    maxAge: 0,
    secure: true,
    sameSite: "lax",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });

  if (typeof body.sharedToken === "string" && body.sharedToken) {
    setSuiteCookie(res, "opsslate_token", body.sharedToken);
  }

  if (typeof body.convexToken === "string" && body.convexToken) {
    setSuiteCookie(res, "opsslate_convex_token", body.convexToken);
  }

  clearSuiteCookie(res, "opsslate_logged_out");
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSuiteCookie(res, "opsslate_token");
  clearSuiteCookie(res, "opsslate_convex_token");
  setSuiteCookie(res, "opsslate_logged_out", "1");
  return res;
}
