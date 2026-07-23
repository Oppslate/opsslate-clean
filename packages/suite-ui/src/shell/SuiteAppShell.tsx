"use client";

import Link from "next/link";
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { SuiteFooter } from "./SuiteFooter";
import { SuiteSidebar } from "./SuiteSidebar";
import type {
  SuiteAccountMenuItem,
  SuiteFooterAction,
  SuiteNavigationItem,
  SuiteSearchConfig,
  SuiteShellAccount,
  SuiteShellIdentity,
} from "./types";

type SuiteAppShellProps = {
  account?: SuiteShellAccount;
  accountMenuItems?: SuiteAccountMenuItem[];
  activePathname: string;
  children: ReactNode;
  footerActions?: SuiteFooterAction[];
  footerDescription?: string;
  identity: SuiteShellIdentity;
  navigation: SuiteNavigationItem[];
  onSignOut?: () => void;
  overlay?: ReactNode;
  search?: SuiteSearchConfig;
  sidebarStorageKey?: string;
  toolbar: ReactNode;
  topActions?: ReactNode;
};

function accountInitials(account: SuiteShellAccount) {
  if (account.initials) return account.initials;
  return (
    (account.name || account.email || "OpsSlate")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OS"
  );
}

const sharedStorageEvent = "opsslate:shared-storage";

function usePersistentBoolean(key: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) onStoreChange();
      };
      const handleSharedStorage = (event: Event) => {
        if ((event as CustomEvent<string>).detail === key) onStoreChange();
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener(sharedStorageEvent, handleSharedStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(sharedStorageEvent, handleSharedStorage);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(
    () => localStorage.getItem(key) === "true",
    [key],
  );
  const getServerSnapshot = useCallback(() => false, []);
  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = useCallback(
    (nextValue: boolean) => {
      localStorage.setItem(key, String(nextValue));
      window.dispatchEvent(
        new CustomEvent<string>(sharedStorageEvent, { detail: key }),
      );
    },
    [key],
  );

  return [value, setValue] as const;
}

export function SuiteAppShell({
  account,
  accountMenuItems = [],
  activePathname,
  children,
  footerActions = [],
  footerDescription,
  identity,
  navigation,
  onSignOut,
  overlay,
  search,
  sidebarStorageKey = "opsslate_sidebar_collapsed",
  toolbar,
  topActions,
}: SuiteAppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] =
    usePersistentBoolean(sidebarStorageKey);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleSidebarCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  const showTopBar = Boolean(search || topActions || account);

  return (
    <div className="flex min-h-screen flex-col bg-background bg-[radial-gradient(circle_at_70%_0%,rgba(249,115,22,0.08),transparent_28%)]">
      {toolbar}
      <div className="flex flex-1">
        <SuiteSidebar
          activePathname={activePathname}
          collapsed={sidebarCollapsed}
          identity={identity}
          navigation={navigation}
          onCollapsedChange={handleSidebarCollapsedChange}
        />
        <main
          data-suite-main
          className="min-w-0 flex-1 overflow-auto p-4 pb-8 lg:p-6 lg:pb-8"
        >
          {showTopBar && (
            <div className="mb-5 flex items-center justify-end gap-3">
              {search && (
                <button
                  type="button"
                  onClick={search.onActivate}
                  className="hidden min-w-[260px] items-center gap-2 rounded-xl border border-border bg-card/75 px-3 py-2 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-orange-500/40 hover:text-foreground sm:flex"
                >
                  <span aria-hidden="true">⌕</span>
                  <span className="flex-1 text-left">
                    {search.label ?? "Search"}
                  </span>
                  <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px]">
                    {search.shortcut ?? "⌘K"}
                  </kbd>
                </button>
              )}
              {topActions}
              {account && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((value) => !value)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card/75 py-1.5 pl-1.5 pr-2 text-xs font-semibold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-orange-500/35 hover:text-foreground"
                    aria-expanded={accountMenuOpen}
                    aria-label="Account menu"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-xs font-black text-foreground">
                      {accountInitials(account)}
                    </span>
                    <span
                      className={`transition-transform ${
                        accountMenuOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
                      <div className="border-b border-border px-3 py-2.5">
                        <div className="text-sm font-semibold text-foreground">
                          {account.name || "OpsSlate User"}
                        </div>
                        {account.email && (
                          <div className="truncate text-xs text-muted-foreground">
                            {account.email}
                          </div>
                        )}
                      </div>
                      {accountMenuItems.map((item) => (
                        <Link
                          key={`${item.href}-${item.label}`}
                          onClick={() => setAccountMenuOpen(false)}
                          href={item.href}
                          className="block px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      ))}
                      {onSignOut && (
                        <button
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onSignOut();
                          }}
                          className="block w-full border-t border-border px-3 py-2 text-left text-xs font-semibold text-red-300 hover:bg-red-500/10"
                        >
                          Sign out
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
      <SuiteFooter
        actions={footerActions}
        description={footerDescription}
        identityName={identity.name}
        sidebarCollapsed={sidebarCollapsed}
      />
      {overlay}
    </div>
  );
}
