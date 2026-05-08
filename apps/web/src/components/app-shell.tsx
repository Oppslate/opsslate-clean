"use client";

import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/login-form";
import { Sidebar } from "@/components/sidebar";
import { FeedbackWidget } from "@/components/feedback-widget";
import { NotificationBell } from "@/components/notification-bell";
import { SuiteToolbar } from "@/components/suite-toolbar";
import Link from "next/link";
import { useState } from "react";


function OpsSlateFooter({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  return (
    <footer className={`fixed inset-x-0 bottom-0 z-[60] border-t border-white/8 bg-[#0d1218]/96 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0d1218]/84 shadow-[0_-10px_30px_rgba(0,0,0,0.35)] transition-[left] duration-200 ${sidebarCollapsed ? "lg:left-[72px]" : "lg:left-60"}`}>
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="relative h-4.5 w-4.5">
              <div className="absolute inset-x-0 top-0 h-[2px] rounded-full bg-primary/90" />
              <div className="absolute left-0 top-0 h-full w-[2px] rounded-full bg-primary/90" />
              <div className="absolute right-0 top-0 h-full w-[2px] rounded-full bg-primary/90" />
              <div className="absolute inset-x-[3px] bottom-0 h-[2px] rounded-full bg-primary/90" />
            </div>
          </div>
          <div className="leading-tight">
            <div className="flex items-start gap-1 text-sm font-semibold tracking-[0.01em] text-white/95">
              <span>OpsSlate</span>
              <span className="mt-0.5 text-[9px] font-medium text-white/45">™</span>
            </div>
            <div className="text-[11px] text-white/38">Construction operations platform</div>
          </div>
        </div>
        <div className="text-[11px] font-medium tracking-[0.01em] text-white/40 text-right">
          © 2026 OpsSlate. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("opsslate_sidebar_collapsed") === "true";
  });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleSidebarCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("opsslate_sidebar_collapsed", String(collapsed));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">🚜</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-muted-foreground text-sm">Loading OpsSlate...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const initials = (user.name || user.email || "OpsSlate")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OS";

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(circle_at_70%_0%,rgba(249,115,22,0.08),transparent_28%)]">
      <SuiteToolbar />
      <div className="flex min-h-[calc(100vh-73px)]">
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={handleSidebarCollapsedChange} />
        <main className="flex-1 min-w-0 overflow-auto p-4 pb-24 lg:p-6 lg:pb-24">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-end gap-3">
          <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} className="hidden sm:flex min-w-[260px] items-center gap-2 rounded-xl border border-border bg-card/75 px-3 py-2 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-orange-500/40 hover:text-foreground">
            <span>⌕</span>
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>
          <NotificationBell />
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/75 py-1.5 pl-1.5 pr-2 text-xs font-semibold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-orange-500/35 hover:text-foreground"
              aria-expanded={accountMenuOpen}
              aria-label="Account menu"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-xs font-black text-foreground">{initials}</span>
              <span className={`transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}>⌄</span>
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
                <div className="border-b border-border px-3 py-2.5">
                  <div className="text-sm font-semibold text-foreground">{user.name || "OpsSlate User"}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
                <Link onClick={() => setAccountMenuOpen(false)} href="/team" className="block px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground">Team settings</Link>
                <Link onClick={() => setAccountMenuOpen(false)} href="/branding" className="block px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground">Branding</Link>
                <Link onClick={() => setAccountMenuOpen(false)} href="/settings" className="block px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground">Account settings</Link>
                <button
                  type="button"
                  onClick={() => { setAccountMenuOpen(false); logout(); }}
                  className="block w-full border-t border-border px-3 py-2 text-left text-xs font-semibold text-red-300 hover:bg-red-500/10"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
        {children}
        </main>
      </div>
      <OpsSlateFooter sidebarCollapsed={sidebarCollapsed} />
      <FeedbackWidget />
    </div>
  );
}
