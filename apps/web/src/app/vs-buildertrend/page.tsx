"use client";

import { Button } from "@/components/ui/button";
import { SuiteNav } from "@/components/suite-nav";

const COMPARISON = [
  { feature: "Monthly Price", opsslate: "$99/mo", bt: "$499+/mo", winner: "opsslate" },
  { feature: "Annual Cost", opsslate: "$948/yr", bt: "$5,988+/yr", winner: "opsslate" },
  { feature: "Per-Seat Fees", opsslate: "None — ever", bt: "Included but limited tiers", winner: "opsslate" },
  { feature: "Free Tier", opsslate: "Yes — 1 project, 2 users", bt: "No — trial only", winner: "opsslate" },
  { feature: "Contract Required", opsslate: "No — cancel anytime", bt: "Annual contract", winner: "opsslate" },
  { feature: "Setup Time", opsslate: "5 minutes", bt: "1-2 weeks + onboarding calls", winner: "opsslate" },
  { feature: "AI Autopilot", opsslate: "✅ Scope-aware, predictive", bt: "❌", winner: "opsslate" },
  { feature: "Voice Daily Logs", opsslate: "✅ Tap, talk, done", bt: "❌", winner: "opsslate" },
  { feature: "AI Construction Lawyer", opsslate: "✅ Contract analysis + code checker", bt: "❌", winner: "opsslate" },
  { feature: "Predictive Delay Engine", opsslate: "✅ 15+ data sources", bt: "❌", winner: "opsslate" },
  { feature: "Photo → Auto Punch List", opsslate: "✅ AI defect detection", bt: "❌", winner: "opsslate" },
  { feature: "Voice Command Mode", opsslate: "✅ 12 hands-free commands", bt: "❌", winner: "opsslate" },
  { feature: "Scheduling", opsslate: "✅ Gantt + dependencies + weather", bt: "✅ Basic, often buggy", winner: "opsslate" },
  { feature: "Estimating", opsslate: "✅ Full suite with AI extraction", bt: "✅ Basic built-in", winner: "opsslate" },
  { feature: "Daily Logs", opsslate: "✅ AI-generated + voice", bt: "✅ Manual templates", winner: "opsslate" },
  { feature: "Budget Tracking", opsslate: "✅ Auto CO integration", bt: "✅", winner: "tie" },
  { feature: "Change Orders", opsslate: "✅ Full workflow + email alerts", bt: "✅", winner: "tie" },
  { feature: "RFIs", opsslate: "✅ Auto-numbered, overdue tracking", bt: "✅ Basic", winner: "opsslate" },
  { feature: "Client Portal", opsslate: "🔜 Coming soon", bt: "✅ Selections & portal", winner: "bt" },
  { feature: "Selections (Finishes)", opsslate: "🔜 Coming soon", bt: "✅ Strong feature", winner: "bt" },
  { feature: "Proposals / Invoicing", opsslate: "🔜 Coming soon", bt: "✅ Built-in", winner: "bt" },
  { feature: "Weather Intelligence", opsslate: "✅ Auto crew call-off emails", bt: "❌", winner: "opsslate" },
  { feature: "Safety & Incidents", opsslate: "✅ Guided wizard, OSHA reporting", bt: "✅ Basic checklists", winner: "opsslate" },
  { feature: "Time Tracking", opsslate: "✅ One-tap, auto OT calc", bt: "✅ Clock in/out", winner: "opsslate" },
  { feature: "Document Management", opsslate: "✅ 15 categories + AI extraction", bt: "✅ Basic file storage", winner: "opsslate" },
  { feature: "Health Scores", opsslate: "✅ Real-time 0-100 per project", bt: "❌", winner: "opsslate" },
  { feature: "Mobile App", opsslate: "✅ Web-based, works on any device", bt: "✅ Native iOS/Android", winner: "tie" },
  { feature: "Reliability", opsslate: "✅ Modern stack, fast", bt: "⚠️ Frequent complaints about bugs & slowness", winner: "opsslate" },
];

