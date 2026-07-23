import type { SuiteNavigationItem } from "@opsslate/suite-ui/shell";

const SUITE_TOOL_ACCESS: Record<string, string[]> = {
  suite_pro: ["Project Management", "Estimating", "Scheduler", "Books"],
  ops_core: ["Project Management", "Scheduler"],
  precon_pack: [
    "Project Management",
    "Helios",
    "Estimating",
    "Takeoff",
  ],
  suite_biz: [
    "Project Management",
    "Helios",
    "Estimating",
    "Scheduler",
    "Books",
    "Takeoff",
  ],
  full_suite: [
    "Project Management",
    "Helios",
    "Estimating",
    "Scheduler",
    "Books",
    "Takeoff",
  ],
  enterprise: [
    "Project Management",
    "Helios",
    "Estimating",
    "Scheduler",
    "Books",
    "Takeoff",
  ],
};

const UNAVAILABLE_SUITE_TOOLS = new Set(["CRM", "CAD"]);
const SUITE_TOOL_LABELS = new Set([
  "Project Management",
  "Helios",
  "Estimating",
  "Scheduler",
  "Books",
  "Takeoff",
  "CAD",
  "CRM",
]);

function normalizeBundle(plan: string) {
  if (plan === "team" || plan === "pro") return "suite_biz";
  return plan;
}

function suiteToolLocked(plan: string, label: string) {
  if (!SUITE_TOOL_LABELS.has(label)) return false;
  if (UNAVAILABLE_SUITE_TOOLS.has(label)) return true;
  const allowed = SUITE_TOOL_ACCESS[normalizeBundle(plan)];
  return Boolean(allowed && !allowed.includes(label));
}

const navigation: SuiteNavigationItem[] = [
  { type: "section", label: "Command Center" },
  { type: "link", href: "/", label: "Dashboard", icon: "D" },
  { type: "link", href: "/calendar", label: "Calendar", icon: "C" },
  { type: "link", href: "/reports", label: "Reports", icon: "R" },

  { type: "section", label: "AI Tools" },
  { type: "link", href: "/autopilot", label: "AI Autopilot", icon: "AI" },
  { type: "link", href: "/ai-pm", label: "AI PM Team", icon: "PM" },
  { type: "link", href: "/delay-engine", label: "Delay Engine", icon: "DE" },
  { type: "link", href: "/voice", label: "Voice Command", icon: "V" },
  { type: "link", href: "/photo-punch", label: "Photo Punch", icon: "P" },

  { type: "section", label: "Field Ops" },
  { type: "link", href: "/daily-logs", label: "Daily Logs", icon: "DL" },
  { type: "link", href: "/crew", label: "Crew", icon: "CR" },
  {
    type: "link",
    href: "/time-tracking",
    label: "Time Tracking",
    icon: "T",
  },
  { type: "link", href: "/safety", label: "Safety", icon: "S" },
  { type: "link", href: "/site-media", label: "Site Media", icon: "M" },
  { type: "link", href: "/weather", label: "Weather", icon: "W" },
  { type: "link", href: "/punch-list", label: "Punch List", icon: "PL" },

  { type: "section", label: "Project Controls" },
  {
    type: "link",
    href: "/legal",
    label: "Legal & Compliance",
    icon: "L",
  },
  { type: "link", href: "/rfis", label: "RFIs", icon: "?" },
  { type: "link", href: "/submittals", label: "Submittals", icon: "S" },
  {
    type: "link",
    href: "/change-orders",
    label: "Change Orders",
    icon: "CO",
  },
  { type: "link", href: "/ops-sign", label: "Ops Sign", icon: "OS" },
  {
    type: "link",
    href: "/emails",
    label: "Email Repository",
    icon: "E",
  },
  { type: "link", href: "/documents", label: "Documents", icon: "D" },

  { type: "section", label: "Financials" },
  { type: "link", href: "/budget", label: "Budget", icon: "$" },
  { type: "link", href: "/bid-tracker", label: "Bid Tracker", icon: "B" },
  {
    type: "link",
    href: "/insurance",
    label: "Insurance Reqs",
    icon: "I",
  },

  { type: "section", label: "Logistics" },
  { type: "link", href: "/udig", label: "U-Dig Locates", icon: "U" },
  {
    type: "link",
    href: "/subcontractors",
    label: "Subcontractors",
    icon: "SC",
  },
  { type: "link", href: "/vendors", label: "Vendors", icon: "V" },
  { type: "link", href: "/buyout", label: "Buyout", icon: "BO" },
  { type: "link", href: "/rentals", label: "Rentals", icon: "R" },
  { type: "link", href: "/equipment", label: "Equipment", icon: "EQ" },
  { type: "link", href: "/deliveries", label: "Deliveries", icon: "D" },
  { type: "link", href: "/concrete", label: "Concrete", icon: "C" },

  { type: "section", label: "Suite Tools" },
  { type: "link", href: "/crm", label: "CRM", icon: "CRM" },
  { type: "link", href: "/cad", label: "CAD", icon: "CAD" },
  {
    type: "link",
    href:
      process.env.NEXT_PUBLIC_TAKEOFF_APP_URL ||
      "https://takeoff.opsslate.app",
    label: "Takeoff",
    icon: "Q",
    external: true,
  },
  {
    type: "link",
    href:
      process.env.NEXT_PUBLIC_HELIOS_APP_URL ||
      "https://helios.opsslate.app",
    label: "Helios",
    icon: "AI",
    external: true,
  },
  {
    type: "link",
    href:
      process.env.NEXT_PUBLIC_ESTIMATING_APP_URL ||
      "https://opsslate-clean-web-seven.vercel.app/estimating",
    label: "Estimating",
    icon: "B",
    external: true,
  },
  {
    type: "link",
    href:
      process.env.NEXT_PUBLIC_SCHEDULER_APP_URL ||
      "https://opsslate-clean-web-seven.vercel.app/scheduler",
    label: "Scheduler",
    icon: "S",
    external: true,
  },
  {
    type: "link",
    href:
      process.env.NEXT_PUBLIC_BOOKS_APP_URL || "https://books.opsslate.app",
    label: "Books",
    icon: "AR",
    external: true,
  },

  { type: "section", label: "System" },
  { type: "link", href: "/team", label: "Team", icon: "T" },
  { type: "link", href: "/risk", label: "Risk Register", icon: "R" },
  { type: "link", href: "/help", label: "Help", icon: "H" },
  { type: "link", href: "/branding", label: "Branding", icon: "B" },
  { type: "link", href: "/settings", label: "Settings", icon: "S" },
];

export function getOpsSlateNavigation(plan: string): SuiteNavigationItem[] {
  return navigation.map((item) => {
    if (item.type === "section") return item;
    const disabled = suiteToolLocked(plan, item.label);
    if (!disabled) return item;

    return {
      ...item,
      disabled: true,
      disabledLabel: UNAVAILABLE_SUITE_TOOLS.has(item.label)
        ? "Soon"
        : "Locked",
      disabledReason: UNAVAILABLE_SUITE_TOOLS.has(item.label)
        ? "This OpsSlate app is not available yet."
        : "This app is not included in the current bundle.",
    };
  });
}
