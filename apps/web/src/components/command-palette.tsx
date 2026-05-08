"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const PAGES = [
  { href: "/", label: "Dashboard", icon: "📊", keywords: "home overview" },
  { href: "/calendar", label: "Calendar", icon: "📅", keywords: "schedule dates" },
  { href: "/daily-logs", label: "Daily Logs", icon: "📝", keywords: "journal notes" },
  { href: "/autopilot", label: "AI Autopilot", icon: "🤖", keywords: "artificial intelligence auto" },
  { href: "/weather", label: "Weather", icon: "⛅", keywords: "forecast rain wind" },
  { href: "/safety", label: "Safety & Incidents", icon: "🦺", keywords: "accident injury osha" },
  { href: "/site-media", label: "Site Media", icon: "📷", keywords: "photos videos drone" },
  { href: "/change-orders", label: "Change Orders", icon: "🔄", keywords: "CO modifications" },
  { href: "/punch-list", label: "Punch List", icon: "✅", keywords: "deficiencies closeout snag" },
  { href: "/crew", label: "Crew", icon: "👷", keywords: "workers team labor" },
  { href: "/time-tracking", label: "Time Tracking", icon: "⏱️", keywords: "hours timesheet payroll" },
  { href: "/budget", label: "Budget", icon: "💰", keywords: "cost money contract" },
  { href: "/subcontractors", label: "Subcontractors", icon: "🏗️", keywords: "subs vendors trades" },
  { href: "/rfis", label: "RFIs", icon: "❓", keywords: "request information question" },
  { href: "/submittals", label: "Submittals", icon: "📋", keywords: "shop drawings review approval" },
  { href: "/documents", label: "Documents", icon: "📄", keywords: "files drawings specs contracts" },
  { href: "/reports", label: "Reports & Analytics", icon: "📊", keywords: "health score analytics" },
  { href: "/rentals", label: "Rentals", icon: "🏗️", keywords: "rent equipment" },
  { href: "/equipment", label: "Equipment", icon: "🔧", keywords: "tools machinery" },
  { href: "/concrete", label: "Concrete Pours", icon: "🧱", keywords: "pour concrete" },
  { href: "/deliveries", label: "Deliveries", icon: "🚚", keywords: "shipping materials" },
  { href: "/risk", label: "Risk Register", icon: "⚠️", keywords: "risk analysis contract" },
  { href: "/settings", label: "Settings", icon: "⚙️", keywords: "preferences notifications" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { user } = useAuth();

  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(() => {
    const items: { type: string; label: string; icon: string; href: string; subtitle?: string }[] = [];
    const q = query.toLowerCase();

    // Pages
    for (const p of PAGES) {
      if (!q || p.label.toLowerCase().includes(q) || p.keywords.includes(q)) {
        items.push({ type: "page", label: p.label, icon: p.icon, href: p.href });
      }
    }

    // Projects
    if (projects) {
      for (const proj of projects) {
        if (!q || proj.name.toLowerCase().includes(q) || (proj.address && proj.address.toLowerCase().includes(q))) {
          items.push({ type: "project", label: proj.name, icon: "🏗️", href: `/projects/${proj._id}`, subtitle: proj.address || proj.status });
        }
      }
    }

    return items.slice(0, 15);
  }, [query, projects]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[selectedIndex]) { e.preventDefault(); navigate(results[selectedIndex].href); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selectedIndex, navigate]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-muted-foreground text-lg">🔍</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, projects, crew..."
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded border border-border">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">No results found</div>
          )}
          {results.map((item, i) => (
            <button
              key={item.href + item.label}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                i === selectedIndex ? "bg-primary/20 text-primary" : "hover:bg-secondary"
              }`}
            >
              <span className="text-xl w-8 text-center">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{item.label}</div>
                {item.subtitle && <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>}
              </div>
              <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">{item.type}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
