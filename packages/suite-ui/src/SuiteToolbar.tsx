"use client";

import { createElement, useEffect } from "react";
import type { SuiteToolbarProps } from "./types";

function normalizeBundle(plan: string) {
  if (plan === "team" || plan === "pro") return "suite_biz";
  return plan;
}

function activeFromPath(pathname: string) {
  if (pathname.startsWith("/estimating")) return "estimating";
  if (pathname.startsWith("/scheduler")) return "scheduler";
  if (pathname.startsWith("/books")) return "books";
  if (pathname.startsWith("/takeoff")) return "takeoff";
  if (pathname.startsWith("/cad")) return "cad";
  if (pathname.startsWith("/crm")) return "crm";
  return "project-management";
}

export function SuiteToolbar({
  activePathname,
  user,
  plan,
  showActions = true,
}: SuiteToolbarProps) {
  useEffect(() => {
    if (!document.querySelector('script[data-opsslate-suite-toolbar="true"]')) {
      const script = document.createElement("script");
      script.src = "/suite-toolbar.js?v=2026-05-09.2";
      script.defer = true;
      script.dataset.opsslateSuiteToolbar = "true";
      document.head.appendChild(script);
    }

    if (user) localStorage.setItem("opsslate_bundle", normalizeBundle(plan));
  }, [plan, user]);

  return createElement("opsslate-suite-toolbar", {
    active: activeFromPath(activePathname),
    plan: normalizeBundle(plan),
    "is-logged-in": user ? "true" : "false",
    "show-actions": showActions ? "true" : "false",
  });
}
