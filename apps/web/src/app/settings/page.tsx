
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Badge } from "@opsslate/suite-ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { CheckoutButton } from "@/components/checkout-button";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import { useBilling, PLAN_LIMITS } from "@/lib/use-billing";
import {
  CorrespondenceSignatureProfile,
  defaultSignatureProfile,
  formatCorrespondenceSignature,
  isSignatureComplete,
  loadSignatureProfile,
  saveSignatureProfile,
} from "@/lib/correspondence-signature";
import Link from "next/link";

const PRICES = {
  pro:       { monthly: "price_1T7RqFRv625dg7hWBkhX6abQ", annual: "price_1T7RqFRv625dg7hWQA2Ok9GC" },
  team:      { monthly: "price_1T7RqFRv625dg7hWAsERJ7Nk", annual: "price_1T7RqGRv625dg7hWSYnnKGtl" },
  suite_pro: { monthly: "price_1T7RqGRv625dg7hWBcNmcUOP", annual: "price_1T7RyxRv625dg7hWwdvbkybq" },
  suite_biz: { monthly: "price_1T7RqGRv625dg7hWYp5Fi2lC", annual: "price_1T7RyxRv625dg7hWQ2c17eOz" },
};

const SIGNATURE_TITLES = [
  "Estimator",
  "Project Manager",
  "Assistant Project Manager",
  "Project Executive",
  "Superintendent",
  "Owner",
  "Other",
];

