import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { SuiteNav } from "@/components/suite-nav";

function cleanPriceId(value?: string) {
  return value?.replace(/\\n/g, "").trim() || "";
}

const priceIds = {
  pro: cleanPriceId(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) || "price_1T7RqFRv625dg7hWBkhX6abQ",
  team: cleanPriceId(process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM) || "price_1T7RqFRv625dg7hWAsERJ7Nk",
  suitePro: cleanPriceId(process.env.NEXT_PUBLIC_STRIPE_PRICE_SUITE_PRO) || "price_1T7RqGRv625dg7hWBcNmcUOP",
  suiteBusiness: cleanPriceId(process.env.NEXT_PUBLIC_STRIPE_PRICE_SUITE_BUSINESS) || "price_1T7RqGRv625dg7hWYp5Fi2lC",
};

const appPlans = [
  {
    name: "Free",
    price: "$0",
    note: "Try the workflow",
    cta: "Get Started",
    href: "/signup",
    featured: false,
    features: ["3 estimates", "2 users", "Manual entry", "Basic cost database"],
    unavailable: ["AI extraction", "Photo-to-estimate"],
  },
  {
    name: "Professional",
    price: "$99",
    note: "$79/mo billed annually",
    cta: "Start Free Trial",
    priceId: priceIds.pro,
    featured: true,
    features: ["Unlimited estimates", "10 users", "PDF and photo extraction", "Bid comparison", "RFQ management", "Bid-to-budget bridge"],
    unavailable: [],
  },
  {
    name: "Business",
    price: "$199",
    note: "$159/mo billed annually",
    cta: "Start Free Trial",
    priceId: priceIds.team,
    featured: false,
    features: ["Everything in Professional", "Unlimited users", "API access", "Win/loss analytics", "Custom templates", "Priority support"],
    unavailable: [],
  },
];

const bundlePlans = [
  {
    name: "Suite Pro",
    price: "$249",
    description: "Project Management, Estimating, and Scheduler",
    accent: "border-lime-300/35 bg-lime-300/[0.055]",
    features: ["Unified command center", "Cross-app data sync", "Bid-to-project pipeline", "10 users across apps"],
    cta: "Start Free Trial",
    priceId: priceIds.suitePro,
  },
  {
    name: "Suite Business",
    price: "$449",
    description: "For growing teams running multiple active jobs",
    accent: "border-white/10 bg-white/[0.035]",
    features: ["Everything in Suite Pro", "Unlimited users", "API access for all apps", "Advanced cross-app analytics"],
    cta: "Start Free Trial",
    priceId: priceIds.suiteBusiness,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large contractors and GCs",
    accent: "border-white/10 bg-white/[0.035]",
    features: ["SSO / SAML", "SLA support", "Custom integrations", "Quarterly business reviews"],
    cta: "Contact Sales",
    href: "mailto:sales@opsslate.app",
  },
];

const comparisonRows = [
  { capability: "Project command center", core: "Included", precon: "Included", suite: "Included" },
  { capability: "RFIs, submittals, change orders", core: "Included", precon: "Included", suite: "Included" },
  { capability: "Crew scheduling and milestones", core: "Included", precon: "-", suite: "Included" },
  { capability: "PDF takeoff and measurements", core: "-", precon: "Included", suite: "Included" },
  { capability: "Estimating and bid tracking", core: "-", precon: "Included", suite: "Included" },
  { capability: "Awarded bid to job handoff", core: "-", precon: "Included", suite: "Included" },
  { capability: "Books, WIP, payroll, and job cost visibility", core: "-", precon: "-", suite: "Included" },
  { capability: "Best fit", core: "Run active jobs", precon: "Win better work", suite: "Control the company" },
];

function StatusCell({ value }: { value: string }) {
  const included = value === "Included";
  const empty = value === "-";

  if (empty) {
    return <span className="inline-grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-sm font-black text-white/26">-</span>;
  }

  if (included) {
    return (
      <span className="inline-flex items-center rounded-lg border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-lime-200">
        Included
      </span>
    );
  }

  return <span className="text-sm font-semibold leading-6 text-white/78">{value}</span>;
}

