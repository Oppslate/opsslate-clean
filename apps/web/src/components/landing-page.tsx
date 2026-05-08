"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SuiteNav } from "@/components/suite-nav";
import { getSuiteAppsByKeys, suiteApps, suiteBundles } from "@/lib/suite-apps";

const bundleHighlights: Record<string, { accent: string; badge: string; payoff: string; proof: string[] }> = {
  "Ops Core": {
    accent: "from-orange-400 to-lime-300",
    badge: "Best starting point",
    payoff: "Stop running jobs from scattered texts, spreadsheets, and memory.",
    proof: ["Project command center", "Crew and schedule coordination", "RFIs, submittals, COs", "Daily field control"],
  },
  "Precon Pack": {
    accent: "from-fuchsia-400 to-orange-300",
    badge: "Bid faster",
    payoff: "Turn plans into quantities, estimates, and awarded job scope without the handoff mess.",
    proof: ["PDF takeoff workflow", "Bid building", "Scope comparison", "Award-to-job handoff"],
  },
  "Full Suite": {
    accent: "from-lime-300 to-emerald-300",
    badge: "Most powerful",
    payoff: "Connect bid, build, schedule, billing, WIP, payroll, and closeout in one operating layer.",
    proof: ["Every OpsSlate product", "Financial control", "Connected job history", "Executive visibility"],
  },
};

const comparisonRows = [
  { feature: "Project command center", core: true, precon: true, full: true },
  { feature: "RFIs, submittals, documents", core: true, precon: true, full: true },
  { feature: "Crew scheduling and milestones", core: true, precon: false, full: true },
  { feature: "CRM pipeline and bid invites", core: false, precon: true, full: true },
  { feature: "CAD review and revision context", core: false, precon: true, full: true },
  { feature: "PDF takeoff and measurements", core: false, precon: true, full: true },
  { feature: "Estimating and bid tracking", core: false, precon: true, full: true },
  { feature: "Awarded bid to job handoff", core: false, precon: true, full: true },
  { feature: "Progress billing and job costing", core: false, precon: false, full: true },
  { feature: "WIP, payroll, and finance visibility", core: false, precon: false, full: true },
  { feature: "Best fit", core: "Run active jobs", precon: "Win better work", full: "Control the company" },
];

const workflow = [
  { step: "01", title: "Bid with confidence", text: "Measure, estimate, compare scope, and keep the assumptions that win the work." },
  { step: "02", title: "Launch clean", text: "Move awarded scope into the live job with fewer missed details and less re-entry." },
  { step: "03", title: "Run the field", text: "Coordinate schedule, crew, documents, safety, RFIs, submittals, and daily decisions." },
  { step: "04", title: "Know the money", text: "Keep billing, WIP, payroll, job cost, and margin connected to what is happening onsite." },
];

const impactStats = [
  { label: "Construction apps", value: "7" },
  { label: "Bundle paths", value: "3" },
  { label: "Workflow", value: "Bid -> Closeout" },
];

function isExternalHref(href: string) {
  return href.startsWith("http");
}

function ProductLink({ href, children, className, id }: { href: string; children: ReactNode; className: string; id?: string }) {
  if (isExternalHref(href)) {
    return <a id={id} href={href} className={className}>{children}</a>;
  }

  return <Link id={id} href={href} className={className}>{children}</Link>;
}

