import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const { customerId } = (await req.json()) as { customerId?: string };

    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Billing portal error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
