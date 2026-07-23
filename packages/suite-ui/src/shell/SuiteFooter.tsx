"use client";

import Link from "next/link";

import type { SuiteFooterAction } from "./types";

const actionClasses: Record<SuiteFooterAction["tone"], string> = {
  help: "border-sky-500/30 bg-sky-500/12 text-sky-100 hover:border-sky-400/55 hover:bg-sky-500/20",
  director:
    "border-purple-500/30 bg-purple-500/12 text-purple-100 hover:border-purple-400/55 hover:bg-purple-500/20",
  feedback:
    "border-orange-500/35 bg-orange-500/14 text-orange-100 hover:border-orange-400/60 hover:bg-orange-500/22",
};

type SuiteFooterProps = {
  actions?: SuiteFooterAction[];
  copyright?: string;
  description?: string;
  identityName?: string;
  sidebarCollapsed?: boolean;
};

export function SuiteFooter({
  actions = [],
  copyright = "© 2026 OpsSlate. All rights reserved.",
  description = "Construction operations platform",
  identityName = "OpsSlate",
  sidebarCollapsed = false,
}: SuiteFooterProps) {
  return (
    <footer
      className={`sticky bottom-0 z-[60] border-t border-white/8 bg-[#0d1218]/96 shadow-[0_-10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[margin] duration-200 supports-[backdrop-filter]:bg-[#0d1218]/84 ${
        sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-60"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="relative h-4.5 w-4.5" aria-hidden="true">
              <div className="absolute inset-x-0 top-0 h-[2px] rounded-full bg-primary/90" />
              <div className="absolute left-0 top-0 h-full w-[2px] rounded-full bg-primary/90" />
              <div className="absolute right-0 top-0 h-full w-[2px] rounded-full bg-primary/90" />
              <div className="absolute inset-x-[3px] bottom-0 h-[2px] rounded-full bg-primary/90" />
            </div>
          </div>
          <div className="leading-tight">
            <div className="flex items-start gap-1 text-sm font-semibold tracking-[0.01em] text-white/95">
              <span>{identityName}</span>
              <span className="mt-0.5 text-[9px] font-medium text-white/45">
                ™
              </span>
            </div>
            <div className="text-[11px] text-white/38">{description}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action) => {
            const className = `inline-flex h-9 items-center rounded-xl border px-3 text-xs font-bold transition-colors ${actionClasses[action.tone]}`;
            if (action.href) {
              return (
                <Link
                  key={`${action.label}-${action.href}`}
                  href={action.href}
                  className={className}
                >
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={className}
              >
                {action.label}
              </button>
            );
          })}
          <div className="hidden text-right text-[11px] font-medium tracking-[0.01em] text-white/40 sm:block">
            {copyright}
          </div>
        </div>
      </div>
    </footer>
  );
}
