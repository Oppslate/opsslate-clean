"use client";

import { useState } from "react";
import { useBilling } from "@/lib/use-billing";
import { Lock, Zap, Crown } from "lucide-react";

const PRO_PRICE_ID = "price_1T7RqFRv625dg7hWBkhX6abQ";   // Professional $99/mo
const TEAM_PRICE_ID = "price_1T7RqFRv625dg7hWAsERJ7Nk";  // Business $199/mo

interface UpgradeGateProps {
  module: string;
  children: React.ReactNode;
}

export function UpgradeGate({ module, children }: UpgradeGateProps) {
  const { canAccessModule, plan } = useBilling();

  if (canAccessModule(module)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
      <p className="text-gray-500 max-w-md mb-8">
        This module is available on the Pro plan. Upgrade to unlock all 40+ modules, AI features, and unlimited projects.
      </p>
      <div className="flex gap-4">
        <UpgradeButton priceId={PRO_PRICE_ID} label="Professional — $99/mo" icon={<Zap className="w-4 h-4" />} />
        <UpgradeButton priceId={TEAM_PRICE_ID} label="Business — $199/mo" icon={<Crown className="w-4 h-4" />} variant="outline" />
      </div>
      <p className="text-xs text-gray-600 mt-4">Current plan: {plan}</p>
    </div>
  );
}

function UpgradeButton({ priceId, label, icon, variant }: { priceId: string; label: string; icon: React.ReactNode; variant?: string }) {
  const [loading, setLoading] = useState(false);
  const { getUpgradeUrl } = useBilling();

  const handleClick = async () => {
    setLoading(true);
    try {
      const url = await getUpgradeUrl(priceId);
      if (url) window.location.href = url;
    } catch {
      alert("Unable to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
        variant === "outline"
          ? "border border-gray-700 text-gray-300 hover:bg-gray-800"
          : "bg-blue-600 text-white hover:bg-blue-500"
      }`}
    >
      {icon}
      {loading ? "Redirecting..." : label}
    </button>
  );
}

// Simple plan badge for showing in sidebar/header
export function PlanBadge() {
  const { plan } = useBilling();

  if (plan === "free") return null;

  const colors = plan === "team"
    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-blue-500/10 text-blue-400 border-blue-500/20";

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${colors} uppercase font-bold`}>
      {plan}
    </span>
  );
}
