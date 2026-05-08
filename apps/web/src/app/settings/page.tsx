
"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckoutButton } from "@/components/checkout-button";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import { useBilling, PLAN_LIMITS } from "@/lib/use-billing";
import Link from "next/link";

const PRICES = {
  pro:       { monthly: "price_1T7RqFRv625dg7hWBkhX6abQ", annual: "price_1T7RqFRv625dg7hWQA2Ok9GC" },
  team:      { monthly: "price_1T7RqFRv625dg7hWAsERJ7Nk", annual: "price_1T7RqGRv625dg7hWSYnnKGtl" },
  suite_pro: { monthly: "price_1T7RqGRv625dg7hWBcNmcUOP", annual: "price_1T7RyxRv625dg7hWwdvbkybq" },
  suite_biz: { monthly: "price_1T7RqGRv625dg7hWYp5Fi2lC", annual: "price_1T7RyxRv625dg7hWQ2c17eOz" },
};

function PricingCards({ email, companyId }: { email?: string; companyId?: string }) {
  const [annual, setAnnual] = useState(false);

  const plans = [
    { key: "pro" as const, name: "Professional", monthly: 99, annual: 79, desc: "10 projects · 25 crew · 1,000 AI queries", popular: false },
    { key: "team" as const, name: "Business", monthly: 199, annual: 159, desc: "Unlimited projects · Unlimited crew · All modules", popular: true },
    { key: "suite_pro" as const, name: "Suite Pro", monthly: 249, annual: 199, desc: "PM + Estimating + Scheduler · 50GB storage", popular: false },
    { key: "suite_biz" as const, name: "Suite Business", monthly: 449, annual: 359, desc: "Full suite · 100GB storage · Priority support", popular: false },
  ];

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Unlock all 40+ modules, unlimited AI, and priority support</p>
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!annual ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${annual ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Annual <span className="text-green-400">-20%</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => (
          <div key={p.key} className={`border rounded-lg p-4 space-y-3 relative ${p.popular ? "border-blue-500/30" : "border-border"}`}>
            {p.popular && (
              <span className="absolute -top-2.5 left-3 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Popular</span>
            )}
            <div>
              <p className="font-semibold text-white">{p.name}</p>
              <p className="text-2xl font-bold text-white">
                ${annual ? p.annual : p.monthly}
                <span className="text-sm text-gray-400 font-normal">/mo</span>
              </p>
              {annual && (
                <p className="text-xs text-green-400">
                  ${p.annual * 12}/yr — Save ${(p.monthly - p.annual) * 12}/yr
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
            </div>
            <CheckoutButton
              priceId={annual ? PRICES[p.key].annual : PRICES[p.key].monthly}
              email={email}
              companyId={companyId}
              className="w-full"
              variant={p.popular ? "default" : "outline"}
            >
              Start 14-Day Free Trial
            </CheckoutButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageSubscriptionButton({ customerId }: { customerId: string }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Unable to open billing portal.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="pt-2 border-t border-border">
      <button onClick={handleClick} disabled={loading} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
        {loading ? "Opening..." : "Manage subscription →"}
      </button>
    </div>
  );
}

function BillingCard({ user }: { user: { email: string; companyId: Id<"companies"> } | null }) {
  const { plan, isPro, isTeam, billing, limits } = useBilling();
  const planLabel = plan === "team" ? "Team" : plan === "pro" ? "Pro" : "Free";
  const statusColor = billing?.planStatus === "active" || plan === "free"
    ? "bg-green-500/10 text-green-400 border-green-500/20"
    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription</CardTitle>
          <Badge className={`${statusColor} border`}>
            {billing?.planStatus === "active" || plan === "free" ? "Active" : billing?.planStatus || "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="text-lg font-bold text-white">{planLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projects</p>
            <p className="text-lg font-bold text-white">{typeof limits.projects === 'number' && limits.projects < 0 ? "∞" : limits.projects}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Crew Members</p>
            <p className="text-lg font-bold text-white">{typeof limits.crewMembers === 'number' && limits.crewMembers < 0 ? "∞" : limits.crewMembers}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">AI Queries/mo</p>
            <p className="text-lg font-bold text-white">{typeof limits.aiQueries === 'number' && limits.aiQueries < 0 ? "∞" : limits.aiQueries}</p>
          </div>
        </div>

        {billing?.planExpiresAt && (
          <p className="text-xs text-muted-foreground">
            Renews: {new Date(billing.planExpiresAt).toLocaleDateString()}
          </p>
        )}

        {!isPro && !isTeam && (
          <PricingCards email={user?.email} companyId={user?.companyId} />
        )}

        {(isPro || isTeam) && billing?.stripeCustomerId && (
          <ManageSubscriptionButton customerId={billing.stripeCustomerId} />
        )}
      </CardContent>
    </Card>
  );
}

function NotificationProfiles() {
  const { user } = useAuth();
  const profiles = useQuery(
    api.notificationProfiles.list,
    user ? { companyId: user.companyId } : "skip"
  ) as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(
    api.projects.list,
    user ? { companyId: user.companyId } : "skip"
  );
  const createProfile = useMutation(api.notificationProfiles.create);
  const updateProfile = useMutation(api.notificationProfiles.update);
  const removeProfile = useMutation(api.notificationProfiles.remove);
  const toggleActive = useMutation(api.notificationProfiles.toggleActive);
  const sendManual = useAction(api.dailyBriefingManual.sendToProfile as any);
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", type: "full_dashboard", projectIds: [] as string[] });
  const [editing, setEditing] = useState<string | null>(null);

  const typeLabels: Record<string, string> = {
    full_dashboard: "Full Dashboard",
    job_updates: "Job Updates Only",
    crew_schedule: "Crew Schedule",
    custom: "Custom",
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !user) return;
    await createProfile({
      companyId: user.companyId,
      name: form.name,
      email: form.email,
      type: form.type,
      projectIds: form.projectIds.length > 0 ? form.projectIds : undefined,
      includeCalendar: form.type === "custom" ? true : undefined,
      includeTodayPanel: form.type === "custom" ? true : undefined,
      includeCrewSchedule: form.type === "custom" ? true : undefined,
    });
    setForm({ name: "", email: "", type: "full_dashboard", projectIds: [] });
    setAdding(false);
    toast("Notification profile created", "success");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Daily Briefing Notifications</CardTitle>
          <Button size="sm" onClick={() => setAdding(!adding)}>
            {adding ? "Cancel" : "+ Add Recipient"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs mt-1">
          Emails sent daily at 6:00 AM EST. Each person gets a personalized briefing based on their notification type.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notification Type</label>
              <select
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="full_dashboard">Full Dashboard (Today Panel + Calendar + Crew)</option>
                <option value="job_updates">Job Updates Only (filtered by assigned projects)</option>
                <option value="crew_schedule">Crew Schedule Only</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {(form.type === "job_updates" || form.type === "custom") && (
              <div>
                <label className="text-xs text-muted-foreground">Filter by Projects (leave empty for all)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(projects ?? []).map((p) => (
                    <label key={p._id} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={form.projectIds.includes(p._id)}
                        onChange={(e) => {
                          if (e.target.checked) setForm({ ...form, projectIds: [...form.projectIds, p._id] });
                          else setForm({ ...form, projectIds: form.projectIds.filter((id) => id !== p._id) });
                        }}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleCreate} disabled={!form.name || !form.email}>Save</Button>
          </div>
        )}

        {(profiles ?? []).length === 0 && !adding && (
          <p className="text-muted-foreground text-sm">No notification profiles yet. Add recipients to start sending daily briefings.</p>
        )}

        {(profiles ?? []).length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles ?? []).map((p) => (
                <TableRow key={p._id as string}>
                  <TableCell className="font-medium">{p.name as string}</TableCell>
                  <TableCell>{p.email as string}</TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[(p.type as string) ?? "full_dashboard"] ?? p.type}</Badge></TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={p.active !== false ? "default" : "secondary"}
                      onClick={() => toggleActive({ id: p._id as Id<"notificationProfiles"> })}
                    >
                      {p.active !== false ? "ON" : "OFF"}
                    </Button>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sending === (p._id as string)}
                      onClick={async () => {
                        setSending(p._id as string);
                        try {
                          await sendManual({ profileId: p._id as Id<"notificationProfiles"> });
                          toast("Briefing sent to " + p.email, "success");
                        } catch (e) {
                          toast("Failed: " + (e as Error).message, "error");
                        }
                        setSending(null);
                      }}
                    >
                      {sending === (p._id as string) ? "Sending..." : "Send Now"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await removeProfile({ id: p._id as Id<"notificationProfiles"> });
                        toast("Removed", "success");
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Account & company settings</p>
        </div>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
            <p><span className="text-muted-foreground">Name:</span> {user?.name}</p>
            <p><span className="text-muted-foreground">Role:</span> {user?.role ?? "admin"}</p>
          </CardContent>
        </Card>

        <BillingCard user={user} />

        <NotificationProfiles />

        <Card id="help-create-project" className="bg-card border-border scroll-mt-20">
          <CardHeader><CardTitle>Help: Create a New Project</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Go to the <span className="font-medium">Dashboard</span>.</li>
              <li>Click <span className="font-medium">+ Create New Project</span> in the top-right.</li>
              <li>Enter a required <span className="font-medium">Project Name</span>.</li>
              <li>Optionally add a project code and location.</li>
              <li>Click <span className="font-medium">Save Project</span>.</li>
              <li>Use the project dropdown to switch to your newly created project.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
