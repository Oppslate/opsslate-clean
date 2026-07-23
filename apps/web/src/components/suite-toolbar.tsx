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
      appUrlOverrides={{
        ...(process.env.NEXT_PUBLIC_PM_APP_URL
          ? { projectManagement: process.env.NEXT_PUBLIC_PM_APP_URL }
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
  );
}
