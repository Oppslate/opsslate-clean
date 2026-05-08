"use client";

import Link from "next/link";
import { useEffect } from "react";
import { suiteApps, type SuiteAppKey } from "@opsslate/suite-config";
import type { SuiteToolbarProps } from "./types";

function isExternalHref(href: string) {
  return href.startsWith("http");
}

function isActive(pathname: string, href: string, appHref: string) {
  if (href === "/project-management") return pathname === "/";
  if (href.startsWith("#") || isExternalHref(href)) return false;
  return pathname === href || pathname.startsWith(`${href}/`) || pathname === appHref;
}

const BUNDLE_ACCESS: Record<string, SuiteAppKey[]> = {
  suite_pro: ["projectManagement", "estimating", "scheduler"],
  ops_core: ["projectManagement", "scheduler"],
  precon_pack: ["projectManagement", "estimating", "takeoff"],
  suite_biz: ["projectManagement", "estimating", "scheduler", "takeoff"],
  full_suite: ["projectManagement", "estimating", "scheduler", "takeoff"],
  enterprise: ["projectManagement", "estimating", "scheduler", "takeoff"],
};

function normalizeBundle(plan: string) {
  if (plan === "team" || plan === "pro") return "suite_biz";
  return plan;
}

function canOpenApp(isLoggedIn: boolean, plan: string, key: SuiteAppKey, status: string) {
  if (!isLoggedIn) return true;
  if (status !== "ready") return false;
  const bundle = normalizeBundle(plan);
  const allowed = BUNDLE_ACCESS[bundle];
  if (!allowed) return true;
  return allowed.includes(key);
}

export function SuiteToolbar({
  activePathname,
  user,
  plan,
  showActions = true,
  onLogout,
  appUrlOverrides = {},
}: SuiteToolbarProps) {
  const bundle = normalizeBundle(plan);
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    if (isLoggedIn && BUNDLE_ACCESS[bundle]) localStorage.setItem("opsslate_bundle", bundle);
  }, [bundle, isLoggedIn]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#05070a]/95 px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex h-14 w-full items-center gap-2 rounded-2xl border border-white/10 bg-[#060b12]/92 px-3 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-white hover:bg-white/[0.04]">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-orange-400/35 bg-orange-500/12 text-[11px] font-black text-orange-200 shadow-[0_0_24px_rgba(249,115,22,0.16)]">OS</span>
          <span className="hidden text-sm font-black tracking-tight sm:inline">OpsSlate</span>
          <span className="rounded-md border border-lime-300/24 bg-lime-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-lime-200">Suite</span>
        </Link>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {suiteApps.map((app) => {
            const enabled = canOpenApp(isLoggedIn, plan, app.key, app.status);
            const appHref = appUrlOverrides[app.key] || app.appHref;
            const destination = isLoggedIn && app.status === "ready" ? appHref : app.href;
            const active = isActive(activePathname, app.href, appHref);
            const lockLabel = app.status !== "ready" ? "Soon" : "Locked";
            const showStatusPill = app.status !== "ready" || (isLoggedIn && !enabled);
            const className = `flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              active
                ? "border-orange-300/35 bg-orange-500/18 text-orange-100 shadow-[0_10px_28px_rgba(249,115,22,0.16)]"
                : enabled
                  ? "border-transparent text-white/52 hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
                  : "cursor-not-allowed border-white/8 bg-white/[0.025] text-white/30"
            }`;
            const content = (
              <>
                <span className="text-[10px] font-black uppercase tracking-[0.10em] text-lime-200">{app.shortName}</span>
                <span>{app.name}</span>
                {showStatusPill && <span className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/42">{lockLabel}</span>}
              </>
            );

            if (!enabled) {
              return <span key={app.key} className={className} title={app.status !== "ready" ? "This OpsSlate app is not available yet." : "This app is not included in the current bundle."}>{content}</span>;
            }

            if (isExternalHref(destination)) {
              return <a key={app.key} href={destination} className={className}>{content}</a>;
            }

            return <Link key={app.key} href={destination} className={className}>{content}</Link>;
          })}
        </nav>
        {showActions && (
          <div className="flex shrink-0 items-center gap-2 pl-2">
            <Link href="/pricing" className="hidden rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white/82 transition hover:border-orange-300/35 hover:bg-white/[0.045] sm:inline-flex">
              Pricing
            </Link>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-orange-300/25 bg-orange-600 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-500"
              >
                Log out
              </button>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white/82 transition hover:border-orange-300/35 hover:bg-white/[0.045] sm:inline-flex">
                  Sign In
                </Link>
                <Link href="/signup" className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-500">
                  Start Free
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
