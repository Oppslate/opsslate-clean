import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpsSlate vs Procore 2026 — Honest Comparison | Save 98% on Construction PM",
  description: "Feature-by-feature comparison of OpsSlate vs Procore. 30+ modules, AI autopilot, voice daily logs, predictive delay engine — all for $99/mo vs Procore's $50,000+/year. No per-seat fees.",
  keywords: "procore alternative, procore vs, construction management software, procore competitor, construction PM software, AI construction management, procore pricing, procore cost, buildertrend alternative, construction project management",
  openGraph: {
    title: "OpsSlate vs Procore — The Real Comparison",
    description: "Same features. 6 AI tools Procore doesn't have. $99/mo vs $50,000+/year. No per-seat fees.",
    url: "https://www.opsslate.app/vs-procore",
    siteName: "OpsSlate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsSlate vs Procore — Save 98% on Construction PM",
    description: "30+ modules, AI autopilot, voice daily logs, predictive delay engine. $99/mo vs $50K/yr. The real comparison.",
  },
  alternates: {
    canonical: "https://www.opsslate.app/vs-procore",
  },
};

export default function VsProcoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