const PAIN_POINTS = [
  { quote: "Buildertrend's scheduling is so buggy we went back to sticky notes on a whiteboard.", source: "Custom Home Builder, 12 employees" },
  { quote: "The app crashes constantly on Android. My subs refuse to use it.", source: "Remodeler, Residential" },
  { quote: "We're paying $500/month and half the features don't work properly. Updates break things.", source: "GC, 25 employees" },
  { quote: "Their customer support used to be great, now it's 3-day response times and canned answers.", source: "Owner, Design-Build Firm" },
];

const SAVINGS = [
  { team: "Solo Builder", bt: "$5,988/yr", opsslate: "$948/yr", saved: "$5,040/yr" },
  { team: "Small GC (5 people)", bt: "$5,988/yr", opsslate: "$948/yr", saved: "$5,040/yr" },
  { team: "Mid-size (15 people)", bt: "$7,188/yr", opsslate: "$948/yr", saved: "$6,240/yr" },
  { team: "Growing firm (30+ people)", bt: "$9,588+/yr", opsslate: "$2,388/yr", saved: "$7,200+/yr" },
];

const BT_PROBLEMS = [
  { icon: "🐛", title: "Constant Bugs", desc: "Scheduling glitches, app crashes, features that break after updates. Buildertrend's reliability is their #1 complaint on Reddit and G2." },
  { icon: "🐌", title: "Slow & Bloated", desc: "Load times that make your crew put their phone away. A UI designed by committee, not by people who've been on a jobsite." },
  { icon: "📞", title: "Declining Support", desc: "What used to be their strength is now a liability. Multi-day response times, reps who don't understand construction, scripted answers." },
  { icon: "🔒", title: "Annual Contracts", desc: "Locked in for 12 months even if the product doesn't work for your team. Try canceling — good luck reaching someone." },
  { icon: "💸", title: "Price Creep", desc: "Started affordable, but prices keep climbing. Tier jumps are steep. And that $499/mo 'Core' plan? Missing most of the good stuff." },
  { icon: "🏚️", title: "Legacy Architecture", desc: "Built in 2006. Patched for 20 years. No AI, no voice input, no predictive features. Lipstick on a pig." },
];

