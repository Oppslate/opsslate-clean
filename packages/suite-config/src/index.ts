export type SuiteAppKey = "projectManagement" | "estimating" | "scheduler" | "books" | "takeoff" | "cad" | "crm";

export type SuiteApp = {
  key: SuiteAppKey;
  name: string;
  shortName: string;
  icon: string;
  lane: string;
  href: string;
  appHref: string;
  localHref: string;
  domain: string;
  status: "ready" | "local" | "next";
  summary: string;
  capabilities: string[];
  handoff: string;
};

export const suiteApps: SuiteApp[] = [
  {
    key: "projectManagement",
    name: "Project Management",
    shortName: "PM",
    icon: "OS",
    lane: "Operations",
    href: "/project-management",
    appHref: "/",
    localHref: "/",
    domain: "www.opsslate.app",
    status: "ready",
    summary: "The command center for active jobs, RFIs, submittals, change orders, safety, documents, reports, and AI oversight.",
    capabilities: ["Job dashboard", "RFIs + submittals", "Change orders", "AI Director"],
    handoff: "Receives awarded scope, budget, schedule targets, and document history.",
  },
  {
    key: "estimating",
    name: "Estimating",
    shortName: "Bid",
    icon: "$",
    lane: "Preconstruction",
    href: "/estimating",
    appHref: process.env.NEXT_PUBLIC_ESTIMATING_APP_URL || "https://estimating.opsslate.app",
    localHref: "/estimating",
    domain: "estimating.opsslate.app",
    status: "ready",
    summary: "Bid intake, AI extraction, scope comparison, RFQs, cost history, and bid-to-budget handoff.",
    capabilities: ["Bid tracker", "AI extraction", "RFQs", "Cost history"],
    handoff: "Sends bid totals, scope notes, alternates, and buyout assumptions into the job record.",
  },
  {
    key: "scheduler",
    name: "Scheduler",
    shortName: "Plan",
    icon: "Cal",
    lane: "Field Planning",
    href: "/scheduler",
    appHref: process.env.NEXT_PUBLIC_SCHEDULER_APP_URL || "https://scheduler.opsslate.app",
    localHref: "/scheduler-app",
    domain: "scheduler.opsslate.app",
    status: "ready",
    summary: "Crew planning, milestones, dependency management, Gantt views, schedule risk, and field coordination.",
    capabilities: ["Gantt planning", "Crew schedule", "Milestones", "Delay risk"],
    handoff: "Shares milestones, lookaheads, delay signals, and field commitments with project operations.",
  },
  {
    key: "books",
    name: "Books",
    shortName: "Books",
    icon: "AR",
    lane: "Financial Control",
    href: "/books",
    appHref: process.env.NEXT_PUBLIC_BOOKS_APP_URL || "https://books.opsslate.app",
    localHref: "/books",
    domain: "books.opsslate.app",
    status: "next",
    summary: "Construction accounting, progress billing, job costing, payroll, WIP reporting, payables, and bonding readiness.",
    capabilities: ["Progress billing", "Job costing", "Payroll", "WIP reports"],
    handoff: "Should receive approved budgets, cost codes, committed costs, billing milestones, and payroll data.",
  },
  {
    key: "takeoff",
    name: "Takeoff",
    shortName: "Qty",
    icon: "QTO",
    lane: "Quantity Workflow",
    href: "/takeoff",
    appHref: process.env.NEXT_PUBLIC_TAKEOFF_APP_URL || "https://takeoff.opsslate.app",
    localHref: "/takeoff",
    domain: "takeoff.opsslate.app",
    status: "ready",
    summary: "PDF/image takeoff workspace for plan review, quantity extraction, estimate handoff, markups, and measurement tools.",
    capabilities: ["PDF takeoff", "Measurements", "Quantity review", "Estimate handoff"],
    handoff: "Feeds measured quantities, plan references, markups, and scope breakdowns into estimating.",
  },
  {
    key: "cad",
    name: "CAD",
    shortName: "CAD",
    icon: "CAD",
    lane: "Design + Drafting",
    href: "/cad",
    appHref: process.env.NEXT_PUBLIC_CAD_APP_URL || "/cad",
    localHref: "/cad",
    domain: "cad.opsslate.app",
    status: "next",
    summary: "A construction CAD workspace for plan review, detail markups, revisions, sheet coordination, and field-ready drawing intelligence.",
    capabilities: ["Plan markup", "Revision tracking", "Detail library", "Field sheets"],
    handoff: "Should feed drawing context, sheets, details, and revisions into takeoff, estimating, and project execution.",
  },
  {
    key: "crm",
    name: "CRM",
    shortName: "CRM",
    icon: "CRM",
    lane: "Sales Pipeline",
    href: "/crm",
    appHref: process.env.NEXT_PUBLIC_CRM_APP_URL || "/crm",
    localHref: "/crm",
    domain: "crm.opsslate.app",
    status: "next",
    summary: "A contractor CRM for leads, bid invites, customer history, follow-ups, pipeline health, and opportunity handoff into estimating.",
    capabilities: ["Lead tracking", "Bid invites", "Follow-ups", "Customer history"],
    handoff: "Should move qualified opportunities, customer context, and bid deadlines into Estimating.",
  },
];

export function recommendedPrimaryApps() {
  return suiteApps.filter((app) => app.status === "ready");
}

export type SuiteBundle = {
  name: string;
  tagline: string;
  appKeys: SuiteAppKey[];
  bestFor: string;
};

export const suiteBundles: SuiteBundle[] = [
  {
    name: "Ops Core",
    tagline: "Run active work without losing the paper trail.",
    appKeys: ["projectManagement", "scheduler"],
    bestFor: "Builders who mainly need job execution, field planning, RFIs, submittals, change orders, and daily control.",
  },
  {
    name: "Precon Pack",
    tagline: "Move from plans to proposal to project baseline.",
    appKeys: ["crm", "cad", "takeoff", "estimating", "projectManagement"],
    bestFor: "Teams that win work from drawings and need quantity, bid, and awarded-scope handoff in one flow.",
  },
  {
    name: "Full Suite",
    tagline: "Connect sales, drawings, bid, build, schedule, and money.",
    appKeys: ["crm", "cad", "takeoff", "estimating", "projectManagement", "scheduler", "books"],
    bestFor: "Contractors who want one operating layer from first lead through WIP, billing, payroll, and closeout.",
  },
];

export function getSuiteAppsByKeys(keys: SuiteAppKey[]) {
  return keys.map((key) => suiteApps.find((app) => app.key === key)).filter((app): app is SuiteApp => Boolean(app));
}
