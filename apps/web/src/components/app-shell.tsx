"use client";

import { SuiteAppShell } from "@opsslate/suite-ui/shell";
import { usePathname } from "next/navigation";

import { FeedbackWidget } from "@/components/feedback-widget";
import { LoginForm } from "@/components/login-form";
import { NotificationBell } from "@/components/notification-bell";
import { SuiteToolbar } from "@/components/suite-toolbar";
import { PlanBadge } from "@/components/upgrade-gate";
import { useAuth } from "@/lib/auth-context";
import { getOpsSlateNavigation } from "@/lib/opsslate-navigation";
import { useBilling } from "@/lib/use-billing";

function openDirector() {
  const event = new Event("opsslate:open-director", { cancelable: true });
  const handled = !window.dispatchEvent(event);
  if (!handled) window.location.href = "/ai-pm";
}

function openFeedback() {
  window.dispatchEvent(new Event("opsslate:open-feedback"));
}

function openSearch() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: true,
    }),
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { plan } = useBilling();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f14]">
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-orange-500/35 bg-orange-500/10 text-sm font-black text-orange-400">
            OS
          </div>
          <div className="flex items-center gap-2" aria-label="Loading OpsSlate">
            <div className="size-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
            <div className="size-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
            <div className="size-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-muted-foreground">Loading OpsSlate...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  return (
    <SuiteAppShell
      account={{ name: user.name, email: user.email }}
      accountMenuItems={[
        { href: "/team", label: "Team settings" },
        { href: "/branding", label: "Branding" },
        { href: "/settings", label: "Account settings" },
      ]}
      activePathname={pathname}
      footerActions={[
        { label: "Help", tone: "help", href: "/help" },
        { label: "Director", tone: "director", onClick: openDirector },
        { label: "Feedback", tone: "feedback", onClick: openFeedback },
      ]}
      identity={{ name: "OpsSlate", mark: "OS", badge: <PlanBadge /> }}
      navigation={getOpsSlateNavigation(plan)}
      onSignOut={logout}
      overlay={<FeedbackWidget />}
      search={{ label: "Search", shortcut: "⌘K", onActivate: openSearch }}
      toolbar={<SuiteToolbar />}
      topActions={<NotificationBell />}
    >
      {children}
    </SuiteAppShell>
  );
}
