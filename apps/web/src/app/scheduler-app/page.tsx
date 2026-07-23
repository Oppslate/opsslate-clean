"use client";

import { useAuth } from "@/lib/auth-context";
import { SuiteNav } from "@/components/suite-nav";
import { Button } from "@opsslate/suite-ui/button";

const FEATURES = [
  { icon: "📊", title: "Interactive Gantt Charts", desc: "Drag-and-drop scheduling with task dependencies. See your entire project timeline at a glance with critical path highlighting." },
  { icon: "🔗", title: "Task Dependencies", desc: "Link tasks with finish-to-start, start-to-start, and other dependency types. Cascade changes automatically when dates shift." },
  { icon: "👷", title: "Crew Management", desc: "Assign crews to tasks, track availability, and prevent over-allocation. See who's working where across all projects." },
  { icon: "📋", title: "Sub-Items & Milestones", desc: "Break work into granular sub-tasks. Set milestones for key deliverables and track progress against deadlines." },
  { icon: "⛅", title: "Weather Integration", desc: "Automatic weather delays. The schedule adjusts based on forecasted conditions — no more manually pushing tasks." },
  { icon: "📱", title: "Mobile-First Design", desc: "Update schedules from the field. Foremen can mark tasks complete, add notes, and upload photos right from their phone." },
  { icon: "🔔", title: "Smart Notifications", desc: "Automatic alerts when tasks are at risk, dependencies are broken, or milestones are approaching. Stay ahead of delays." },
  { icon: "🌙", title: "Dark Mode", desc: "Easy on the eyes during early morning meetings and late night planning sessions. Built for how construction teams actually work." },
];

const COMPETITORS = [
  { name: "Procore Scheduling", price: "$50,000+/yr", weakness: "Overkill for scheduling, expensive, complex setup" },
  { name: "Microsoft Project", price: "$30/user/mo", weakness: "Desktop only, steep learning curve, no mobile" },
  { name: "Buildertrend", price: "$500+/mo", weakness: "Scheduling is an afterthought, buggy Gantt" },
  { name: "Smartsheet", price: "$35/user/mo", weakness: "Not construction-specific, no crew management" },
];

export default function SchedulerPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <SuiteNav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge text="CONSTRUCTION SCHEDULING" />
        <h1 className="text-5xl md:text-6xl font-black mt-4 mb-6 leading-tight">
          Schedules That<br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">Actually Work.</span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
          Interactive Gantt charts, task dependencies, crew assignments, and weather integration.
          Built for construction — not adapted from generic project management tools.
        </p>
        <div className="flex gap-4 justify-center">
          {user ? (
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-600 text-lg px-8 py-6" onClick={() => window.location.href = "/scheduler"}>
              View Scheduler Plans →
            </Button>
          ) : (
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-600 text-lg px-8 py-6" onClick={() => window.location.href = "/signup"}>
              Start Free →
            </Button>
          )}
          <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            See Features
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-3 gap-6">
          <StatCard value="Gantt" label="Interactive drag-and-drop" />
          <StatCard value="$0" label="Free to start" />
          <StatCard value="📱" label="Mobile-first design" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-12">Built for the Jobsite, Not the Boardroom</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-blue-500/30 transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-8">Why OpsSlate Scheduler?</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
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
              <tr className="bg-blue-500/10">
                <td className="p-4 font-bold text-blue-400">OpsSlate Scheduler</td>
                <td className="p-4 text-blue-400 font-bold">$99/mo</td>
                <td className="p-4 text-blue-400">Construction-built, Gantt + crews + weather, mobile-first</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-center mb-3">Scheduler Pricing</h2>
        <p className="text-center text-white/50 mb-4">No per-seat fees. Ever. Save 20% with annual billing.</p>
        <p className="text-center text-sm text-blue-400 font-medium mb-10">💡 Get all 3 apps with a Suite plan starting at $249/mo</p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-1">Free</h3>
            <div className="text-3xl font-black mb-1">$0<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-white/40 mb-4">Try it out, no credit card</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li>✓ 1 project</li>
              <li>✓ 2 users</li>
              <li>✓ Basic Gantt chart</li>
              <li>✓ 20 tasks</li>
              <li className="text-white/30">✕ Task dependencies</li>
              <li className="text-white/30">✕ Weather integration</li>
            </ul>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/signup"}>Get Started</Button>
          </div>
          <div className="bg-blue-500/5 border-2 border-blue-500 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
            <h3 className="font-bold text-lg mb-1">Professional</h3>
            <div className="text-3xl font-black mb-1">$99<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-blue-400 mb-4">$79/mo billed annually — save $240/yr</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ Unlimited projects</li>
              <li className="text-white">✓ 10 users</li>
              <li>✓ Interactive Gantt charts</li>
              <li>✓ Task dependencies</li>
              <li>✓ Crew management</li>
              <li>✓ Weather integration</li>
              <li>✓ Smart notifications</li>
              <li>✓ Milestones & sub-items</li>
            </ul>
            <Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={() => window.location.href = "/signup"}>Start Free Trial →</Button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-1">Business</h3>
            <div className="text-3xl font-black mb-1">$199<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-white/40 mb-4">$159/mo billed annually — save $480/yr</p>
            <ul className="space-y-2 text-sm text-white/50 mb-6">
              <li className="text-white">✓ Everything in Professional</li>
              <li className="text-white">✓ Unlimited users</li>
              <li>✓ API access</li>
              <li>✓ Multi-project views</li>
              <li>✓ Resource leveling</li>
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
          <div className="bg-gradient-to-br from-orange-500/10 via-green-500/10 to-blue-500/10 border-2 border-blue-500/50 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>
            <h3 className="font-bold text-lg mb-1">Suite Pro</h3>
            <div className="text-3xl font-black mb-1">$249<span className="text-sm font-normal text-white/40">/mo</span></div>
            <p className="text-xs text-blue-400 mb-4">Save $48/mo vs buying separately • $199/mo annual</p>
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
            <p className="text-xs text-blue-400 mb-4">Save $148/mo vs buying separately • $359/mo annual</p>
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
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Take Control of Your Schedule?</h2>
          <p className="text-white/60 mb-8">Join contractors who deliver on time with smarter scheduling tools.</p>
          <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-600 text-lg px-8 py-6" onClick={() => window.location.href = user ? "/scheduler" : "/signup"}>
            {user ? "View Scheduler Plans →" : "Start Free →"}
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
  return <span className="inline-block bg-blue-500/10 text-blue-400 text-xs font-bold px-4 py-1.5 rounded-full border border-blue-500/20 uppercase tracking-wider">{text}</span>;
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
      <div className="text-3xl font-black text-blue-400 mb-1">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </div>
  );
}