export default function PricingPage() {
  const appButtonClass = (featured: boolean) => `mt-auto inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-black transition ${
    featured ? "bg-orange-600 text-white hover:bg-orange-500" : "border border-white/12 text-white/86 hover:border-orange-300/35 hover:bg-white/[0.045]"
  }`;

  return (
    <div className="min-h-screen overflow-hidden bg-[#050607] text-white">
      <SuiteNav />
      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(115deg,rgba(251,146,60,0.20),transparent_30%),linear-gradient(245deg,rgba(163,230,53,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_52%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />

        <section className="relative mx-auto max-w-7xl px-6 pb-12 pt-16 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200">Pricing</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
            Pricing that scales with your crew.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/64">
            Start with the bundle that matches how you work today. Add apps as your operation grows, then connect the whole company when you are ready.
          </p>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-200">Estimating</p>
            <h2 className="mt-2 text-3xl font-black">Estimating plans for faster bids.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {appPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex min-h-[360px] flex-col rounded-xl border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
                  plan.featured ? "border-orange-300/45 bg-orange-500/[0.10]" : "border-white/10 bg-[#0b1118]/92"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-5 rounded-md bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-black">{plan.name}</h3>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className="pb-2 text-sm font-semibold text-white/50">/mo</span>
                </div>
                <p className="mt-1 text-xs font-black text-lime-200">{plan.note}</p>
                <div className="mt-6 grid gap-3 text-sm text-white/72">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2"><span className="text-lime-200">Y</span>{feature}</p>
                  ))}
                  {plan.unavailable.map((feature) => (
                    <p key={feature} className="flex items-center gap-2 text-white/32"><span>x</span>{feature}</p>
                  ))}
                </div>
                {plan.priceId ? (
                  <CheckoutButton priceId={plan.priceId} className={appButtonClass(plan.featured)}>
                    {plan.cta} <span className="ml-2">-&gt;</span>
                  </CheckoutButton>
                ) : (
                  <Link href={plan.href ?? "/signup"} className={appButtonClass(plan.featured)}>
                    {plan.cta} <span className="ml-2">-&gt;</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">OpsSlate Suite</p>
            <h2 className="mx-auto mt-2 max-w-3xl text-4xl font-black">Bundle the field, bid room, schedule, and back office.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {bundlePlans.map((plan) => (
              <div key={plan.name} className={`flex min-h-[340px] flex-col rounded-xl border p-5 ${plan.accent}`}>
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="mt-1 min-h-10 text-sm leading-6 text-white/50">{plan.description}</p>
                <p className="mt-5 text-4xl font-black">{plan.price}</p>
                <div className="mt-6 grid gap-3 text-sm text-white/72">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2"><span className="text-orange-200">OS</span>{feature}</p>
                  ))}
                </div>
                {plan.priceId ? (
                  <CheckoutButton priceId={plan.priceId} className="mt-auto inline-flex h-11 w-full items-center justify-center rounded-md border border-white/12 text-sm font-black text-white/86 transition hover:border-orange-300/35 hover:bg-white/[0.045]">
                    {plan.cta}
                  </CheckoutButton>
                ) : (
                  <Link href={plan.href ?? "/signup"} className="mt-auto inline-flex h-11 items-center justify-center rounded-md border border-white/12 text-sm font-black text-white/86 transition hover:border-orange-300/35 hover:bg-white/[0.045]">
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-200">Comparison</p>
            <h2 className="mt-2 text-3xl font-black">Choose the package by workflow, not guesswork.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">Ops Core runs active jobs. Precon Pack wins the next job. Full Suite connects the whole company.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0f0d]/94 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[1.25fr_repeat(3,0.9fr)] border-b border-white/10 bg-white/[0.04] text-sm font-black">
                <div className="p-4 text-white/50">Capability</div>
                <div className="border-l border-white/10 p-4 text-orange-200">Ops Core</div>
                <div className="border-l border-white/10 p-4 text-fuchsia-200">Precon Pack</div>
                <div className="border-l border-white/10 p-4 text-lime-200">Full Suite</div>
              </div>
              {comparisonRows.map((row) => (
                <div key={row.capability} className="grid grid-cols-[1.25fr_repeat(3,0.9fr)] border-b border-white/8 last:border-b-0">
                  <div className="p-4 text-sm font-semibold text-white/76">{row.capability}</div>
                  <div className="border-l border-white/8 p-4"><StatusCell value={row.core} /></div>
                  <div className="border-l border-white/8 p-4"><StatusCell value={row.precon} /></div>
                  <div className="border-l border-white/8 p-4"><StatusCell value={row.suite} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
