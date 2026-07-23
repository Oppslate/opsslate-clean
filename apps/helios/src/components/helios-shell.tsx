"use client";

import type { HeliosPrincipal } from "@opsslate/suite-auth/types";
import { Badge } from "@opsslate/suite-ui/badge";
import { SuiteAppShell } from "@opsslate/suite-ui/shell";
import { SuiteToolbar } from "@opsslate/suite-ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { heliosNavigation } from "@/lib/navigation";

export function HeliosShell({
  children,
  principal,
  topActions,
}: {
  children: ReactNode;
  principal: HeliosPrincipal;
  topActions?: ReactNode;
}) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    window.location.assign("/");
  }

  return (
    <SuiteAppShell
      account={{ email: principal.email, name: principal.name }}
      activePathname={pathname}
      footerDescription="Construction intelligence in the OpsSlate product family"
      identity={{
        name: "OpsSlate",
        mark: "OS",
        badge: (
          <Badge
            variant="outline"
            className="border-orange-500/35 text-orange-300"
          >
            Helios
          </Badge>
        ),
      }}
      navigation={heliosNavigation}
      onSignOut={logout}
      sidebarStorageKey="helios_sidebar_collapsed"
      toolbar={
        <SuiteToolbar
          activePathname={pathname}
          activeApp="helios"
          user={{ email: principal.email, name: principal.name }}
          plan="suite_biz"
          showActions={false}
          onLogout={logout}
          appUrlOverrides={{
            ...(process.env.NEXT_PUBLIC_OPSSLATE_APP_URL
              ? { projectManagement: process.env.NEXT_PUBLIC_OPSSLATE_APP_URL }
              : {}),
            ...(process.env.NEXT_PUBLIC_HELIOS_APP_URL
              ? { helios: process.env.NEXT_PUBLIC_HELIOS_APP_URL }
              : {}),
            ...(process.env.NEXT_PUBLIC_ESTIMATING_APP_URL
              ? { estimating: process.env.NEXT_PUBLIC_ESTIMATING_APP_URL }
              : {}),
            ...(process.env.NEXT_PUBLIC_SCHEDULER_APP_URL
              ? { scheduler: process.env.NEXT_PUBLIC_SCHEDULER_APP_URL }
              : {}),
            ...(process.env.NEXT_PUBLIC_BOOKS_APP_URL
              ? { books: process.env.NEXT_PUBLIC_BOOKS_APP_URL }
              : {}),
            ...(process.env.NEXT_PUBLIC_TAKEOFF_APP_URL
              ? { takeoff: process.env.NEXT_PUBLIC_TAKEOFF_APP_URL }
              : {}),
          }}
        />
      }
      topActions={topActions}
    >
      <div className="mx-auto w-full max-w-[1500px]">{children}</div>
    </SuiteAppShell>
  );
}
