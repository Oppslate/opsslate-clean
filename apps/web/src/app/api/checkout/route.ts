import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const { priceId: rawPriceId, email, companyId } = (await req.json()) as {
      priceId?: string;
      email?: string;
      companyId?: string;
    };
    const priceId = rawPriceId?.replace(/\\n/g, "").trim();

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("payment_method_types[]", "card");
    if (email) params.append("customer_email", email);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("subscription_data[trial_period_days]", "14");
    params.append("success_url", `${origin}/settings?success=true`);
    params.append("cancel_url", `${origin}/settings?canceled=true`);
    if (companyId) params.append("metadata[companyId]", companyId);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Stripe API error:", JSON.stringify(data));
      return NextResponse.json({ error: data.error?.message || "Stripe error" }, { status: res.status });
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", message);
    return NextResponse.json({ error: `Checkout failed: ${message}` }, { status: 500 });
  }
}
