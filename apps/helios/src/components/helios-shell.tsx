"use client";

import { useClerk } from "@clerk/nextjs";
import { Badge } from "@opsslate/suite-ui/badge";
import { SuiteAppShell } from "@opsslate/suite-ui/shell";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { HeliosPrincipal } from "@/lib/helios-principal";
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
  const { signOut } = useClerk();
  const pathname = usePathname();

  async function logout() {
    await signOut({ redirectUrl: "/sign-in" });
  }

  return (
    <SuiteAppShell
      account={{ email: principal.email, name: principal.name }}
      activePathname={pathname}
      footerDescription="Independent construction intelligence for heavy highway estimators"
      identity={{
        name: "Helios",
        mark: "H",
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
      toolbar={null}
      topActions={topActions}
    >
      <div className="mx-auto w-full max-w-[1500px]">{children}</div>
    </SuiteAppShell>
  );
}
