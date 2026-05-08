"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./auth-context";
import { PLAN_LIMITS } from "./plan-limits";

export function useBilling() {
  const { user } = useAuth();
  const billing = useQuery(
    api.billing.getCompanyPlan,
    user?.companyId ? { companyId: user.companyId } : "skip"
  );

  const plan = (billing?.plan || "free") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const isActive = billing?.planStatus === "active" || plan === "free";
  const isPro = plan === "pro" || plan === "team";
  const isTeam = plan === "team";

  const canAccessModule = (module: string): boolean => {
    if (limits.modules === "all") return true;
    return (limits.modules as readonly string[]).includes(module);
  };

  const getUpgradeUrl = async (priceId: string) => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        email: user?.email,
        companyId: user?.companyId,
      }),
    });
    const data = await res.json();
    return data.url;
  };

  return {
    plan,
    limits,
    isActive,
    isPro,
    isTeam,
    billing,
    canAccessModule,
    getUpgradeUrl,
  };
}

export { PLAN_LIMITS };
