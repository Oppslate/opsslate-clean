
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableCell, TableBody, TableHeader } from "@/components/ui/table";
import { Id } from "../../../convex/_generated/dataModel";

function useAuthenticatedQuery(fn: any, args: any) {
  return useQuery(fn, args === "skip" ? "skip" : args);
}

const ROLES = [
  { value: "owner", label: "Owner", color: "text-red-400", desc: "Full access. Billing, delete projects, manage team." },
  { value: "admin", label: "Admin", color: "text-orange-400", desc: "All modules. Can't delete projects or manage billing." },
  { value: "pm", label: "Project Manager", color: "text-blue-400", desc: "Full access to assigned projects only." },
  { value: "field", label: "Field User", color: "text-green-400", desc: "Limited access. Daily logs, time, safety, photos." },
];

const MODULE_PERMISSIONS: { key: string; label: string; ownerDefault: string; adminDefault: string; pmDefault: string; fieldDefault: string }[] = [
  { key: "budget", label: "💰 Budget", ownerDefault: "full", adminDefault: "full", pmDefault: "read", fieldDefault: "none" },
  { key: "bidTracker", label: "📋 Bid Tracker", ownerDefault: "full", adminDefault: "full", pmDefault: "read", fieldDefault: "none" },
  { key: "crew", label: "👷 Crew", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "read" },
  { key: "dailyLogs", label: "📝 Daily Logs", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "write" },
  { key: "timeTracking", label: "⏱️ Time Tracking", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "write" },
  { key: "punchList", label: "✅ Punch List", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "write" },
  { key: "safety", label: "🦺 Safety", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "write" },
  { key: "siteMedia", label: "📷 Site Media", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "write" },
  { key: "changeOrders", label: "🔄 Change Orders", ownerDefault: "full", adminDefault: "full", pmDefault: "write", fieldDefault: "read" },
  { key: "rfis", label: "❓ RFIs", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "read" },
  { key: "submittals", label: "📋 Submittals", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "read" },
  { key: "correspondence", label: "💬 Correspondence", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "none" },
  { key: "documents", label: "📄 Documents", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "read" },
  { key: "aiTools", label: "🤖 AI Tools", ownerDefault: "full", adminDefault: "full", pmDefault: "full", fieldDefault: "none" },
  { key: "reports", label: "📈 Reports", ownerDefault: "full", adminDefault: "full", pmDefault: "read", fieldDefault: "none" },
];