function CorrespondenceSignatureCard() {
  const { user } = useAuth();
  const branding = useQuery(api.companyBranding.get, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any;
  const [profile, setProfile] = useState<CorrespondenceSignatureProfile>(() => defaultSignatureProfile(user));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(loadSignatureProfile(user));
    setSaved(false);
  }, [user?._id, user?.email, user?.name]);

  const update = (field: keyof CorrespondenceSignatureProfile, value: string) => {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (!user) return;
    saveSignatureProfile(user, profile);
    setSaved(true);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Correspondence Signature</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Only your logged-in account can use this signature on RFQs and formal correspondence.
            </p>
          </div>
          <Badge variant={isSignatureComplete(profile) ? "default" : "outline"}>
            {isSignatureComplete(profile) ? "Ready" : "Incomplete"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Signature name</label>
              <Input value={profile.displayName} onChange={(e) => update("displayName", e.target.value)} placeholder="Michael J. Maziarz" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
              <select
                value={SIGNATURE_TITLES.includes(profile.title) ? profile.title : "Other"}
                onChange={(e) => update("title", e.target.value === "Other" ? "" : e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
              >
                {SIGNATURE_TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
              </select>
              {!SIGNATURE_TITLES.includes(profile.title) && (
                <Input className="mt-2" value={profile.title} onChange={(e) => update("title", e.target.value)} placeholder="Custom title" />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Cell phone</label>
              <Input value={profile.cellPhone} onChange={(e) => update("cellPhone", e.target.value)} placeholder="716-400-6144" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
              <div className="flex gap-2">
                <Input value={profile.email} onChange={(e) => update("email", e.target.value)} placeholder={user?.email || "name@company.com"} />
                <Button type="button" variant="outline" onClick={() => update("email", user?.email || "")}>Use account</Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave}>Save Signature</Button>
            {saved && <span className="text-sm text-green-400">Signature saved for your account.</span>}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Preview</div>
          <pre className="whitespace-pre-wrap text-sm text-foreground">
            {formatCorrespondenceSignature(profile, branding?.name, user)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

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

function InboundEmailSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const addresses = useQuery((api as any).inboundEmailAddresses.list, user ? { companyId: String(user.companyId) } : "skip") as any[] | undefined;
  const createAddress = useMutation((api as any).inboundEmailAddresses.create);
  const updateAddress = useMutation((api as any).inboundEmailAddresses.update);
  const removeAddress = useMutation((api as any).inboundEmailAddresses.remove);
  const [form, setForm] = useState({
    localPart: "",
    label: "",
    routeType: "company",
    projectId: "",
  });

  const previewLocal = (form.localPart || "company")
    .toLowerCase()
    .trim()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9._+-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const previewAddress = `${previewLocal || "company"}@inbound.opsslate.app`;
  const selectedProject = (projects || []).find((project) => project._id === form.projectId);

  async function handleCreateAddress() {
    if (!user || !form.localPart.trim()) return;
    await createAddress({
      companyId: String(user.companyId),
      localPart: form.localPart,
      label: form.label || undefined,
      routeType: form.routeType,
      projectId: form.routeType === "project" ? form.projectId || undefined : undefined,
      projectName: form.routeType === "project" ? selectedProject?.name : undefined,
    });
    setForm({ localPart: "", label: "", routeType: "company", projectId: "" });
    toast("Forwarding address created", "success");
  }

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast(`${label} copied`, "success");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Gmail Forwarding Setup Wizard</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Create OpsSlate forwarding addresses, connect Gmail forwarding, capture the Gmail verification email, and route messages to the right company inbox or project route.
            </p>
          </div>
          <Badge variant="outline">{addresses?.length || 0} inbound address{(addresses?.length || 0) === 1 ? "" : "es"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/25 p-3">
            <div className="text-sm font-bold">1. DNS provider setup</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use Resend Inbound for a receiving domain, or forward Gmail/Outlook mail into an OpsSlate forwarding address. Use a subdomain so normal OpsSlate mail stays untouched.
            </p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => copyText("https://resend.com/domains", "Resend domains")}>Copy Resend domains link</Button>
          </div>
          <div className="rounded-lg border border-border bg-secondary/25 p-3">
            <div className="text-sm font-bold">2. Webhook URL</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Resend Inbound, SendGrid Inbound Parse, or Mailgun should POST inbound email payloads here. Add <span className="font-semibold text-foreground">?key=INBOUND_EMAIL_SECRET</span> if the production secret is enabled.
            </p>
            <div className="mt-2 rounded-md border border-border bg-background/70 p-2 text-xs text-cyan-200">https://www.opsslate.app/api/inbound-email</div>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => copyText("https://www.opsslate.app/api/inbound-email", "Webhook URL")}>Copy webhook</Button>
          </div>
          <div className="rounded-lg border border-border bg-secondary/25 p-3">
            <div className="text-sm font-bold">3. Gmail verification</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Gmail sends a confirmation email first. OpsSlate captures the code or link and shows it below next to the address.
            </p>
            <div className="mt-2 rounded-md border border-border bg-background/70 p-2 text-xs text-muted-foreground">Example: company@inbound.opsslate.app</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background/55 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="font-bold">Inbound Email Address Manager</div>
              <p className="text-xs text-muted-foreground">Create forwarding addresses that Gmail, Outlook, or any server can forward into.</p>
            </div>
            <Badge variant="secondary">Create forwarding address</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Address name</label>
              <Input value={form.localPart} onChange={(event) => setForm({ ...form, localPart: event.target.value })} placeholder="stamford-office" className="mt-1" />
              <div className="mt-1 text-xs text-cyan-200">{previewAddress}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Label</label>
              <Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Stamford Gmail forwarding" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Route</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm"
                value={form.routeType}
                onChange={(event) => setForm({ ...form, routeType: event.target.value, projectId: "" })}
              >
                <option value="company">Company inbox route</option>
                <option value="project">Project route</option>
              </select>
              {form.routeType === "project" && (
                <select
                  className="mt-2 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm"
                  value={form.projectId}
                  onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                >
                  <option value="">Select project</option>
                  {(projects || []).map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateAddress} disabled={!form.localPart.trim() || (form.routeType === "project" && !form.projectId)}>
                Create
              </Button>
            </div>
          </div>
        </div>

        {(addresses || []).length === 0 ? (
          <p className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            No inbound addresses yet. Create one, add it as a Gmail forwarding address, then watch this panel for the Gmail verification code.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forwarding address</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Gmail verification</TableHead>
                <TableHead>Last email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(addresses || []).map((address) => (
                <TableRow key={address._id}>
                  <TableCell>
                    <div className="font-semibold">{address.fullAddress}</div>
                    <div className="text-xs text-muted-foreground">{address.label || "No label"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{address.routeType === "project" ? `Project route: ${address.projectName || address.projectId || "selected project"}` : "Company inbox route"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <Badge variant={address.gmailVerificationStatus === "code_received" ? "default" : "secondary"}>
                        Gmail verification: {String(address.gmailVerificationStatus || "not_started").replace(/_/g, " ")}
                      </Badge>
                      {address.gmailVerificationCode && (
                        <button className="mt-1 block text-left font-mono text-cyan-200 hover:text-cyan-100" onClick={() => copyText(address.gmailVerificationCode, "Gmail verification")}>
                          {address.gmailVerificationCode}
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {address.lastSubject ? <><div>{address.lastSubject}</div><div>{address.lastSender}</div></> : "No email received yet"}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyText(address.fullAddress, "Forwarding address")}>Copy</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAddress({ id: address._id, status: address.status === "paused" ? "active" : "paused" })}
                    >
                      {address.status === "paused" ? "Activate" : "Pause"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeAddress({ id: address._id })}>Remove</Button>
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

        <CorrespondenceSignatureCard />

        <BillingCard user={user} />

        <InboundEmailSetup />

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
