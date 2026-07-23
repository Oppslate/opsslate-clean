"use client";

import { createElement, useEffect, useRef } from "react";
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

function activeFromApp(app: NonNullable<SuiteToolbarProps["activeApp"]>) {
  return app === "projectManagement" ? "project-management" : app;
}

export function SuiteToolbar({
  activePathname,
  activeApp,
  user,
  plan,
  showActions = true,
  onLogout,
  appUrlOverrides,
}: SuiteToolbarProps) {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void import("./suite-toolbar-element.js");
    if (user) localStorage.setItem("opsslate_bundle", normalizeBundle(plan));
  }, [plan, user]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !onLogout) return;

    const handleLogout = (event: Event) => {
      event.preventDefault();
      onLogout();
    };

    element.addEventListener("opsslate:logout", handleLogout);
    return () => element.removeEventListener("opsslate:logout", handleLogout);
  }, [onLogout]);

  return createElement("opsslate-suite-toolbar", {
    ref: elementRef,
    active: activeApp ? activeFromApp(activeApp) : activeFromPath(activePathname),
    plan: normalizeBundle(plan),
    "is-logged-in": user ? "true" : "false",
    "show-actions": showActions ? "true" : "false",
    "app-hrefs": JSON.stringify(appUrlOverrides ?? {}),
  });
}
