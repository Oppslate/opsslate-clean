import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end: number;
};

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | null;
};

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  // TEST MODE prices
  // Professional ($99/mo or $948/yr)
  "price_1T7RqFRv625dg7hWBkhX6abQ": "pro",
  "price_1T7RqFRv625dg7hWQA2Ok9GC": "pro",
  // Business ($199/mo or $1908/yr)
  "price_1T7RqFRv625dg7hWAsERJ7Nk": "team",
  "price_1T7RqGRv625dg7hWSYnnKGtl": "team",
  // Suite Pro ($249/mo or $2,388/yr)
  "price_1T7RqGRv625dg7hWBcNmcUOP": "suite_pro",
  "price_1T7RyxRv625dg7hWwdvbkybq": "suite_pro",
  // Suite Business ($449/mo or $4,308/yr)
  "price_1T7RqGRv625dg7hWYp5Fi2lC": "suite_biz",
  "price_1T7RyxRv625dg7hWQ2c17eOz": "suite_biz",
};

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!signature || !stripeSecretKey || !webhookSecret || !convexUrl) {
      return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const convex = new ConvexHttpClient(convexUrl);
    const payload = await req.text();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as SubscriptionWithPeriod;
        const priceId = subscription.items.data[0]?.price.id || "";
        const plan = PRICE_TO_PLAN[priceId] || "pro";

        // If companyId was passed in metadata, set the stripe customer
        if (session.metadata?.companyId) {
          try {
            await convex.mutation(api.billing.setStripeCustomer, {
              companyId: session.metadata.companyId as Id<"companies">,
              stripeCustomerId: customerId,
            });
          } catch (e) {
            console.error("Error setting stripe customer:", e);
          }
        }

        // Update subscription in Convex
        await convex.mutation(api.billing.updateSubscription, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan,
          planStatus: "active",
          planExpiresAt: subscription.current_period_end * 1000,
        });

        console.log(`✅ Subscription activated: ${customerId} → ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as SubscriptionWithPeriod;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id || "";
        const plan = PRICE_TO_PLAN[priceId] || "pro";

        await convex.mutation(api.billing.updateSubscription, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          plan,
          planStatus: subscription.status === "active" ? "active" : subscription.status,
          planExpiresAt: subscription.current_period_end * 1000,
        });

        console.log(`🔄 Subscription updated: ${customerId} → ${plan} (${subscription.status})`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await convex.mutation(api.billing.cancelSubscription, {
          stripeCustomerId: customerId,
        });

        console.log(`❌ Subscription canceled: ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as InvoiceWithSubscription;
        const customerId = invoice.customer as string;

        await convex.mutation(api.billing.updateSubscription, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: invoice.subscription as string,
          plan: "pro", // keep plan but mark past_due
          planStatus: "past_due",
        });

        console.log(`⚠️ Payment failed: ${customerId}`);
        break;
      }

      default:
        console.log(`Stripe webhook: ${event.type} (unhandled)`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
