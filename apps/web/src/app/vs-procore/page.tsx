"use client";

import { Button } from "@/components/ui/button";
import { SuiteNav } from "@/components/suite-nav";
import Head from "next/head";

const COMPARISON = [
  { feature: "Monthly Price", opsslate: "$99/mo", procore: "$4,166+/mo", winner: "opsslate" },
  { feature: "Annual Cost", opsslate: "$948/yr", procore: "$50,000+/yr", winner: "opsslate" },
  { feature: "Per-Seat Fees", opsslate: "None — ever", procore: "$35-150/user/mo", winner: "opsslate" },
  { feature: "Free Tier", opsslate: "Yes — 1 project, 2 users", procore: "No", winner: "opsslate" },
  { feature: "Setup Time", opsslate: "5 minutes", procore: "2-4 weeks + training", winner: "opsslate" },
  { feature: "AI Autopilot", opsslate: "✅ Scope-aware, predictive", procore: "❌", winner: "opsslate" },
  { feature: "Voice Daily Logs", opsslate: "✅ Tap, talk, done", procore: "❌", winner: "opsslate" },
  { feature: "AI Construction Lawyer", opsslate: "✅ Contract analysis, code checker", procore: "❌", winner: "opsslate" },
  { feature: "Predictive Delay Engine", opsslate: "✅ 15+ data sources", procore: "❌", winner: "opsslate" },
  { feature: "Photo → Auto Punch List", opsslate: "✅ AI defect detection", procore: "❌", winner: "opsslate" },
  { feature: "Voice Command Mode", opsslate: "✅ 12 hands-free commands", procore: "❌", winner: "opsslate" },
  { feature: "AI Bid Extraction", opsslate: "✅ PDF & photo scan", procore: "❌", winner: "opsslate" },
  { feature: "Daily Logs", opsslate: "✅ AI-generated", procore: "✅ Manual only", winner: "opsslate" },
  { feature: "Budget Tracking", opsslate: "✅", procore: "✅", winner: "tie" },
  { feature: "RFIs", opsslate: "✅ Auto-numbered, overdue tracking", procore: "✅", winner: "tie" },
  { feature: "Submittals", opsslate: "✅ 4-action workflow", procore: "✅", winner: "tie" },
  { feature: "Change Orders", opsslate: "✅ Full approval workflow", procore: "✅", winner: "tie" },
  { feature: "Scheduling", opsslate: "✅ Gantt + dependencies", procore: "✅ Basic", winner: "opsslate" },
  { feature: "Estimating / Bidding", opsslate: "✅ Full suite with AI", procore: "❌ Requires 3rd party", winner: "opsslate" },
  { feature: "Weather Intelligence", opsslate: "✅ Auto crew alerts", procore: "❌", winner: "opsslate" },
  { feature: "Safety & Incidents", opsslate: "✅ Guided wizard, risk matrix", procore: "✅", winner: "tie" },
  { feature: "Time Tracking", opsslate: "✅ One-tap, auto OT", procore: "✅ Manual", winner: "opsslate" },
  { feature: "Document Management", opsslate: "✅ 15 categories", procore: "✅", winner: "tie" },
  { feature: "Team Permissions", opsslate: "✅ 4 roles, 15 modules", procore: "✅", winner: "tie" },
  { feature: "Health Scores", opsslate: "✅ Real-time 0-100", procore: "❌", winner: "opsslate" },
  { feature: "Email Briefings", opsslate: "✅ Daily AI digest", procore: "❌", winner: "opsslate" },
  { feature: "Mobile Friendly", opsslate: "✅ Web-based, works everywhere", procore: "✅ Separate app required", winner: "tie" },
  { feature: "Minimum Contract", opsslate: "None — cancel anytime", procore: "Annual contract required", winner: "opsslate" },
];

const PAIN_POINTS = [
  { quote: "We spent $50K/year on Procore and our field guys barely use it because it's too complicated.", source: "GC, 45 employees" },
  { quote: "I need something my foremen can actually use without a 2-week training course.", source: "Project Manager, Commercial" },
  { quote: "Why am I paying per seat? My laborers need to clock in — they shouldn't each cost me $35/month.", source: "Superintendent, Residential" },
  { quote: "Procore does a lot, but none of it uses AI. It's 2026 and I'm still manually typing daily logs.", source: "Owner, Specialty Contractor" },
];

const SAVINGS = [
  { team: "5-person team", procore: "$52,000/yr", opsslate: "$948/yr", saved: "$51,052/yr" },
  { team: "15-person team", procore: "$56,300/yr", opsslate: "$948/yr", saved: "$55,352/yr" },
  { team: "50-person team", procore: "$75,000/yr", opsslate: "$2,388/yr", saved: "$72,612/yr" },
  { team: "100-person team", procore: "$100,000+/yr", opsslate: "$5,388/yr", saved: "$94,612+/yr" },
];

