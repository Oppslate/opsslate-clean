import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY || "MISSING";
  return NextResponse.json({ 
    keyPrefix: key.substring(0, 20) + "...",
    keyLength: key.length,
  });
}
