"use client";

import { useAuth } from "@/lib/auth-context";
import { SuiteNav } from "@/components/suite-nav";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: "📸", title: "Photo-to-Estimate", desc: "Snap a photo of a bid sheet, blueprint, or handwritten estimate — AI extracts every line item, cost code, and quantity instantly." },
  { icon: "🧠", title: "AI Bid Extraction", desc: "Upload PDF proposals, bid tabs, or scanned documents. AI reads them and structures line items with cost codes, quantities, and amounts." },
  { icon: "📊", title: "Bid Comparison", desc: "Compare multiple bids side-by-side. See variances, missing scopes, and identify the best value — not just the lowest price." },
  { icon: "💰", title: "Cost Database", desc: "Build your own cost database over time. Track historical pricing by trade, material, and region for more accurate future estimates." },
  { icon: "📋", title: "RFQ Management", desc: "Send requests for quotes to subs, track responses, and compare pricing — all from one dashboard." },
  { icon: "🔄", title: "Bid-to-Budget Bridge", desc: "Won the job? One click converts your winning bid into a project budget with cost codes already mapped." },
  { icon: "📈", title: "Win/Loss Analytics", desc: "Track your bid history, win rate, and identify which project types and sizes you're most competitive in." },
  { icon: "⚡", title: "10x Faster Than Spreadsheets", desc: "Stop manually entering numbers into Excel. Upload, extract, analyze — what took hours now takes minutes." },
];

const COMPETITORS = [
  { name: "B2W Estimate", price: "$15,000+/yr", weakness: "Complex, expensive, enterprise-only" },
  { name: "ProEst", price: "$5,000+/yr", weakness: "No AI extraction, manual data entry" },
  { name: "STACK", price: "$4,000+/yr", weakness: "Takeoff focused, weak on bid management" },
  { name: "Spreadsheets", price: "Free", weakness: "Error-prone, no collaboration, no intelligence" },
];