function Content() {
  const router = useRouter();
  const { user } = useAuth();
  const members = useAuthenticatedQuery(api.team.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const projects = useAuthenticatedQuery(api.projects.list, user ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const activityLog = useAuthenticatedQuery(api.team.getActivityLog, user ? { companyId: user.companyId as Id<"companies">, limit: 20 } : "skip") as any[] | undefined;

  const inviteMember = useMutation(api.team.invite as any);
  const updateMember = useMutation(api.team.update as any);
  const removeMember = useMutation(api.team.remove as any);
  const ensureOwner = useMutation(api.team.ensureOwner as any);
  const generateResetToken = useMutation(api.auth.generateResetToken as any);
  const sendInviteEmail = useAction(api.teamEmail.sendInvite as any);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("pm");
  const [inviteProjects, setInviteProjects] = useState<string[]>([]);
  const [editMember, setEditMember] = useState<any>(null);
  const [tab, setTab] = useState<"members" | "activity" | "permissions">("members");
  const [resendingEmail, setResendingEmail] = useState("");

  // Auto-ensure current user is an owner
  const [hasEnsured, setHasEnsured] = useState(false);
  useEffect(() => {
    if (user && members && !hasEnsured) {
      const me = members.find((m: any) => m.email === user.email);
      if (!me) {
        ensureOwner({ companyId: user.companyId as Id<"companies">, userId: user._id as Id<"users">, email: user.email, name: user.name || user.email });
      }
      setHasEnsured(true);
    }
  }, [user, members, hasEnsured, ensureOwner]);

  const myMembership = useMemo(() => members?.find((m: any) => m.email === user?.email), [members, user]);
  const canManage = !myMembership || myMembership.role === "owner" || myMembership.role === "admin";

  const handleInvite = async () => {
    if (!user || !inviteEmail.trim() || !inviteName.trim()) return;
    try {
      const result: any = await inviteMember({
        companyId: user.companyId as Id<"companies">,
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
        assignedProjects: inviteProjects,
        invitedBy: user.name || user.email,
      });
      await sendInviteEmail({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
        invitedBy: user.name || user.email,
        companyName: (user as any).companyName || "OpsSlate",
        tempPassword: result?.tempPassword,
        isExistingUser: result?.isExistingUser ?? false,
        setupToken: result?.setupToken,
      });
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("pm");
      setInviteProjects([]);
      alert(`Invite email sent to ${inviteEmail.trim()}.`);
    } catch (e: any) {
      alert(e.message || "Invite failed. Please try again.");
    }
  };

  const handleResendInvite = async (member: any) => {
    if (!user || !member?.email) return;
    setResendingEmail(member.email);
    try {
      const reset = await generateResetToken({ email: member.email });
      await sendInviteEmail({
        email: member.email,
        name: member.name || member.email,
        role: member.role,
        invitedBy: user.name || user.email,
        companyName: (user as any).companyName || "OpsSlate",
        isExistingUser: false,
        setupToken: reset?.token,
      });
      alert(`Invite email resent to ${member.email}.`);
    } catch (e: any) {
      alert(e.message || "Could not resend invite email.");
    } finally {
      setResendingEmail("");
    }
  };

  const roleInfo = (role: string) => ROLES.find((r) => r.value === role) || ROLES[3];

  const stats = useMemo(() => {
    if (!members) return { total: 0, active: 0, invited: 0, byRole: {} as Record<string, number> };
    const active = members.filter((m: any) => m.status === "active").length;
    const invited = members.filter((m: any) => m.status === "invited").length;
    const byRole: Record<string, number> = {};
    members.forEach((m: any) => { byRole[m.role] = (byRole[m.role] || 0) + 1; });
    return { total: members.length, active, invited, byRole };
  }, [members]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button type="button" onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back</button>
          <h1 className="text-2xl font-bold">👥 Team Management</h1>
          <p className="text-sm text-muted-foreground">Invite members, assign roles, control permissions</p>
        </div>
        {canManage && (
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600" onClick={() => setShowInvite(true)}>
            + Invite Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Members</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.invited}</div>
          <div className="text-xs text-muted-foreground">Pending Invites</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.byRole["pm"] || 0}</div>
          <div className="text-xs text-muted-foreground">Project Managers</div>
        </CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.byRole["field"] || 0}</div>
          <div className="text-xs text-muted-foreground">Field Users</div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button variant={tab === "members" ? "default" : "outline"} size="sm" onClick={() => setTab("members")}>👥 Members</Button>
        <Button variant={tab === "permissions" ? "default" : "outline"} size="sm" onClick={() => setTab("permissions")}>🔐 Permissions</Button>
        <Button variant={tab === "activity" ? "default" : "outline"} size="sm" onClick={() => setTab("activity")}>📋 Activity Log</Button>
      </div>

      {/* Members Tab */}
      {tab === "members" && (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members ?? []).map((m: any) => {
                  const ri = roleInfo(m.role);
                  return (
                    <TableRow key={m._id}>
                      <TableCell>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${ri.color}`}>{ri.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === "active" ? "default" : m.status === "invited" ? "secondary" : "destructive"} className="text-xs">
                          {m.status === "active" ? "🟢 Active" : m.status === "invited" ? "📨 Invited" : "⛔ Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.role === "owner" || m.role === "admin" ? (
                          <span className="text-xs text-muted-foreground">All Projects</span>
                        ) : (
                          <span className="text-xs">{(m.assignedProjects || []).length} assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleDateString() : "Never"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {canManage && m.email !== user?.email && (
                          <div className="flex gap-1">
                            <button className="text-xs text-blue-400 hover:underline" onClick={() => setEditMember(m)}>Edit</button>
                            <button
                              className="text-xs text-cyan-400 hover:underline disabled:cursor-wait disabled:opacity-50"
                              disabled={resendingEmail === m.email}
                              onClick={() => handleResendInvite(m)}
                            >
                              {resendingEmail === m.email ? "Sending..." : "Resend Invite"}
                            </button>
                            {m.status === "active" && (
                              <button className="text-xs text-yellow-400 hover:underline" onClick={() => updateMember({ id: m._id, status: "disabled" })}>Disable</button>
                            )}
                            {m.status === "disabled" && (
                              <button className="text-xs text-green-400 hover:underline" onClick={() => updateMember({ id: m._id, status: "active" })}>Enable</button>
                            )}
                            <button className="text-xs text-red-400 hover:underline" onClick={() => { if (confirm(`Remove ${m.name}?`)) removeMember({ id: m._id }); }}>Remove</button>
                          </div>
                        )}
                        {m.email === user?.email && <span className="text-xs text-muted-foreground">You</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!members || members.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No team members yet. Invite your first member!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Permissions Tab */}
      {tab === "permissions" && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-bold mb-4">🔐 Default Role Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3">Module</th>
                    {ROLES.map((r) => (
                      <th key={r.value} className={`text-center py-2 px-3 ${r.color}`}>{r.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULE_PERMISSIONS.map((mod) => (
                    <tr key={mod.key} className="border-b border-border/50">
                      <td className="py-2 px-3">{mod.label}</td>
                      <td className="text-center py-2 px-3"><PermBadge level={mod.ownerDefault} /></td>
                      <td className="text-center py-2 px-3"><PermBadge level={mod.adminDefault} /></td>
                      <td className="text-center py-2 px-3"><PermBadge level={mod.pmDefault} /></td>
                      <td className="text-center py-2 px-3"><PermBadge level={mod.fieldDefault} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Per-member overrides can be set when editing a team member.</p>
          </CardContent>
        </Card>
      )}

      {/* Activity Log Tab */}
      {tab === "activity" && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">📋 Recent Activity</h3>
            {(activityLog ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity logged yet.</p>
            ) : (
              <div className="space-y-2">
                {(activityLog ?? []).map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 bg-secondary/20 rounded-lg">
                    <span className="text-xs text-muted-foreground shrink-0 w-28">{new Date(a.timestamp).toLocaleString()}</span>
                    <span className="text-sm font-medium shrink-0">{a.userName || "System"}</span>
                    <span className="text-sm">{a.action}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{a.module}</Badge>
                    {a.details && <span className="text-xs text-muted-foreground truncate">{a.details}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">📨 Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Smith" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@company.com" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
              {(inviteRole === "pm" || inviteRole === "field") && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Assign Projects</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto bg-secondary/30 rounded-lg p-2">
                    {(projects ?? []).map((p: any) => (
                      <label key={p._id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={inviteProjects.includes(String(p._id))}
                          onChange={(e) => {
                            if (e.target.checked) setInviteProjects([...inviteProjects, String(p._id)]);
                            else setInviteProjects(inviteProjects.filter((id) => id !== String(p._id)));
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                    {(!projects || projects.length === 0) && <p className="text-xs text-muted-foreground">No projects yet</p>}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button disabled={!inviteEmail.trim() || !inviteName.trim()} onClick={handleInvite}>
                  📨 Send Invite
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editMember && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditMember(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">✏️ Edit {editMember.name}</h3>
              <button onClick={() => setEditMember(null)}>✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={editMember.role} onChange={(e) => setEditMember({ ...editMember, role: e.target.value })}>
                  {ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              {(editMember.role === "pm" || editMember.role === "field") && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Assigned Projects</label>
                  <div className="space-y-1 max-h-40 overflow-y-auto bg-secondary/30 rounded-lg p-2">
                    {(projects ?? []).map((p: any) => (
                      <label key={p._id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={(editMember.assignedProjects || []).includes(String(p._id))}
                          onChange={(e) => {
                            const curr = editMember.assignedProjects || [];
                            if (e.target.checked) setEditMember({ ...editMember, assignedProjects: [...curr, String(p._id)] });
                            else setEditMember({ ...editMember, assignedProjects: curr.filter((id: string) => id !== String(p._id)) });
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Module Permission Overrides */}
              <div>
                <label className="text-sm font-medium mb-2 block">Module Permission Overrides</label>
                <p className="text-xs text-muted-foreground mb-2">Leave blank to use role defaults. Override specific modules below.</p>
                <div className="space-y-1 bg-secondary/30 rounded-lg p-2">
                  {MODULE_PERMISSIONS.map((mod) => (
                    <div key={mod.key} className="flex items-center justify-between py-1">
                      <span className="text-xs">{mod.label}</span>
                      <select
                        className="bg-secondary border border-border rounded px-2 py-1 text-xs w-28"
                        value={(editMember.permissions || {})[mod.key] || ""}
                        onChange={(e) => {
                          const perms = { ...(editMember.permissions || {}), [mod.key]: e.target.value || undefined };
                          setEditMember({ ...editMember, permissions: perms });
                        }}
                      >
                        <option value="">Default</option>
                        <option value="full">Full</option>
                        <option value="write">Write</option>
                        <option value="read">Read Only</option>
                        <option value="none">Hidden</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
                <Button onClick={async () => {
                  await updateMember({
                    id: editMember._id,
                    name: editMember.name,
                    role: editMember.role,
                    assignedProjects: editMember.assignedProjects,
                    permissions: editMember.permissions,
                  });
                  setEditMember(null);
                }}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; className: string }> = {
    full: { label: "✅ Full", className: "text-green-400" },
    write: { label: "✏️ Write", className: "text-blue-400" },
    read: { label: "👁️ Read", className: "text-yellow-400" },
    none: { label: "❌", className: "text-red-400/50" },
  };
  const c = config[level] || config.none;
  return <span className={`text-xs ${c.className}`}>{c.label}</span>;
}

export default function TeamPage() {
  return <AppShell><Content /></AppShell>;
}
