"use client";

import Link from "next/link";
import { SuiteNav } from "@/components/suite-nav";
import { SuiteApp, suiteApps } from "@/lib/suite-apps";

const pageCopy: Record<string, { headline: string; eyebrow: string; promise: string; outcomes: string[] }> = {
  projectManagement: {
    eyebrow: "OpsSlate Project Management",
    headline: "Run the job like every detail is already under control.",
    promise: "A construction command center for RFIs, submittals, change orders, documents, safety, daily logs, budget signals, and AI-assisted project oversight.",
    outcomes: [
      "See job health without digging through ten screens.",
      "Keep RFIs, submittals, COs, documents, and field notes tied to the same project story.",
      "Give PMs a cleaner way to spot risk before it turns into margin loss.",
    ],
  },
  scheduler: {
    eyebrow: "OpsSlate Scheduler",
    headline: "Turn the project plan into field momentum.",
    promise: "A focused scheduling workspace for crew planning, milestones, dependencies, lookaheads, delay signals, and field coordination.",
    outcomes: [
      "Give crews a clearer view of what is happening next.",
      "Connect milestones and dependencies to the work the team is already tracking.",
      "Catch schedule pressure earlier, before it becomes a surprise.",
    ],
  },
  estimating: {
    eyebrow: "OpsSlate Estimating",
    headline: "Build sharper bids from the work you actually understand.",
    promise: "Bid intake, scope comparison, AI extraction, RFQs, cost history, and bid-to-budget handoff for construction teams.",
    outcomes: [
      "Move faster from opportunity to proposal.",
      "Keep bid assumptions visible after award.",
      "Create a cleaner handoff into project operations.",
    ],
  },
  books: {
    eyebrow: "OpsSlate Books",
    headline: "Know where the money is going before the month closes.",
    promise: "Construction accounting, job costing, progress billing, payroll, WIP reporting, payables, and bonding-ready visibility.",
    outcomes: [
      "Keep project money tied to project reality.",
      "Make WIP, billing, payroll, and job cost easier to trust.",
      "Give leadership cleaner margin visibility.",
    ],
  },
  takeoff: {
    eyebrow: "OpsSlate Takeoff",
    headline: "Measure the work, keep the context, win the bid.",
    promise: "A plan takeoff workspace for PDF review, measurements, markups, quantity extraction, and estimating handoff.",
    outcomes: [
      "Capture quantities without losing plan context.",
      "Move measured scope into estimating more cleanly.",
      "Keep markups and assumptions connected to the bid.",
    ],
  },
  cad: {
    eyebrow: "OpsSlate CAD",
    headline: "Turn drawings into an operating layer, not just files.",
    promise: "A construction CAD workspace for plan review, detail markups, revision tracking, sheet coordination, and field-ready drawing intelligence.",
    outcomes: [
      "Keep revisions, sheets, and field markups tied to the project record.",
      "Give estimators cleaner drawing context before quantities move downstream.",
      "Help field teams work from the current plan set with less version confusion.",
    ],
  },
  crm: {
    eyebrow: "OpsSlate CRM",
    headline: "Own the relationship before it becomes a bid.",
    promise: "A contractor CRM for leads, bid invites, customer history, follow-ups, opportunity scoring, and clean handoff into estimating.",
    outcomes: [
      "Track leads, owners, GCs, bid invites, and follow-ups in one place.",
      "Move qualified opportunities into estimating without losing customer context.",
      "See pipeline health before workload and revenue get thin.",
    ],
  },
};

export function ProductSalesPage({ app }: { app: SuiteApp }) {
  const copy = pageCopy[app.key];
  const isAvailable = app.status === "ready";
  const relatedBundles = app.key === "scheduler"
    ? ["Ops Core", "Full Suite"]
    : app.key === "projectManagement"
      ? ["Ops Core", "Precon Pack", "Full Suite"]
      : app.key === "books"
        ? ["Full Suite"]
      : ["Precon Pack", "Full Suite"];

  return (
    <div className="min-h-screen bg-[#050607] text-white">
      <SuiteNav showActions={isAvailable} />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(115deg,rgba(251,146,60,0.20),transparent_30%),linear-gradient(240deg,rgba(217,70,239,0.15),transparent_34%),linear-gradient(180deg,rgba(163,230,53,0.10),transparent_55%)]" />
        <section className="relative mx-auto max-w-7xl px-6 py-16">
          {isAvailable && (
            <Link href="/#bundles" className="text-sm font-bold text-lime-200 hover:text-lime-100">Back to bundles</Link>
          )}
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">{copy.headline}</h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/68">{copy.promise}</p>
              {isAvailable && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href={app.appHref} className="inline-flex h-11 items-center rounded-md bg-lime-300 px-5 text-sm font-black text-slate-950 hover:bg-lime-200">
                    Open {app.name}
                  </a>
                  <Link href="/#comparison" className="inline-flex h-11 items-center rounded-md border border-white/14 px-5 text-sm font-bold text-white/82 hover:border-orange-300/40 hover:bg-white/5">
                    Compare bundles
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0d0f0d]/92 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.44)]">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">{app.lane}</p>
                  <h2 className="mt-1 text-2xl font-black">{app.name}</h2>
                </div>
                <span className="grid h-12 min-w-12 place-items-center rounded-md bg-orange-300/10 px-2 text-sm font-black text-orange-100 ring-1 ring-orange-300/18">
                  {app.icon}
                </span>
              </div>
              {!isAvailable && (
                <div className="mb-4 rounded-md border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-fuchsia-100">
                  Feature preview - dashboard coming soon
                </div>
              )}
              <div className="grid gap-3">
                {copy.outcomes.map((outcome) => (
                  <div key={outcome} className="rounded-md border border-white/8 bg-white/[0.035] p-3 text-sm leading-6 text-white/68">
                    {outcome}
                  </div>
                ))}
              </div>
              {isAvailable && (
                <div className="mt-6">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-200">Included in</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {relatedBundles.map((bundle) => (
                      <span key={bundle} className="rounded-md border border-lime-300/18 bg-lime-300/8 px-3 py-1.5 text-xs font-bold text-lime-100">
                        {bundle}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 pb-16">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {app.capabilities.map((capability) => (
              <div key={capability} className="rounded-lg border border-white/10 bg-[#0d0f0d]/92 p-4">
                <p className="text-sm font-black text-orange-200">{capability}</p>
                <p className="mt-2 text-sm leading-6 text-white/52">{app.summary}</p>
              </div>
            ))}
          </div>
        </section>

        {isAvailable && (
          <section className="relative mx-auto max-w-7xl px-6 pb-16">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
              <h2 className="text-2xl font-black">See where {app.name} fits</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {suiteApps.map((item) => {
                  const destination = item.status === "ready" ? item.appHref : item.href;
                  const linkClass = `rounded-md border px-3 py-2 text-sm font-bold transition ${
                    item.key === app.key
                      ? "border-lime-300/30 bg-lime-300/12 text-lime-100"
                      : "border-white/10 bg-white/[0.03] text-white/62 hover:text-white"
                  }`;
                  return destination.startsWith("http") ? (
                    <a key={item.key} href={destination} className={linkClass}>
                      {item.name}
                    </a>
                  ) : (
                    <Link key={item.key} href={destination} className={linkClass}>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