const FAQ = [
  { q: "Can I migrate from Procore to OpsSlate?", a: "Yes. OpsSlate supports CSV import for projects, budgets, and contacts. Most teams are fully migrated within a day. We also offer free migration assistance for Suite Business and Enterprise customers." },
  { q: "Does OpsSlate have everything Procore has?", a: "OpsSlate covers all core construction PM modules (daily logs, RFIs, submittals, change orders, budget, safety, documents, scheduling, and more) — plus AI features Procore doesn't have at any price. The few Procore features we don't replicate (like their marketplace of 400+ integrations) are offset by AI capabilities that eliminate the need for most of those add-ons." },
  { q: "Is OpsSlate secure?", a: "Yes. All data is encrypted in transit (TLS 1.3) and at rest. We use Convex for our backend, which provides enterprise-grade security, automatic backups, and 99.9% uptime. SOC 2 compliance is on our roadmap." },
  { q: "What about training?", a: "OpsSlate is designed to be intuitive — most users are productive within 15 minutes, not 2 weeks. Voice commands and the AI Autopilot mean less clicking and more doing. We provide video tutorials, docs, and live support for Pro and above." },
  { q: "Can I try before I buy?", a: "Absolutely. Start with our Free plan (1 project, 2 users) with no credit card required. When you're ready, upgrade to Professional for $99/mo or get the full Suite for $249/mo. Cancel anytime — no contracts." },
  { q: "Why is OpsSlate so much cheaper?", a: "We're built on modern infrastructure (Next.js, Convex, Vercel) that costs a fraction of Procore's legacy stack. We don't have a 2,000-person sales team. And we don't charge per seat because we think that model is broken. Lower overhead = lower prices without sacrificing features." },
];

