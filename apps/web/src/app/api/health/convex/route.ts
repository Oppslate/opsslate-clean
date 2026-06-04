import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "";
  const deployment = process.env.CONVEX_DEPLOYMENT || "";

  if (!convexUrl) {
    return NextResponse.json(
      {
        ok: false,
        convexUrl,
        siteUrl,
        deployment,
        error: "NEXT_PUBLIC_CONVEX_URL is not set.",
      },
      { status: 500 },
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    await client.query(api.auth.lookupAccount, { name: "__opsslate_health_check__" });
    return NextResponse.json({
      ok: true,
      convexUrl,
      siteUrl,
      deployment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        convexUrl,
        siteUrl,
        deployment,
        error: error instanceof Error ? error.message : "Convex health check failed.",
      },
      { status: 500 },
    );
  }
}
