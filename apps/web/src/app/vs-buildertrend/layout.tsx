import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpsSlate vs Buildertrend 2026 — Honest Comparison | AI-Powered Construction PM",
  description: "Feature-by-feature comparison of OpsSlate vs Buildertrend. 30+ modules, 6 AI features Buildertrend doesn't have, better scheduling, $99/mo vs $499+/mo. No per-seat fees.",
  keywords: "buildertrend alternative, buildertrend vs, buildertrend competitor, construction management software, buildertrend pricing, buildertrend problems, buildertrend review, construction PM software, AI construction management, coconstruct alternative",
  openGraph: {
    title: "OpsSlate vs Buildertrend — The Real Comparison",
    description: "More features. Real AI. $99/mo vs $499+/mo. No per-seat fees. No annual contracts.",
    url: "https://www.opsslate.app/vs-buildertrend",
    siteName: "OpsSlate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsSlate vs Buildertrend — AI-Powered Construction PM",
    description: "30+ modules, voice daily logs, AI autopilot, predictive delays. $99/mo vs $499+/mo. The honest comparison.",
  },
  alternates: {
    canonical: "https://www.opsslate.app/vs-buildertrend",
  },
};

export default function VsBuildertrendLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