export default function VsProcore() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <SuiteNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block bg-red-500/10 text-red-400 text-xs font-bold px-4 py-1.5 rounded-full border border-red-500/20 uppercase tracking-wider mb-6">HONEST COMPARISON</span>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
          OpsSlate vs Procore<br />
          <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">The Real Comparison</span>
        </h1>
        <p className="text-xl text-white/60 max-w-3xl mx-auto mb-8">
          Procore is the industry standard. But "standard" doesn't mean "best." 
          Here's an honest, feature-by-feature breakdown of what you actually get for your money.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-600 text-lg px-8 py-6" onClick={() => window.location.href = "/signup"}>
            Try OpsSlate Free →
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => document.getElementById("comparison")?.scrollIntoView({ behavior: "smooth" })}>
            See the Comparison
          </Button>
        </div>
      </section>

      {/* The Money Shot */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center">
            <p className="text-sm text-red-400 font-medium mb-2">Procore</p>
            <p className="text-5xl font-black text-red-400">$50,000+</p>
            <p className="text-white/40 mt-1">per year + per-seat fees</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-8 text-center">
            <p className="text-sm text-green-400 font-medium mb-2">OpsSlate</p>
            <p className="text-5xl font-black text-green-400">$948</p>
            <p className="text-white/40 mt-1">per year, no per-seat fees</p>
          </div>
        </div>
        <p className="text-center mt-6 text-2xl font-black">That's a <span className="text-green-400">98% savings</span> — with <span className="text-orange-400">more AI features</span>.</p>
      </section>

      {/* Pain Points */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Sound Familiar?</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-white/80 italic mb-3">"{p.quote}"</p>
              <p className="text-sm text-white/40">— {p.source}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section id="comparison" className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">Feature-by-Feature Comparison</h2>
        <p className="text-center text-white/50 mb-8">28 features compared. No spin — just facts.</p>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-4 font-medium text-white/60">Feature</th>
                <th className="text-center p-4 font-bold text-orange-400">OpsSlate</th>
                <th className="text-center p-4 font-medium text-white/60">Procore</th>
                <th className="text-center p-4 font-medium text-white/40 w-20">Winner</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium">{row.feature}</td>
                  <td className="p-4 text-center">
                    <span className={row.winner === "opsslate" ? "text-green-400 font-bold" : "text-white/70"}>{row.opsslate}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={row.winner === "procore" ? "text-green-400 font-bold" : "text-white/50"}>{row.procore}</span>
                  </td>
                  <td className="p-4 text-center">
                    {row.winner === "opsslate" ? <span className="text-orange-400 font-bold">🏗️</span> : row.winner === "procore" ? <span className="text-white/50">P</span> : <span className="text-white/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center gap-6 mt-6 text-sm text-white/40">
          <span>🏗️ = OpsSlate wins</span>
          <span>— = Tie</span>
        </div>
        <p className="text-center mt-4 text-lg font-bold">OpsSlate wins <span className="text-orange-400">20 of 28</span> categories. Ties in the rest.</p>
      </section>

      {/* Savings Calculator */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">How Much Would You Save?</h2>
        <p className="text-center text-white/50 mb-8">Real savings based on team size. OpsSlate never charges per seat.</p>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-4 font-medium text-white/60">Team Size</th>
                <th className="text-center p-4 font-medium text-red-400">Procore Cost</th>
                <th className="text-center p-4 font-medium text-green-400">OpsSlate Cost</th>
                <th className="text-center p-4 font-bold text-orange-400">You Save</th>
              </tr>
            </thead>
            <tbody>
              {SAVINGS.map((s, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="p-4 font-medium">{s.team}</td>
                  <td className="p-4 text-center text-red-400">{s.procore}</td>
                  <td className="p-4 text-center text-green-400 font-bold">{s.opsslate}</td>
                  <td className="p-4 text-center text-orange-400 font-black">{s.saved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-sm text-white/40 mt-4">Procore estimates based on published pricing + per-seat fees. OpsSlate Professional at $79/mo (annual) or Suite at $199/mo (annual) for larger teams.</p>
      </section>

      {/* What Procore Doesn't Have */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">6 Things Procore Can't Do at Any Price</h2>
        <p className="text-center text-white/50 mb-8">These aren't add-ons or integrations. They're built into every OpsSlate plan.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-bold mb-2">AI Autopilot</h3>
            <p className="text-sm text-white/50">Analyzes your scope, schedule, budget, and crew data. Suggests actions before problems happen. No other PM tool has this.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">🎙️</div>
            <h3 className="font-bold mb-2">Voice Daily Logs</h3>
            <p className="text-sm text-white/50">Tap. Talk. Done. AI converts speech into professional daily logs in 30 seconds. No typing, no pencil-whipping.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">⚖️</div>
            <h3 className="font-bold mb-2">AI Construction Lawyer</h3>
            <p className="text-sm text-white/50">Upload contracts for instant analysis. Generate legal documents. Check building codes. State-specific references included.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">🛸</div>
            <h3 className="font-bold mb-2">Predictive Delay Engine</h3>
            <p className="text-sm text-white/50">Analyzes 15+ data sources to predict delays before they happen. Weather, crew, materials, inspections — all factored in.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">📸</div>
            <h3 className="font-bold mb-2">Photo → Auto Punch List</h3>
            <p className="text-sm text-white/50">Take a photo of a defect. AI identifies the issue, creates the punch item, assigns severity. One photo = done.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-bold mb-2">AI Bid Extraction</h3>
            <p className="text-sm text-white/50">Upload a PDF bid, photo of a bid sheet, or scanned document. AI extracts every line item, quantity, and cost code instantly.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-bold mb-2 text-orange-400">{item.q}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">Ready to Switch?</h2>
        <p className="text-center text-white/50 mb-10">Start free. No credit card. No contract. No per-seat fees.</p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-1">Free</h3>
            <div className="text-3xl font-black mb-1">$0<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-white/40 mb-4">No credit card required</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li>✓ 1 project, 2 users</li>
              <li>✓ All core modules</li>
              <li>✓ 5 AI actions/month</li>
            </ul>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/signup"}>Get Started</Button>
          </div>
          <div className="bg-orange-500/5 border-2 border-orange-500 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
            <h3 className="font-bold text-lg mb-1">Professional</h3>
            <div className="text-3xl font-black mb-1">$99<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-orange-400 mb-4">$79/mo billed annually</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ Unlimited projects & AI</li>
              <li className="text-white">✓ 10 users, no per-seat fees</li>
              <li>✓ All 30+ modules</li>
              <li>✓ Voice, Autopilot, Delay Engine</li>
            </ul>
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => window.location.href = "/signup"}>Start Free Trial →</Button>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 via-green-500/10 to-blue-500/10 border-2 border-orange-500/50 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>
            <h3 className="font-bold text-lg mb-1">Suite Pro</h3>
            <div className="text-3xl font-black mb-1">$249<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-green-400 mb-4">All 3 apps • $199/mo annual</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ PM + Estimating + Scheduler</li>
              <li className="text-white">✓ Cross-app data sync</li>
              <li>✓ Bid-to-project pipeline</li>
              <li>✓ 10 users across all apps</li>
            </ul>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600" onClick={() => window.location.href = "/signup"}>Start Free Trial →</Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Stop Overpaying. Start Outperforming.</h2>
          <p className="text-white/60 mb-2">$50,000/year for software that doesn't use AI?</p>
          <p className="text-white/60 mb-8">Your competitors are switching. Don't get left behind.</p>
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-600 text-lg px-10 py-6" onClick={() => window.location.href = "/signup"}>
            Start Free — No Credit Card Required →
          </Button>
        </div>
      </section>

      <footer className="text-center py-8 text-white/30 text-sm border-t border-white/5">
        <p>OpsSlate Suite — AI-Powered Construction Management</p>
        <p className="mt-1">www.opsslate.app</p>
      </footer>
    </div>
  );
}
