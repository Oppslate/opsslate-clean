"use client";

import Link from "next/link";
import { ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";

import type {
  SuiteNavigationItem,
  SuiteShellIdentity,
} from "./types";

type SuiteSidebarProps = {
  activePathname: string;
  collapsed?: boolean;
  identity: SuiteShellIdentity;
  navigation: SuiteNavigationItem[];
  onCollapsedChange?: (collapsed: boolean) => void;
};

function SidebarContent({
  activePathname,
  collapsed = false,
  identity,
  navigation,
  onNavigate,
  onToggleCollapse,
}: SuiteSidebarProps & {
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      <div
        className={`mb-7 flex items-center gap-3 px-1 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-orange-500/35 bg-orange-500/10 text-sm font-black text-orange-400">
          {identity.mark}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <span>{identity.name}</span>
              {identity.badge}
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="rounded-full border border-border p-1 text-muted-foreground transition-colors hover:border-orange-500/45 hover:text-orange-300"
                  aria-label="Collapse side menu"
                >
                  <ChevronsLeft className="size-3" />
                </button>
              )}
            </div>
          </div>
        )}
        {collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute left-[50px] top-5 rounded-full border border-border bg-card p-1 text-muted-foreground transition-colors hover:border-orange-500/45 hover:text-orange-300"
            aria-label="Expand side menu"
          >
            <ChevronsRight className="size-3" />
          </button>
        )}
      </div>

      <nav
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto"
        aria-label={`${identity.name} application navigation`}
      >
        {navigation.map((item, index) => {
          if (item.type === "section") {
            return (
              <div
                key={`${item.label}-${index}`}
                className={`px-3 ${
                  collapsed
                    ? "hidden"
                    : index === 0
                      ? "pb-1.5 pt-0"
                      : "pb-1.5 pt-5"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </span>
              </div>
            );
          }

          const active = item.active ?? activePathname === item.href;
          const className = `flex items-center rounded-lg py-2 text-sm transition-all ${
            collapsed ? "justify-center px-2" : "gap-2.5 px-3"
          } ${
            active
              ? "bg-orange-500/18 font-semibold text-orange-300 shadow-[0_12px_32px_rgba(249,115,22,0.12)] ring-1 ring-orange-500/20"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          }`;

          const content = (
            <>
              <span className="grid h-5 min-w-5 place-items-center rounded text-[10px] font-black text-current">
                {item.icon}
              </span>
              {!collapsed && item.label}
              {!collapsed && item.disabled && (
                <span className="ml-auto rounded bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/35">
                  {item.disabledLabel ?? "Locked"}
                </span>
              )}
            </>
          );

          if (item.disabled) {
            return (
              <span
                key={`${item.href}-${item.label}`}
                title={item.disabledReason}
                className={`${className} cursor-not-allowed opacity-55 hover:bg-transparent hover:text-muted-foreground`}
                aria-disabled="true"
              >
                {content}
              </span>
            );
          }

          if (item.external) {
            return (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={onNavigate}
                className={className}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={onNavigate}
              className={className}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function SuiteSidebar({
  activePathname,
  collapsed = false,
  identity,
  navigation,
  onCollapsedChange,
}: SuiteSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Trigger asChild>
          <button
            type="button"
            className="fixed left-3 top-20 z-40 rounded-lg border border-border bg-card p-2 shadow-lg lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-x-0 bottom-0 top-[72px] z-[70] bg-black/60 backdrop-blur-sm lg:hidden" />
          <DialogPrimitive.Content className="animate-slide-right fixed bottom-0 left-0 top-[72px] z-[70] flex w-72 flex-col gap-1 border-r border-border bg-card p-4 shadow-2xl outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">
              {identity.name} navigation
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Application destinations and workflow navigation.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="mb-2 self-end rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </DialogPrimitive.Close>
            <SidebarContent
              activePathname={activePathname}
              identity={identity}
              navigation={navigation}
              onNavigate={() => setMobileOpen(false)}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <aside
        className={`relative hidden min-h-screen shrink-0 flex-col gap-1 border-r border-border bg-card/95 p-4 shadow-[16px_0_40px_rgba(0,0,0,0.25)] transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[72px]" : "w-60"
        }`}
      >
        <SidebarContent
          activePathname={activePathname}
          collapsed={collapsed}
          identity={identity}
          navigation={navigation}
          onToggleCollapse={() => onCollapsedChange?.(!collapsed)}
        />
      </aside>
    </>
  );
}