function CheckMark({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-semibold text-white/76">{value}</span>;
  }

  return (
    <span className={`inline-grid h-7 w-7 place-items-center rounded-md border text-sm font-black ${
      value
        ? "border-lime-300/30 bg-lime-300/12 text-lime-200"
        : "border-white/8 bg-white/[0.025] text-white/22"
    }`}>
      {value ? "Y" : "-"}
    </span>
  );
}

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#050607] text-white">
      <SuiteNav />

      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(115deg,rgba(251,146,60,0.18),transparent_28%),linear-gradient(245deg,rgba(217,70,239,0.16),transparent_30%),linear-gradient(180deg,rgba(163,230,53,0.10),transparent_48%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent_74%)]" />

        <section className="relative mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-200">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_16px_rgba(190,242,100,0.9)]" />
                Built for contractors who move fast
              </div>
              <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
                Pick the OpsSlate bundle that makes your company feel unfairly organized.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">
                OpsSlate brings CRM, CAD, preconstruction, project management, scheduling, takeoff, and construction accounting into one sharp operating system. Start with the bundle you need, then expand into the full suite when you are ready to connect everything.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#bundles" className="inline-flex h-11 items-center rounded-md bg-lime-300 px-5 text-sm font-black text-slate-950 hover:bg-lime-200">
                  See the bundles
                </Link>
                <Link href="#comparison" className="inline-flex h-11 items-center rounded-md border border-white/14 px-5 text-sm font-bold text-white/82 hover:border-orange-300/40 hover:bg-white/5">
                  Compare plans
                </Link>
                <Button onClick={onGetStarted} variant="outline" className="h-11 rounded-md border-white/14 bg-transparent px-5 font-bold text-white/82 hover:bg-white/5">
                  Sign in
                </Button>
              </div>
              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {impactStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                    <p className="text-2xl font-black text-orange-200">{stat.value}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/42">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/12 bg-[#10100d]/88 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.44)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-200">Bundle Selector</p>
                  <p className="mt-1 text-sm text-white/48">Choose the engine for your next stage</p>
                </div>
                <span className="rounded-md border border-fuchsia-300/25 bg-fuchsia-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-200">Suite</span>
              </div>
              <div className="grid gap-3">
                {suiteBundles.map((bundle, index) => {
                  const highlight = bundleHighlights[bundle.name];
                  return (
                    <Link key={bundle.name} href="#bundles" className="group rounded-lg border border-white/10 bg-[#080a09]/82 p-4 transition hover:-translate-y-0.5 hover:border-orange-300/35">
                      <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${highlight.accent}`} />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">0{index + 1}</p>
                          <h3 className="mt-1 text-lg font-black">{bundle.name}</h3>
                        </div>
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">{highlight.badge}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/58">{highlight.payoff}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="bundles" className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-3xl font-black">Bundles That Match How Contractors Actually Buy Software</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">No bloated all-or-nothing package. Choose the part of the operation that hurts most, then grow into the full suite.</p>
            </div>
            <Link href="#comparison" className="text-sm font-black text-lime-200 hover:text-lime-100">Jump to comparison -&gt;</Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {suiteBundles.map((bundle) => {
              const apps = getSuiteAppsByKeys(bundle.appKeys);
              const highlight = bundleHighlights[bundle.name];
              return (
                <div key={bundle.name} className="flex min-h-[390px] flex-col rounded-xl border border-white/10 bg-[#0d0f0d]/94 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className={`mb-5 h-2 rounded-full bg-gradient-to-r ${highlight.accent}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">{highlight.badge}</p>
                      <h3 className="mt-2 text-2xl font-black">{bundle.name}</h3>
                    </div>
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-white/58">{apps.length} apps</span>
                  </div>
                  <p className="mt-4 text-base font-semibold leading-7 text-white/82">{bundle.tagline}</p>
                  <p className="mt-3 text-sm leading-6 text-white/56">{bundle.bestFor}</p>
                  <div className="mt-5 grid gap-2">
                    {highlight.proof.map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.035] px-3 py-2 text-sm text-white/68">
                        <span className="h-2 w-2 rounded-full bg-lime-300" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto pt-6">
                    <div className="flex flex-wrap gap-2">
                      {apps.map((app) => (
                        <span key={app.key} className="rounded-md border border-white/10 bg-white/[0.045] px-2 py-1 text-xs font-bold text-white/70">
                          {app.shortName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="comparison" className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="text-3xl font-black">Bundle Comparison</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">A simple way to see which package belongs in your company right now.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0f0d]/94 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
            <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.25fr_repeat(3,0.9fr)] border-b border-white/10 bg-white/[0.04] text-sm font-black">
              <div className="p-4 text-white/50">Capability</div>
              <div className="border-l border-white/10 p-4 text-orange-200">Ops Core</div>
              <div className="border-l border-white/10 p-4 text-fuchsia-200">Precon Pack</div>
              <div className="border-l border-white/10 p-4 text-lime-200">Full Suite</div>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.feature} className="grid grid-cols-[1.25fr_repeat(3,0.9fr)] border-b border-white/8 last:border-b-0">
                <div className="p-4 text-sm font-semibold text-white/76">{row.feature}</div>
                <div className="border-l border-white/8 p-4"><CheckMark value={row.core} /></div>
                <div className="border-l border-white/8 p-4"><CheckMark value={row.precon} /></div>
                <div className="border-l border-white/8 p-4"><CheckMark value={row.full} /></div>
              </div>
            ))}
            </div>
          </div>
        </section>

        <section id="suite-map" className="relative mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6">
            <h2 className="text-3xl font-black">The Apps Behind The Bundles</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/56">Each product can stand on its own. Together, they create one connected construction operating system.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {suiteApps.map((app) => (
              <ProductLink
                id={app.key === "books" ? "books" : app.key === "takeoff" ? "takeoff" : undefined}
                key={app.key}
                href={app.href}
                className="group flex min-h-[340px] flex-col rounded-lg border border-white/10 bg-[#0d0f0d]/92 p-5 transition hover:-translate-y-0.5 hover:border-orange-300/38 hover:bg-[#131611]"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <span className="grid h-12 min-w-12 place-items-center rounded-md bg-orange-300/10 px-2 text-sm font-black text-orange-100 ring-1 ring-orange-300/18">
                    {app.icon}
                  </span>
                  <span className="rounded-full border border-lime-300/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-lime-200">
                    Included
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">{app.lane}</p>
                <h3 className="mt-2 text-xl font-black">{app.name}</h3>
                <p className="mt-3 text-sm leading-6 text-white/56">{app.summary}</p>
                <div className="mt-auto pt-6">
                  <p className="text-xs leading-5 text-white/44">{app.handoff}</p>
                  <p className="mt-5 text-sm font-black text-orange-200 group-hover:text-orange-100">
                    Explore app -&gt;
                  </p>
                </div>
              </ProductLink>
            ))}
          </div>
        </section>

        <section className="relative mx-auto grid max-w-7xl gap-4 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-xl border border-white/10 bg-[#0d0f0d]/92 p-6">
            <h2 className="text-2xl font-black">How The Suite Flows</h2>
            <div className="mt-6 space-y-4">
              {workflow.map((item) => (
                <div key={item.step} className="flex gap-4">
                  <span className="grid h-9 min-w-9 place-items-center rounded-md bg-fuchsia-300/12 text-sm font-black text-fuchsia-200">{item.step}</span>
                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/54">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d0f0d]/92 p-6">
            <h2 className="text-2xl font-black">What Makes It Feel Different</h2>
            <div className="mt-6 grid gap-3">
              {[
                "It is built around construction handoffs, not generic task lists.",
                "The bundles match how contractors grow: field control first, precon next, full company visibility when ready.",
                "Every product has a job to do, but the suite keeps the project story connected.",
                "The result feels less like software overhead and more like command over the work.",
              ].map((item) => (
                <div key={item} className="rounded-md border border-white/8 bg-white/[0.035] p-3 text-sm leading-6 text-white/64">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
