"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/upgrade-gate";
import { useState } from "react";
import { useBilling } from "@/lib/use-billing";

type NavItem = { href: string; label: string; icon: string; external?: boolean } | { section: string };

const SUITE_TOOL_ACCESS: Record<string, string[]> = {
  suite_pro: ["Project Management", "Estimating", "Scheduler", "Books"],
  ops_core: ["Project Management", "Scheduler"],
  precon_pack: ["Project Management", "Estimating", "Takeoff"],
  suite_biz: ["Project Management", "Estimating", "Scheduler", "Books", "Takeoff"],
  full_suite: ["Project Management", "Estimating", "Scheduler", "Books", "Takeoff"],
  enterprise: ["Project Management", "Estimating", "Scheduler", "Books", "Takeoff"],
};

const UNAVAILABLE_SUITE_TOOLS = new Set(["CRM", "CAD"]);
const SUITE_TOOL_LABELS = new Set([
  "Project Management",
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

const nav: NavItem[] = [
  { section: "Command Center" },
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/calendar", label: "Calendar", icon: "C" },
  { href: "/reports", label: "Reports", icon: "R" },

  { section: "AI Tools" },
  { href: "/autopilot", label: "AI Autopilot", icon: "AI" },
  { href: "/ai-pm", label: "AI PM Team", icon: "PM" },
  { href: "/delay-engine", label: "Delay Engine", icon: "DE" },
  { href: "/voice", label: "Voice Command", icon: "V" },
  { href: "/photo-punch", label: "Photo Punch", icon: "P" },

  { section: "Field Ops" },
  { href: "/daily-logs", label: "Daily Logs", icon: "DL" },
  { href: "/crew", label: "Crew", icon: "CR" },
  { href: "/time-tracking", label: "Time Tracking", icon: "T" },
  { href: "/safety", label: "Safety", icon: "S" },
  { href: "/site-media", label: "Site Media", icon: "M" },
  { href: "/weather", label: "Weather", icon: "W" },
  { href: "/punch-list", label: "Punch List", icon: "PL" },

  { section: "Project Controls" },
  { href: "/legal", label: "Legal & Compliance", icon: "L" },
  { href: "/rfis", label: "RFIs", icon: "?" },
  { href: "/submittals", label: "Submittals", icon: "S" },
  { href: "/change-orders", label: "Change Orders", icon: "CO" },
  { href: "/ops-sign", label: "Ops Sign", icon: "OS" },
  { href: "/emails", label: "Email Repository", icon: "E" },
  { href: "/documents", label: "Documents", icon: "D" },

  { section: "Financials" },
  { href: "/budget", label: "Budget", icon: "$" },
  { href: "/bid-tracker", label: "Bid Tracker", icon: "B" },
  { href: "/insurance", label: "Insurance Reqs", icon: "I" },

  { section: "Logistics" },
  { href: "/udig", label: "U-Dig Locates", icon: "U" },
  { href: "/subcontractors", label: "Subcontractors", icon: "SC" },
  { href: "/vendors", label: "Vendors", icon: "V" },
  { href: "/buyout", label: "Buyout", icon: "BO" },
  { href: "/rentals", label: "Rentals", icon: "R" },
  { href: "/equipment", label: "Equipment", icon: "EQ" },
  { href: "/deliveries", label: "Deliveries", icon: "D" },
  { href: "/concrete", label: "Concrete", icon: "C" },

  { section: "Suite Tools" },
  { href: "/crm", label: "CRM", icon: "CRM" },
  { href: "/cad", label: "CAD", icon: "CAD" },
  { href: process.env.NEXT_PUBLIC_TAKEOFF_APP_URL || "https://takeoff.opsslate.app", label: "Takeoff", icon: "Q", external: true },
  { href: process.env.NEXT_PUBLIC_ESTIMATING_APP_URL || "https://estimating.opsslate.app", label: "Estimating", icon: "B", external: true },
  { href: process.env.NEXT_PUBLIC_SCHEDULER_APP_URL || "https://scheduler.opsslate.app", label: "Scheduler", icon: "S", external: true },
  { href: process.env.NEXT_PUBLIC_BOOKS_APP_URL || "https://books.opsslate.app", label: "Books", icon: "AR", external: true },

  { section: "System" },
  { href: "/team", label: "Team", icon: "T" },
  { href: "/risk", label: "Risk Register", icon: "R" },
  { href: "/help", label: "Help", icon: "H" },
  { href: "/branding", label: "Branding", icon: "B" },
  { href: "/settings", label: "Settings", icon: "S" },
];

function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { plan } = useBilling();

  return (
    <>
      <div className={`mb-7 flex items-center gap-3 px-1 ${collapsed ? "justify-center" : ""}`}>
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-orange-500/35 bg-orange-500/10 text-sm font-black text-orange-400">OS</span>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <span>OpsSlate</span>
              <PlanBadge />
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="rounded-full border border-border px-1.5 text-xs text-muted-foreground transition-colors hover:border-orange-500/45 hover:text-orange-300"
                  aria-label="Collapse side menu"
                >
                  {"<<"}
                </button>
              )}
            </div>
          </div>
        )}
        {collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute left-[50px] top-5 rounded-full border border-border bg-card px-1.5 text-xs text-muted-foreground transition-colors hover:border-orange-500/45 hover:text-orange-300"
            aria-label="Expand side menu"
          >
            {">>"}
          </button>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {nav.map((n, i) => {
          if ("section" in n) {
            return (
              <div key={n.section} className={`px-3 ${collapsed ? "hidden" : i === 0 ? "pt-0 pb-1.5" : "pt-5 pb-1.5"}`}>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {n.section}
                </span>
              </div>
            );
          }

          const className = `flex items-center rounded-lg py-2 text-sm transition-all ${collapsed ? "justify-center px-2" : "gap-2.5 px-3"} ${
            pathname === n.href
              ? "bg-orange-500/18 text-orange-300 font-semibold shadow-[0_12px_32px_rgba(249,115,22,0.12)] ring-1 ring-orange-500/20"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          }`;
          const locked = suiteToolLocked(plan, n.label);
          const content = (
            <>
              <span className="grid h-5 min-w-5 place-items-center rounded text-[10px] font-black text-current">{n.icon}</span>
              {!collapsed && n.label}
              {!collapsed && locked && <span className="ml-auto rounded bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/35">{UNAVAILABLE_SUITE_TOOLS.has(n.label) ? "Soon" : "Locked"}</span>}
            </>
          );

          if (locked) {
            return (
              <span
                key={n.href}
                title={UNAVAILABLE_SUITE_TOOLS.has(n.label) ? "This OpsSlate app is not available yet." : "This app is not included in the current bundle."}
                className={`${className} cursor-not-allowed opacity-55 hover:bg-transparent hover:text-muted-foreground`}
              >
                {content}
              </span>
            );
          }

          if (n.external) {
            return (
              <a key={n.href} href={n.href} onClick={onNavigate} className={className} title={collapsed ? n.label : undefined}>
                {content}
              </a>
            );
          }

          return (
            <Link key={n.href} href={n.href} onClick={onNavigate} className={className} title={collapsed ? n.label : undefined}>
              {content}
            </Link>
          );
        })}
      </nav>
      <div className={`mt-2 border-t border-border pt-3 ${collapsed ? "px-0" : ""}`}>
        {!collapsed && <p className="text-xs text-muted-foreground truncate mb-2 px-1">{user?.email}</p>}
        <Button variant="outline" size="sm" className="w-full" onClick={logout} title={collapsed ? "Sign Out" : undefined}>
          {collapsed ? "⎋" : "Sign Out"}
        </Button>
      </div>
    </>
  );
}

export function Sidebar({
  collapsed = false,
  onCollapsedChange,
}: {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-card border border-border rounded-lg p-2 shadow-lg"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 flex w-72 flex-col gap-1 border-r border-border bg-card p-4 shadow-2xl animate-slide-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="self-end mb-2 text-muted-foreground hover:text-foreground text-xl"
              aria-label="Close menu"
            >
              x
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <aside className={`relative hidden min-h-screen shrink-0 flex-col gap-1 border-r border-border bg-card/95 p-4 shadow-[16px_0_40px_rgba(0,0,0,0.25)] transition-[width] duration-200 lg:flex ${collapsed ? "w-[72px]" : "w-60"}`}>
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => onCollapsedChange?.(!collapsed)} />
      </aside>
    </>
  );
}
