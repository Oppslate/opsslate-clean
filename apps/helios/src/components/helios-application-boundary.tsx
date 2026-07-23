"use client";

import {
  SUITE_UI_VERSION,
  SuiteToolbar,
  suiteUiFoundationContract,
} from "@opsslate/suite-ui";
import type { HeliosPrincipal } from "@opsslate/suite-auth/types";
import { Badge } from "@opsslate/suite-ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@opsslate/suite-ui/card";
import { SuiteAppShell } from "@opsslate/suite-ui/shell";
import { usePathname } from "next/navigation";

import { heliosNavigation } from "@/lib/navigation";

const ownershipRows = Object.entries(suiteUiFoundationContract.ownership);

export function HeliosApplicationBoundary({
  principal,
}: {
  principal: HeliosPrincipal;
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
              ? {
                  projectManagement:
                    process.env.NEXT_PUBLIC_OPSSLATE_APP_URL,
                }
              : {}),
            ...(process.env.NEXT_PUBLIC_HELIOS_APP_URL
              ? { helios: process.env.NEXT_PUBLIC_HELIOS_APP_URL }
              : {}),
            ...(process.env.NEXT_PUBLIC_ESTIMATING_APP_URL
              ? {
                  estimating:
                    process.env.NEXT_PUBLIC_ESTIMATING_APP_URL,
                }
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
      topActions={
        <Badge variant="secondary">Foundation item 3A</Badge>
      }
    >
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <header className="max-w-3xl">
          <Badge
            variant="outline"
            className="mb-2 border-orange-500/35 text-orange-300"
          >
            Secure tenant boundary active
          </Badge>
          <h1 className="text-3xl font-bold leading-9">
            Helios security foundation
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-muted-foreground">
            The authenticated principal and company boundary were derived on
            the server for
            {" "}
            <span className="font-medium text-foreground">
              {principal.email}
            </span>
            . The interface continues to consume @opsslate/suite-ui
            {" "}
            {SUITE_UI_VERSION}. Cockpit and workflow features remain outside
            this foundation item.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Shared ownership</CardTitle>
              <CardDescription>
                Visual authority resolves to one versioned package.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                {ownershipRows.map(([name, owner]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-4 py-2 text-sm"
                  >
                    <dt className="capitalize text-muted-foreground">
                      {name.replace(/([A-Z])/g, " $1")}
                    </dt>
                    <dd>
                      <Badge variant="secondary">{owner}</Badge>
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security boundary</CardTitle>
              <CardDescription>
                Item 3A establishes identity and tenancy without beginning
                product features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <div className="font-medium">Verified identity</div>
                  <div className="text-muted-foreground">
                    Server-issued, HTTP-only Helios session with a bounded
                    lifetime.
                  </div>
                </div>
                <Badge className="bg-green-500/15 text-green-300">
                  Established
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <div className="font-medium">Company access</div>
                  <div className="text-muted-foreground">
                    Company ID is resolved from the existing OpsSlate account,
                    never supplied by the browser.
                  </div>
                </div>
                <Badge className="bg-green-500/15 text-green-300">
                  Enforced
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <div className="font-medium">Product features</div>
                  <div className="text-muted-foreground">
                    No cockpit, document, AI, estimating, or project mutation
                    exists.
                  </div>
                </div>
                <Badge variant="outline">Not connected</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuiteAppShell>
  );
}
