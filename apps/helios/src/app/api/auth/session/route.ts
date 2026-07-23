import {
  createHeliosSessionToken,
  verifyOpsSlateAccessToken,
} from "@opsslate/suite-auth/server";
import {
  HELIOS_SESSION_MAX_AGE_SECONDS,
} from "@opsslate/suite-auth/types";
import { type NextRequest, NextResponse } from "next/server";

import { resolveHeliosPrincipal } from "@/lib/helios-identity";
import {
  getHeliosSessionSecret,
  HELIOS_SESSION_COOKIE,
  readHeliosPrincipal,
} from "@/lib/helios-session";

const SHARED_OPSSLATE_COOKIE = "opsslate_token";

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || (fetchSite && fetchSite !== "same-origin")) return false;

  try {
    const originUrl = new URL(origin);
    const forwardedHost =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProtocol =
      request.headers.get("x-forwarded-proto") ||
      request.nextUrl.protocol.replace(":", "");
    return (
      Boolean(forwardedHost) &&
      originUrl.host === forwardedHost &&
      originUrl.protocol === `${forwardedProtocol}:`
    );
  } catch {
    return false;
  }
}

function safeReturnPath(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("returnTo") || "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function redirectWithState(request: NextRequest, state: string) {
  const destination = new URL("/", request.url);
  destination.searchParams.set("auth", state);
  return NextResponse.redirect(destination, 303);
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(HELIOS_SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: HELIOS_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearSessionCookies(response: NextResponse) {
  for (const name of ["helios_session", "__Host-helios_session"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: name.startsWith("__Host-"),
    });
  }
}

export async function GET() {
  const principal = await readHeliosPrincipal();
  if (!principal) return noStoreJson({ authenticated: false }, 401);

  return noStoreJson(
    {
      authenticated: true,
      user: {
        email: principal.email,
        name: principal.name,
        role: principal.role,
      },
    },
    200,
  );
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return noStoreJson({ error: "Forbidden." }, 403);

  const sharedToken = request.cookies.get(SHARED_OPSSLATE_COOKIE)?.value;
  if (!sharedToken) return redirectWithState(request, "missing");

  try {
    const issuerUrl = process.env.OPSSLATE_AUTH_URL || "";
    const identity = await verifyOpsSlateAccessToken(sharedToken, { issuerUrl });
    if (!identity) return redirectWithState(request, "invalid");

    const principal = await resolveHeliosPrincipal(identity);
    const token = createHeliosSessionToken(
      principal,
      getHeliosSessionSecret(),
    );
    const response = NextResponse.redirect(
      new URL(safeReturnPath(request), request.url),
      303,
    );
    setSessionCookie(response, token);
    return response;
  } catch {
    return redirectWithState(request, "unavailable");
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return noStoreJson({ error: "Forbidden." }, 403);

  const response = noStoreJson({ ok: true }, 200);
  clearSessionCookies(response);
  return response;
}