function ActionChip({ icon, label }: { icon: string; label: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/80 flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"><span>{icon}</span><span>{label}</span></div>;
}

export default function EstimatingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <SuiteNav />

      {/* Standard Header Shell */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 via-emerald-500/5 to-cyan-500/5 p-8 md:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="max-w-3xl">
              <Badge text="AI-POWERED ESTIMATING" />
              <h1 className="text-5xl md:text-6xl font-black mt-4 mb-4 leading-tight">
                Stop Guessing.<br />
                <span className="bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">Start Winning Bids.</span>
              </h1>
              <p className="text-lg text-white/60 max-w-2xl">
                Your estimating command center for AI extraction, bid comparison, cost history, RFQs, and bid-to-budget handoff.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 text-sm text-white/70">
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1">📸 Photo-to-estimate</span>
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1">📄 PDF extraction</span>
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1">📊 Bid comparison</span>
                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1">🔄 Bid-to-budget bridge</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px] lg:w-[360px]">
              {user ? (
                <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 text-base px-6 py-6 sm:col-span-2" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>View Estimating Plans {">"}</Button>
              ) : (
                <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 text-base px-6 py-6 sm:col-span-2" onClick={() => window.location.href = "/signup"}>Start Free →</Button>
              )}
              <Button size="lg" variant="outline" className="text-base px-6 py-6" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>See Features</Button>
              <Button size="lg" variant="outline" className="text-base px-6 py-6" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>Pricing</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Standard Action Panels */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
            <div className="text-sm font-bold text-white mb-3">Capture & Extract</div>
            <div className="grid grid-cols-2 gap-2">
              <ActionChip icon="📸" label="Photo to Estimate" />
              <ActionChip icon="📄" label="PDF Extraction" />
              <ActionChip icon="🧠" label="AI Bid Read" />
              <ActionChip icon="⚡" label="Fast Entry" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-bold text-white mb-3">Analyze & Compare</div>
            <div className="grid grid-cols-2 gap-2">
              <ActionChip icon="📊" label="Bid Compare" />
              <ActionChip icon="💰" label="Cost History" />
              <ActionChip icon="📋" label="RFQ Tracking" />
              <ActionChip icon="📈" label="Win/Loss" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-bold text-white mb-3">Operational Workflow</div>
            <div className="grid grid-cols-2 gap-2">
              <ActionChip icon="🔄" label="Bid to Budget" />
              <ActionChip icon="🏗️" label="Project Handoff" />
              <ActionChip icon="👥" label="Team Access" />
              <ActionChip icon="🖨️" label="Proposal Output" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-3 gap-6">
          <StatCard value="10x" label="Faster than manual takeoffs" />
          <StatCard value="$0" label="No per-seat fees" />
          <StatCard value="AI" label="Extracts from photos & PDFs" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Win More Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-green-500/30 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-8">Why OpsSlate Estimating?</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.25)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4">Tool</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Limitation</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr key={c.name} className="border-b border-white/5">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4 text-red-400">{c.price}</td>
                  <td className="p-4 text-white/50">{c.weakness}</td>
                </tr>
              ))}
              <tr className="bg-green-500/10">
                <td className="p-4 font-bold text-green-400">OpsSlate Estimating</td>
                <td className="p-4 text-green-400 font-bold">$99/mo</td>
                <td className="p-4 text-green-400">AI-powered, photo extraction, full bid management</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-3">Estimating Pricing</h2>
        <p className="text-center text-white/50 mb-4">No per-seat fees. Ever. Save 20% with annual billing.</p>
        <p className="text-center text-sm text-green-400 font-medium mb-10">💡 Get all 3 apps with a Suite plan starting at $249/mo</p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-1">Free</h3>
            <div className="text-3xl font-black mb-1">$0<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-white/40 mb-4">Try it out, no credit card</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li>✓ 3 estimates</li>
              <li>✓ 2 users</li>
              <li>✓ Manual entry</li>
              <li>✓ Basic cost database</li>
              <li className="text-white/30">✕ AI extraction</li>
              <li className="text-white/30">✕ Photo-to-estimate</li>
            </ul>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/signup"}>Get Started</Button>
          </div>
          <div className="bg-green-500/5 border-2 border-green-500 rounded-2xl p-6 relative shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
            <h3 className="font-bold text-lg mb-1">Professional</h3>
            <div className="text-3xl font-black mb-1">$99<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-green-400 mb-4">$79/mo billed annually — save $240/yr</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ Unlimited estimates</li>
              <li className="text-white">✓ 10 users</li>
              <li>✓ AI bid extraction (PDF & photos)</li>
              <li>✓ Photo-to-estimate</li>
              <li>✓ Bid comparison & analytics</li>
              <li>✓ RFQ management</li>
              <li>✓ Cost database</li>
              <li>✓ Bid-to-budget bridge</li>
            </ul>
            <Button className="w-full bg-green-500 hover:bg-green-600" onClick={() => window.location.href = "/signup"}>Start Free Trial →</Button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-1">Business</h3>
            <div className="text-3xl font-black mb-1">$199<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-white/40 mb-4">$159/mo billed annually — save $480/yr</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ Everything in Professional</li>
              <li className="text-white">✓ Unlimited users</li>
              <li>✓ API access</li>
              <li>✓ Win/loss analytics</li>
              <li>✓ Custom templates</li>
              <li>✓ Priority support</li>
              <li>✓ Dedicated account manager</li>
            </ul>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/signup"}>Start Free Trial →</Button>
          </div>
        </div>
      </section>

      {/* Suite Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h3 className="text-center text-white/40 text-xs font-bold uppercase tracking-widest mb-6">OpsSlate Suite — All 3 Apps</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-orange-500/10 via-green-500/10 to-blue-500/10 border-2 border-green-500/50 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>
            <h3 className="font-bold text-lg mb-1">Suite Pro</h3>
            <div className="text-3xl font-black mb-1">$249<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-green-400 mb-4">Save $48/mo vs buying separately • $199/mo annual</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ 🏗️ Project Management Pro</li>
              <li className="text-white">✓ 📋 Estimating Pro</li>
              <li className="text-white">✓ 📅 Scheduler Pro</li>
              <li>✓ Unified dashboard</li>
              <li>✓ Cross-app data sync</li>
              <li>✓ Bid-to-project pipeline</li>
              <li>✓ 10 users across all apps</li>
            </ul>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600" onClick={() => window.location.href = "/signup"}>Start Free Trial →</Button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-1">Suite Business</h3>
            <div className="text-3xl font-black mb-1">$449<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-green-400 mb-4">Save $148/mo vs buying separately • $359/mo annual</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ Everything in Suite Pro</li>
              <li className="text-white">✓ Unlimited users</li>
              <li>✓ API access for all apps</li>
              <li>✓ Custom branding</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced cross-app analytics</li>
              <li>✓ Dedicated account manager</li>
            </ul>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/signup"}>Start Free Trial →</Button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-1">Enterprise</h3>
            <div className="text-3xl font-black mb-1">Custom</div>
            <p className="text-xs text-white/40 mb-4">For large contractors & GCs</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ Everything in Suite Business</li>
              <li>✓ 50+ users</li>
              <li>✓ SSO / SAML</li>
              <li>✓ SLA guarantee</li>
              <li>✓ On-prem deployment option</li>
              <li>✓ Custom integrations</li>
              <li>✓ Quarterly business reviews</li>
            </ul>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/signup"}>Contact Sales</Button>
          </div>
        </div>
        <p className="text-center text-sm text-white/40 mt-8">That&apos;s <strong className="text-white">$249/mo vs $4,000+/mo</strong> for Procore — for <strong className="text-white">3 apps</strong> with more AI features than all competitors combined.</p>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Win More Bids?</h2>
          <p className="text-white/60 mb-8">Join contractors who estimate smarter, bid faster, and win more work.</p>
          <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 text-lg px-8 py-6" onClick={() => window.location.href = user ? "#pricing" : "/signup"}>
            {user ? "View Estimating Plans ?" : "Start Free →"}
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

function Badge({ text }: { text: string }) {
  return <span className="inline-block bg-green-500/10 text-green-400 text-xs font-bold px-4 py-1.5 rounded-full border border-green-500/20 uppercase tracking-wider">{text}</span>;
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
      <div className="text-3xl font-black text-green-400 mb-1">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </div>
  );
}
