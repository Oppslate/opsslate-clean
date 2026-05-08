"use client";

import { usePathname } from "next/navigation";
import { SuiteToolbar as SharedSuiteToolbar } from "@opsslate/suite-ui";
import { useAuth } from "@/lib/auth-context";
import { useBilling } from "@/lib/use-billing";

export function SuiteToolbar({ showActions = true }: { showActions?: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { plan } = useBilling();

  return (
    <SharedSuiteToolbar
      activePathname={pathname}
      user={user}
      plan={plan}
      showActions={showActions}
      onLogout={logout}
    />
  );
}