export default function VsBuildertrend() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <SuiteNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block bg-yellow-500/10 text-yellow-400 text-xs font-bold px-4 py-1.5 rounded-full border border-yellow-500/20 uppercase tracking-wider mb-6">HONEST COMPARISON</span>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
          OpsSlate vs Buildertrend<br />
          <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">Time for an Upgrade</span>
        </h1>
        <p className="text-xl text-white/60 max-w-3xl mx-auto mb-8">
          Buildertrend was great in 2015. But it's 2026, and construction software should have AI, voice input, 
          and predictive features — not just online spreadsheets with a fresh coat of paint.
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
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-8 text-center">
            <p className="text-sm text-yellow-400 font-medium mb-2">Buildertrend</p>
            <p className="text-5xl font-black text-yellow-400">$499+</p>
            <p className="text-white/40 mt-1">per month, annual contract required</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-8 text-center">
            <p className="text-sm text-green-400 font-medium mb-2">OpsSlate</p>
            <p className="text-5xl font-black text-green-400">$99</p>
            <p className="text-white/40 mt-1">per month, cancel anytime</p>
          </div>
        </div>
        <p className="text-center mt-6 text-2xl font-black"><span className="text-green-400">80% cheaper</span> — with <span className="text-orange-400">6 AI features</span> Buildertrend doesn't have.</p>
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

      {/* What's Wrong with Buildertrend */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">Why Builders Are Leaving Buildertrend</h2>
        <p className="text-center text-white/50 mb-8">These aren't edge cases. These are the top complaints from real users.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {BT_PROBLEMS.map((p, i) => (
            <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-xl p-5">
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="font-bold mb-2">{p.title}</h3>
              <p className="text-sm text-white/50">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section id="comparison" className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">Feature-by-Feature Comparison</h2>
        <p className="text-center text-white/50 mb-8">28 features compared. We're transparent about where Buildertrend still leads.</p>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-4 font-medium text-white/60">Feature</th>
                <th className="text-center p-4 font-bold text-orange-400">OpsSlate</th>
                <th className="text-center p-4 font-medium text-white/60">Buildertrend</th>
                <th className="text-center p-4 font-medium text-white/40 w-20">Winner</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium">{row.feature}</td>
                  <td className="p-4 text-center">
                    <span className={row.winner === "opsslate" ? "text-green-400 font-bold" : row.winner === "bt" ? "text-white/50" : "text-white/70"}>{row.opsslate}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={row.winner === "bt" ? "text-green-400 font-bold" : "text-white/50"}>{row.bt}</span>
                  </td>
                  <td className="p-4 text-center">
                    {row.winner === "opsslate" ? <span className="text-orange-400 font-bold">🏗️</span> : row.winner === "bt" ? <span className="text-yellow-400 font-bold">BT</span> : <span className="text-white/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center gap-6 mt-6 text-sm text-white/40">
          <span>🏗️ = OpsSlate wins</span>
          <span>BT = Buildertrend wins</span>
          <span>— = Tie</span>
        </div>
        <p className="text-center mt-4 text-lg font-bold">OpsSlate wins <span className="text-orange-400">21 of 28</span>. Buildertrend wins <span className="text-yellow-400">3</span> (client portal, selections, invoicing — all on our roadmap).</p>
      </section>

      {/* Savings */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">How Much Would You Save?</h2>
        <p className="text-center text-white/50 mb-8">OpsSlate doesn't charge per seat. Flat pricing, period.</p>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-4 font-medium text-white/60">Team Size</th>
                <th className="text-center p-4 font-medium text-yellow-400">Buildertrend</th>
                <th className="text-center p-4 font-medium text-green-400">OpsSlate</th>
                <th className="text-center p-4 font-bold text-orange-400">You Save</th>
              </tr>
            </thead>
            <tbody>
              {SAVINGS.map((s, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="p-4 font-medium">{s.team}</td>
                  <td className="p-4 text-center text-yellow-400">{s.bt}</td>
                  <td className="p-4 text-center text-green-400 font-bold">{s.opsslate}</td>
                  <td className="p-4 text-center text-orange-400 font-black">{s.saved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What They Don't Have */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">6 Features Buildertrend Will Never Have</h2>
        <p className="text-center text-white/50 mb-8">You can't bolt AI onto a 20-year-old codebase. These are built from the ground up.</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-bold mb-2">AI Autopilot</h3>
            <p className="text-sm text-white/50">Analyzes scope, schedule, budget, crew — suggests actions before problems happen. It's like having a senior PM watching every project 24/7.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">🎙️</div>
            <h3 className="font-bold mb-2">Voice Daily Logs</h3>
            <p className="text-sm text-white/50">Your foreman drives to the site, taps one button, talks for 30 seconds, and has a professional daily log. That's it.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">⚖️</div>
            <h3 className="font-bold mb-2">AI Construction Lawyer</h3>
            <p className="text-sm text-white/50">Upload a contract — get instant risk analysis with state-specific law references. Generate demand letters, lien notices, change order disputes.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">🛸</div>
            <h3 className="font-bold mb-2">Predictive Delay Engine</h3>
            <p className="text-sm text-white/50">Cross-references weather, crew schedules, material deliveries, inspections, and RFIs to predict delays days before they happen.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">📸</div>
            <h3 className="font-bold mb-2">Photo → Auto Punch List</h3>
            <p className="text-sm text-white/50">Walk the site, snap photos, and AI automatically creates punch list items with descriptions and severity levels. No manual entry.</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold mb-2">Project Health Scores</h3>
            <p className="text-sm text-white/50">Real-time 0-100 health score for every project. Factors in budget, schedule, safety, documentation, and crew performance.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-center mb-3">Ready to Switch?</h2>
        <p className="text-center text-white/50 mb-10">No annual contract. No per-seat fees. Start free, upgrade when ready.</p>
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
          <h2 className="text-3xl font-bold mb-4">You Deserve Better Than Buildertrend</h2>
          <p className="text-white/60 mb-2">Better features. Better AI. Better price. No annual contract.</p>
          <p className="text-white/60 mb-8">Make the switch in 5 minutes — not 5 weeks.</p>
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
