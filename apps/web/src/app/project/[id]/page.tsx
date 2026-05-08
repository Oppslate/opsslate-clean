"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";

function healthColor(score: number) {
  if (score >= 80) return { bg: "bg-green-500/20 border-green-500/40", text: "text-green-400", label: "Healthy", ring: "ring-green-500" };
  if (score >= 60) return { bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-400", label: "At Risk", ring: "ring-yellow-500" };
  return { bg: "bg-red-500/20 border-red-500/40", text: "text-red-400", label: "Critical", ring: "ring-red-500" };
}

function fmt(n: number) { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

type TeamMemberSummary = {
  id: string;
  name: string;
  role: string;
  status: string;
};

function formatRole(role: string) {
  return role
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isAdminRecipient(member: any) {
  const role = String(member?.role || "").toLowerCase();
  return Boolean(member?.email) && (role === "admin" || role === "owner");
}

function ModuleCard({ icon, title, href, stats, alert }: { icon: string; title: string; href: string; stats: { label: string; value: string | number; color?: string }[]; alert?: string }) {
  return (
    <Link href={href}>
      <Card className={`bg-card border-border hover:border-primary/50 hover:bg-secondary/30 transition-all cursor-pointer ${alert ? "border-red-500/50 bg-red-500/5" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{icon}</span>
            <h3 className="font-bold text-sm">{title}</h3>
            {alert && <Badge variant="destructive" className="text-[10px] ml-auto">{alert}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className={`text-lg font-bold ${s.color || ""}`}>{String(s.value)}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectDashboardContent() {
  const params = useParams();
  const { user } = useAuth();
  const data = useQuery(
    api.projectDashboard.getProjectOverview,
    params.id && user ? { projectId: params.id as Id<"projects">, companyId: user.companyId } : "skip",
  ) as any;
  const projectPm = data?.aiPm as any | null | undefined;
  const projectPmMessages = useQuery(api.aiPm.getMessages, projectPm?.id ? { pmId: projectPm.id as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;
  const projectPmTasks = useQuery(api.aiPm.getTasks, projectPm?.id ? { pmId: projectPm.id as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;
  const teamMembers = useQuery(api.team.list, user?.companyId ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const chatWithPm = useAction(api.aiPmEngine.chat as any);
  const generatePmReport = useAction(api.aiPmEngine.dailyReport as any);
  const sendEmail = useAction(api.sendEmail.send as any);
  const analyzeWeatherMultiSource = useAction(api.weather.analyzeWeatherMultiSource as any);
  const [aiPmStatusPrompt, setAiPmStatusPrompt] = useState("");
  const [aiPmProblemReport, setAiPmProblemReport] = useState("");
  const [aiPmCardWorking, setAiPmCardWorking] = useState(false);
  const [adminEscalationState, setAdminEscalationState] = useState<"idle" | "director" | "sending" | "sent" | "queued" | "failed">("idle");
  const [weatherMonitor, setWeatherMonitor] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [selectedWeatherRecipientIds, setSelectedWeatherRecipientIds] = useState<string[]>([]);
  const [weatherAlertState, setWeatherAlertState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    const project = data?.project;
    if (!project || typeof project.latitude !== "number" || typeof project.longitude !== "number") {
      setWeatherMonitor(null);
      return;
    }
    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError(null);
    analyzeWeatherMultiSource({ latitude: project.latitude, longitude: project.longitude })
      .then((result: any) => { if (!cancelled) setWeatherMonitor(result); })
      .catch((err: Error) => { if (!cancelled) setWeatherError(err.message || "Weather check failed"); })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [analyzeWeatherMultiSource, data?.project?._id, data?.project?.latitude, data?.project?.longitude]);

  const project = data?.project || {};
  const weatherPrimary = weatherMonitor?.primary;
  const weatherConsensus = weatherMonitor?.consensus;
  const activeWeatherAlerts = weatherMonitor?.activeAlerts || [];
  const weatherStatus = weatherPrimary?.fieldStatus === "red" ? "High Risk" : weatherPrimary?.fieldStatus === "yellow" ? "Watch" : weatherPrimary ? "Clear" : "Needs Location";
  const weatherStatusClass = weatherPrimary?.fieldStatus === "red"
    ? "bg-red-500/15 text-red-300 border-red-500/30"
    : weatherPrimary?.fieldStatus === "yellow"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : weatherPrimary
        ? "bg-green-500/15 text-green-300 border-green-500/30"
        : "bg-secondary text-muted-foreground border-border";
  const weatherReportText = useMemo(() => {
    if (!weatherPrimary) return "";
    const alertLine = activeWeatherAlerts.length
      ? `Active alerts: ${activeWeatherAlerts.map((a: any) => a.event || a.headline || "Weather alert").join(", ")}`
      : "Active alerts: none";
    return [
      `${project.name || "Project"} weather report — ${weatherPrimary.date || new Date().toLocaleDateString()}`,
      `Status: ${weatherStatus}`,
      `Forecast: ${weatherPrimary.icon || ""} ${weatherPrimary.condition || "Weather available"}, high ${weatherPrimary.high ?? "--"}°F / low ${weatherPrimary.low ?? "--"}°F, rain ${weatherConsensus?.precipProb ?? weatherPrimary.precipProb ?? "--"}%, wind ${weatherConsensus?.windMax ?? weatherPrimary.windMax ?? "--"} mph.`,
      `Recommendation: ${weatherConsensus?.recommendation || "Keep routine PM weather watch in place."}`,
      alertLine,
    ].join("\n");
  }, [activeWeatherAlerts, project.name, weatherConsensus, weatherPrimary, weatherStatus]);

  const projectWeatherRecipients = useMemo(() => {
    const currentProjectId = String(project?._id || params.id || "");
    return (teamMembers || [])
      .filter((member: any) => {
        if (!member?.email || member.status !== "active") return false;
        return !member.assignedProjects?.length || member.assignedProjects.includes(currentProjectId);
      })
      .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [params.id, project?._id, teamMembers]);

  useEffect(() => {
    if (selectedWeatherRecipientIds.length > 0 || projectWeatherRecipients.length === 0) return;
    setSelectedWeatherRecipientIds(projectWeatherRecipients.slice(0, 3).map((member: any) => String(member._id)));
  }, [projectWeatherRecipients, selectedWeatherRecipientIds.length]);

  if (!user) return null;
  if (data === undefined) return <div className="flex items-center justify-center h-96"><div className="text-muted-foreground">Loading project data...</div></div>;
  if (data === null) return <div className="flex items-center justify-center h-96"><div className="text-destructive">Project not found or you do not have access.</div></div>;

  const h = healthColor(data.healthScore);
  const adminRecipient = (teamMembers || []).find(isAdminRecipient);
  const latestPmUpdates = (projectPmMessages || [])
    .filter((m: any) => m.role === "pm")
    .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 3);
  const flaggedPmProblems = (projectPmTasks || [])
    .filter((t: any) => {
      const text = `${t.description || ""} ${t.result || ""}`.toLowerCase();
      return t.status === "failed" || t.status === "waiting_approval" || text.includes("failed") || text.includes("cannot") || text.includes("manual") || text.includes("problem") || text.includes("concern");
    })
    .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 4);
  const locationText = [project.address, project.city || project.location, project.state, project.zip].filter(Boolean).join(", ");
  const directionsUrl = locationText ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationText)}` : "";
  const mapUrl = locationText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}` : "";
  const shareLocation = async () => {
    if (!locationText) return;
    const text = `${project.name}\n${locationText}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: project.name, text, url: directionsUrl });
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(`${text}\n${directionsUrl}`);
    alert("Project location copied to clipboard.");
  };

  const handleAiPmStatusUpdate = async () => {
    if (!user?.companyId || !projectPm || aiPmCardWorking) return;
    const prompt = aiPmStatusPrompt.trim() || "Post a concise project status update for the team. Include current posture, blockers, and the next action you recommend.";
    setAiPmCardWorking(true);
    try {
      await chatWithPm({
        pmId: projectPm.id,
        projectId: params.id as Id<"projects">,
        companyId: user.companyId as Id<"companies">,
        pmName: projectPm.name,
        personality: projectPm.personality,
        message: prompt,
      });
      setAiPmStatusPrompt("");
    } finally {
      setAiPmCardWorking(false);
    }
  };

  const handleAiPmDailyReport = async () => {
    if (!user?.companyId || !projectPm || aiPmCardWorking) return;
    setAiPmCardWorking(true);
    try {
      await generatePmReport({
        pmId: projectPm.id,
        projectId: params.id as Id<"projects">,
        companyId: user.companyId as Id<"companies">,
        pmName: projectPm.name,
        personality: projectPm.personality,
      });
    } finally {
      setAiPmCardWorking(false);
    }
  };

  const handleDirectorEscalation = async () => {
    if (!projectPm) return;
    const issueText = aiPmProblemReport.trim() || flaggedPmProblems[0]?.description || "AI PM reported a project issue that needs Director review.";
    setAdminEscalationState("director");
    setAiPmProblemReport(issueText);
  };

  const handleNotifyAdmin = async () => {
    if (!user?.companyId || !projectPm) return;
    const issueText = aiPmProblemReport.trim() || flaggedPmProblems[0]?.description || "AI PM reported a project issue that needs admin review.";
    if (!adminRecipient?.email) {
      setAdminEscalationState("queued");
      return;
    }
    setAdminEscalationState("sending");
    try {
      await sendEmail({
        companyId: user.companyId,
        to: adminRecipient.email,
        subject: `${data.project.name} — AI PM Director Escalation`,
        body: [
          `Project: ${data.project.name}`,
          `AI PM: ${projectPm.name}`,
          `Director status: Notified in OpsSlate`,
          ``,
          `Reported issue`,
          issueText,
          ``,
          `Requested action`,
          `Please review the project dashboard and respond to the assigned AI PM or project team.`,
        ].join("\n"),
        projectId: params.id,
        senderName: "OpsSlate AI Director",
      });
      setAdminEscalationState("sent");
    } catch {
      setAdminEscalationState("failed");
    }
  };

  const handleSendWeatherAlert = async () => {
    if (!user?.companyId || !weatherReportText || selectedWeatherRecipientIds.length === 0) return;
    const selectedRecipients = projectWeatherRecipients.filter((member: any) => selectedWeatherRecipientIds.includes(String(member._id)));
    if (selectedRecipients.length === 0) return;
    setWeatherAlertState("sending");
    try {
      await sendEmail({
        companyId: user.companyId,
        to: selectedRecipients.map((member: any) => member.email).join(","),
        subject: `${data.project.name} — Weather ${weatherStatus === "Clear" ? "Report" : "Alert"}`,
        body: [
          weatherReportText,
          "",
          `Project: ${data.project.name}`,
          locationText ? `Location: ${locationText}` : "Location: not set",
          "",
          "Sent from the project Weather Monitor in OpsSlate.",
        ].join("\n"),
        projectId: params.id,
        senderName: "OpsSlate Weather Monitor",
      });
      setWeatherAlertState("sent");
    } catch {
      setWeatherAlertState("failed");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            {locationText && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl leading-none hover:scale-110 transition-transform"
                title="Open property map"
                aria-label="Open property map"
              >
                📍
              </a>
            )}
            <h1 className="text-2xl font-bold">{data.project.name}</h1>
          </div>
          {data.project.address && <p className="text-muted-foreground text-sm">{data.project.address}</p>}
        </div>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 ${h.bg}`}>
          <div className="text-center">
            <div className={`text-3xl font-black ${h.text}`}>{data.healthScore}</div>
            <div className="text-xs text-muted-foreground">Health</div>
          </div>
          <Badge variant={data.healthScore >= 80 ? "default" : data.healthScore >= 60 ? "secondary" : "destructive"} className="text-sm">{h.label}</Badge>
        </div>
      </div>

      {/* PM Weather Monitor */}
      <Card className="bg-gradient-to-r from-sky-500/5 to-blue-500/5 border-sky-500/30 border-l-4 border-l-sky-500 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">⛅ PM Weather Monitor</h3>
                <Badge variant="outline" className={`text-[10px] ${weatherStatusClass}`}>{weatherLoading ? "Checking..." : weatherStatus}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Daily jobsite weather posture, field recommendation, and copy-ready report for this project.</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/weather?project=${params.id}`}><Button size="sm" variant="outline">Open Weather</Button></Link>
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={!weatherReportText}
                onClick={async () => {
                  if (!weatherReportText) return;
                  await navigator.clipboard.writeText(weatherReportText);
                  alert("Weather report copied to clipboard.");
                }}
              >Copy Report</Button>
            </div>
          </div>
          {weatherPrimary ? (
            <div className="grid md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="text-xs uppercase text-muted-foreground">Today</div>
                <div className="mt-1 text-lg font-bold">{weatherPrimary.icon} {weatherPrimary.condition}</div>
                <div className="text-xs text-muted-foreground mt-1">High {weatherPrimary.high}°F / Low {weatherPrimary.low}°F</div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="text-xs uppercase text-muted-foreground">Rain Risk</div>
                <div className="mt-1 text-2xl font-bold text-blue-300">{weatherConsensus?.precipProb ?? weatherPrimary.precipProb ?? 0}%</div>
                <div className="text-xs text-muted-foreground mt-1">Consensus precipitation probability</div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="text-xs uppercase text-muted-foreground">Wind</div>
                <div className="mt-1 text-2xl font-bold text-cyan-300">{weatherConsensus?.windMax ?? weatherPrimary.windMax ?? 0} mph</div>
                <div className="text-xs text-muted-foreground mt-1">Operational watch threshold</div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="text-xs uppercase text-muted-foreground">PM Recommendation</div>
                <div className="mt-1 text-sm font-medium">{weatherConsensus?.recommendation || "Routine PM weather watch."}</div>
                {weatherConsensus?.confidence && <div className="text-xs text-muted-foreground mt-1">Confidence: {weatherConsensus.confidence}</div>}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
              {weatherLoading ? "Pulling weather sources for this project..." : weatherError ? `Weather unavailable: ${weatherError}` : "Add/geocode the project address to enable automatic PM weather monitoring and reports."}
            </div>
          )}
          {activeWeatherAlerts.length > 0 && (
            <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm">
              <div className="font-medium text-red-300 mb-1">Active weather alerts</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {activeWeatherAlerts.map((alert: any, i: number) => <div key={i}>{alert.event || "Weather alert"}: {alert.headline || "NWS alert active for this project area."}</div>)}
              </div>
            </div>
          )}
          <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <div className="font-medium text-sm">Send weather alert</div>
                <div className="text-xs text-muted-foreground">Selected project: {data.project.name}. Choose team members assigned to this project.</div>
              </div>
              <Button
                size="sm"
                type="button"
                disabled={!weatherReportText || selectedWeatherRecipientIds.length === 0 || weatherAlertState === "sending"}
                onClick={handleSendWeatherAlert}
              >{weatherAlertState === "sending" ? "Sending..." : "Send Alert"}</Button>
            </div>
            {projectWeatherRecipients.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {projectWeatherRecipients.map((member: any) => {
                  const memberId = String(member._id);
                  const checked = selectedWeatherRecipientIds.includes(memberId);
                  return (
                    <label key={memberId} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${checked ? "border-sky-500/50 bg-sky-500/10" : "border-border bg-secondary/20"}`}>
                      <input
                        type="checkbox"
                        className="accent-sky-500"
                        checked={checked}
                        onChange={(event) => {
                          setWeatherAlertState("idle");
                          setSelectedWeatherRecipientIds((current) => event.target.checked
                            ? Array.from(new Set([...current, memberId]))
                            : current.filter((id) => id !== memberId));
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium truncate">{member.name}</span>
                        <span className="block text-[10px] text-muted-foreground truncate">{formatRole(member.role || "team")} • {member.email}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active team members with email are assigned to this project yet. Add them in Team, then they’ll appear here.</p>
            )}
            {weatherAlertState === "sent" && <p className="text-xs text-green-400 mt-2">Weather alert sent to selected team members.</p>}
            {weatherAlertState === "failed" && <p className="text-xs text-red-400 mt-2">Weather alert failed to send. Check email configuration and try again.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats ribbon */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{data.crew.active}</div><div className="text-xs text-muted-foreground">Active Crew</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{data.time.totalHours.toFixed(0)}</div><div className="text-xs text-muted-foreground">Total Hours</div></CardContent></Card>
        <Card className={`border-border ${data.budget.variance < 0 ? "bg-red-500/10 border-red-500/30" : "bg-card"}`}><CardContent className="p-3 text-center"><div className={`text-2xl font-bold ${data.budget.variance < 0 ? "text-red-400" : "text-green-400"}`}>{fmt(data.budget.variance)}</div><div className="text-xs text-muted-foreground">Budget Var.</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-green-400">{fmt(data.changeOrders.totalCost)}</div><div className="text-xs text-muted-foreground">Approved COs</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{data.dailyLogs.thisWeek}</div><div className="text-xs text-muted-foreground">Logs This Week</div></CardContent></Card>
      </div>

      {/* Project record essentials */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
        <Card className="bg-card border-border lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-sm">Project Details</h3>
                <p className="text-xs text-muted-foreground mt-1">Location and baseline job info</p>
              </div>
              {project.status && <Badge variant="outline" className="text-[10px]">{project.status}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ["Address", locationText],
                ["Manager", project.projectManager],
                ["Contractor", project.contractor],
                ["Type", project.type],
                ["Start", project.startDate],
                ["End", project.endDate],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label as string} className="min-w-0">
                  <div className="text-[10px] uppercase text-muted-foreground">{label as string}</div>
                  <div className="font-medium truncate">{value as string}</div>
                </div>
              ))}
              {!locationText && !project.projectManager && !project.contractor && !project.type && (
                <p className="text-sm text-muted-foreground col-span-2">No project details recorded yet.</p>
              )}
            </div>
            {locationText && (
              <div className="flex flex-wrap gap-2 mt-4">
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" type="button">🧭 Get Directions</Button>
                </a>
                <Button size="sm" variant="outline" type="button" onClick={shareLocation}>📤 Share Location</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">📷 Site Media</h3>
              <Link href="/site-media" className="text-xs text-primary hover:underline">Open</Link>
            </div>
            <div className="text-3xl font-bold">{data.media?.total || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">photos and site files</p>
            {data.media?.recent?.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {data.media.recent.map((m: any) => (
                  <div key={String(m.id)} className="aspect-square rounded-md overflow-hidden bg-secondary border border-border">
                    {m.type === "video" ? (
                      <div className="h-full flex items-center justify-center text-lg">🎥</div>
                    ) : (
                      <img src={m.url} alt={m.fileName || "Project media"} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No media linked yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">📎 Documents</h3>
              <Link href="/documents" className="text-xs text-primary hover:underline">Open</Link>
            </div>
            <div className="text-3xl font-bold">{data.documents?.total || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">attachments and project files</p>
            {data.documents?.recent?.length > 0 ? (
              <div className="space-y-1.5">
                {data.documents.recent.slice(0, 3).map((doc: any) => (
                  <div key={String(doc.id)} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{doc.name}</span>
                    {doc.category && <Badge variant="outline" className="text-[9px] shrink-0">{doc.category}</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents linked yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Project Manager */}
      <Card className="bg-gradient-to-r from-orange-500/10 via-background to-blue-500/10 border-orange-500/30 border-l-4 border-l-orange-500 shadow-[0_18px_60px_rgba(0,0,0,0.18)] mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-2xl">{projectPm?.avatar || "🤖"}</div>
              <div>
                <div className="text-sm font-bold">AI Project Manager</div>
                <div className="mt-1 text-xl font-black">{projectPm?.name || "No AI PM assigned"}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {projectPm ? `${projectPm.personality === "direct" ? "Direct & no-nonsense" : projectPm.personality === "detailed" ? "Detailed & methodical" : "Friendly & proactive"} • ${projectPm.status === "active" ? "Active" : "Paused"} • ${projectPm.openTasks || 0} open task${(projectPm.openTasks || 0) === 1 ? "" : "s"}` : "Assign an AI PM to activate project communication and escalation."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {projectPm ? <Button variant="outline" size="sm" disabled={aiPmCardWorking} onClick={handleAiPmDailyReport}>{aiPmCardWorking ? "Working..." : "Generate Status"}</Button> : null}
              <Link href={`/ai-pm?project=${params.id}`}><Button size="sm" className="bg-orange-500 hover:bg-orange-600">Open AI PM</Button></Link>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border bg-background/55 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="font-semibold text-sm">Discussion & Status</div>
                  <p className="text-xs text-muted-foreground mt-1">Team-facing updates from the assigned AI PM.</p>
                </div>
                <Badge className={projectPm?.status === "active" ? "bg-green-500/15 text-green-300" : "bg-secondary text-muted-foreground"}>{projectPm?.status === "active" ? "Active" : "Not active"}</Badge>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {latestPmUpdates.length > 0 ? latestPmUpdates.map((m: any) => {
                  const stamp = m.createdAt ? new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
                  return (
                    <div key={m._id} className="rounded-xl border border-border bg-secondary/30 px-3 py-3 text-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-orange-300">{projectPm?.name || "AI PM"}</span>
                        <span className="text-[11px] text-muted-foreground">{stamp}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">{m.message}</p>
                    </div>
                  );
                }) : (
                  <div className="rounded-xl border border-border bg-secondary/20 px-3 py-6 text-center text-sm text-muted-foreground">No AI PM status updates posted yet.</div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <Input
                  value={aiPmStatusPrompt}
                  onChange={(e) => setAiPmStatusPrompt(e.target.value)}
                  placeholder={projectPm ? `Ask ${projectPm.name} to post a team update...` : "Assign an AI PM to post status updates"}
                  disabled={!projectPm || aiPmCardWorking}
                  className="flex-1"
                />
                <Button disabled={!projectPm || aiPmCardWorking} onClick={handleAiPmStatusUpdate}>{aiPmCardWorking ? "Posting..." : "Post Update"}</Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-sm">Problems & Issues</div>
                    <p className="text-xs text-muted-foreground mt-1">AI PM problem reports that need attention.</p>
                  </div>
                  <Badge className={flaggedPmProblems.length ? "bg-red-500/15 text-red-300" : "bg-green-500/15 text-green-300"}>{flaggedPmProblems.length ? `${flaggedPmProblems.length} flagged` : "Clear"}</Badge>
                </div>
                <div className="space-y-2">
                  {flaggedPmProblems.length > 0 ? flaggedPmProblems.map((item: any) => (
                    <div key={item._id} className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-3 text-sm">
                      <div className="font-medium text-red-300">{item.description}</div>
                      {item.result ? <div className="text-xs text-muted-foreground mt-1">{item.result}</div> : null}
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-2">{item.status}</div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-4 text-sm text-green-300">No job problems reported by the AI PM right now.</div>
                  )}
                </div>
                <Input
                  value={aiPmProblemReport}
                  onChange={(e) => setAiPmProblemReport(e.target.value)}
                  placeholder="Type a problem for Director escalation..."
                  className="mt-3"
                />
              </div>

              <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-sm text-purple-200">Director Escalation & Action</div>
                    <p className="text-xs text-muted-foreground mt-1">PM reports problems to the Director, then the Director routes action to the assigned Admin.</p>
                  </div>
                  <Badge className={
                    adminEscalationState === "sent" ? "bg-green-500/15 text-green-300" :
                    adminEscalationState === "failed" ? "bg-red-500/15 text-red-300" :
                    adminEscalationState === "queued" || adminEscalationState === "director" ? "bg-amber-500/15 text-amber-300" :
                    "bg-secondary text-muted-foreground"
                  }>
                    {adminEscalationState === "sent" ? "Director notified" : adminEscalationState === "sending" ? "Sending" : adminEscalationState === "queued" ? "Admin action queued" : adminEscalationState === "director" ? "Director review" : adminEscalationState === "failed" ? "Email failed" : "Ready"}
                  </Badge>
                </div>
                <div className="rounded-xl border border-border bg-background/50 px-3 py-3 text-xs text-muted-foreground">
                  Admin target: {adminRecipient?.email ? `${adminRecipient.name || "Admin"} <${adminRecipient.email}>` : "No admin email found. The dashboard will mark the escalation for admin follow-up without pretending email was sent."}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="flex-1 border-purple-500/30" disabled={!projectPm} onClick={handleDirectorEscalation}>Report to Director</Button>
                  <Button className="flex-1" disabled={!projectPm || adminEscalationState === "sending"} onClick={handleNotifyAdmin}>{adminEscalationState === "sending" ? "Sending..." : adminRecipient?.email ? "Send to Admin" : "Mark Admin Follow-up"}</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border mb-6">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <h3 className="font-bold">📝 Field Notes & Daily Logs</h3>
              <p className="text-xs text-muted-foreground">
                {data.fieldNotes?.total || 0} field notes • {data.dailyLogs.total} daily logs • last log {data.dailyLogs.lastEntry || "none"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/daily-logs"><Button size="sm" variant="outline">View Logs</Button></Link>
              <Link href="/daily-logs"><Button size="sm">New Daily Log</Button></Link>
            </div>
          </div>
          {data.fieldNotes?.recent?.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-2">
              {data.fieldNotes.recent.map((note: any) => (
                <div key={String(note.id)} className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="text-sm line-clamp-2">{note.note}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {note.author || "Field"} • {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No field notes captured yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Module grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <ModuleCard icon="👷" title="Crew" href="/crew" stats={[{ label: "Active", value: data.crew.active }, { label: "Total", value: data.crew.total }]} />
        <ModuleCard icon="✅" title="Punch List" href="/punch-list" alert={data.punch.overdue > 0 ? `${data.punch.overdue} overdue` : undefined} stats={[{ label: "Open", value: data.punch.open, color: data.punch.open > 0 ? "text-yellow-400" : "" }, { label: "Complete", value: data.punch.complete, color: "text-green-400" }]} />
        <ModuleCard icon="🔄" title="Change Orders" href="/change-orders" alert={data.changeOrders.pending > 0 ? `${data.changeOrders.pending} pending` : undefined} stats={[{ label: "Pending", value: data.changeOrders.pending, color: "text-yellow-400" }, { label: "Approved", value: data.changeOrders.approved, color: "text-green-400" }]} />
        <ModuleCard icon="🦺" title="Safety" href="/safety" alert={data.safety.critical > 0 ? `${data.safety.critical} critical` : undefined} stats={[{ label: "Open", value: data.safety.open, color: data.safety.open > 0 ? "text-red-400" : "" }, { label: "Total", value: data.safety.total }]} />
        <ModuleCard icon="❓" title="RFIs" href="/rfis" alert={data.rfis.overdue > 0 ? `${data.rfis.overdue} overdue` : undefined} stats={[{ label: "Open", value: data.rfis.open, color: data.rfis.open > 0 ? "text-purple-400" : "" }, { label: "Total", value: data.rfis.total }]} />
        <ModuleCard icon="📋" title="Submittals" href="/submittals" stats={[{ label: "Pending", value: data.submittals.pending, color: data.submittals.pending > 0 ? "text-yellow-400" : "" }, { label: "Total", value: data.submittals.total }]} />
        <ModuleCard icon="⏱️" title="Time" href="/time-tracking" stats={[{ label: "Hours", value: data.time.totalHours.toFixed(0) }, { label: "Cost", value: fmt(data.time.totalCost), color: "text-green-400" }]} />
        <ModuleCard icon="💰" title="Budget" href="/budget" stats={[{ label: "Budgeted", value: fmt(data.budget.budgeted) }, { label: "Actual", value: fmt(data.budget.actual), color: data.budget.actual > data.budget.budgeted ? "text-red-400" : "text-green-400" }]} />
      </div>

      {/* Crew by Trade + Team Members + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Crew by Trade */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">👷 Crew by Trade</h3>
            {Object.entries(data.crew.byTrade as Record<string, number>).sort(([,a], [,b]) => (b as number) - (a as number)).map(([trade, count]) => (
              <div key={trade} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-sm">{trade}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-secondary rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${((count as number) / data.crew.active) * 100}%` }} /></div>
                  <span className="text-sm font-bold w-6 text-right">{count as number}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.crew.byTrade).length === 0 && <p className="text-sm text-muted-foreground">No crew assigned</p>}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Team Members</h3>
              <Link href="/team" className="text-xs text-primary hover:underline">View team</Link>
            </div>
            <div className="space-y-2">
              {data.teamMembers?.members?.map((member: TeamMemberSummary) => (
                <div key={member.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{formatRole(String(member.role || "team"))}</p>
                  </div>
                  <Badge variant={member.status === "active" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                    {member.status}
                  </Badge>
                </div>
              ))}
              {(!data.teamMembers?.members || data.teamMembers.members.length === 0) && <p className="text-sm text-muted-foreground">No team members assigned</p>}
            </div>
            {(data.teamMembers?.total || 0) > (data.teamMembers?.shown || 0) && (
              <p className="text-xs text-muted-foreground mt-3">{data.teamMembers.total - data.teamMembers.shown} more on this project</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">📡 Recent Activity</h3>
            <div className="space-y-2">
              {data.activity.map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
                  <span className="text-sm mt-0.5">
                    {a.type === "punch" ? "✅" : a.type === "co" ? "🔄" : a.type === "incident" ? "🦺" : "❓"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.time).toLocaleDateString()}</p>
                  </div>
                  {a.severity && <Badge variant="destructive" className="text-[10px]">{a.severity}</Badge>}
                </div>
              ))}
              {data.activity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weather alerts */}
      {data.weatherAlerts.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30 mt-4">
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">⛅ Weather Alerts</h3>
            {data.weatherAlerts.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1">
                <span>{a.severity === "critical" ? "🔴" : a.severity === "warning" ? "🟡" : "🟢"}</span>
                <span>{a.type}: {a.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Communications */}
      <Card className="bg-card border-border mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">💬 Communications</h3>
            <div className="flex items-center gap-2">
              {data.emails?.unread > 0 && (
                <Badge variant="destructive" className="text-xs">{data.emails.unread} unread</Badge>
              )}
              <span className="text-xs text-muted-foreground">{data.emails?.total || 0} total</span>
            </div>
          </div>
          {data.emails?.recent?.length > 0 ? (
            <div className="space-y-2">
              {data.emails.recent.map((e: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 py-2 px-3 rounded-lg border ${!e.isRead ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!e.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      <span className="text-sm font-medium truncate">{e.subject || "(No Subject)"}</span>
                      {e.aiTone && (
                        <Badge variant="outline" className={`text-[9px] shrink-0 ${
                          String(e.aiTone) === "collaborative" ? "text-green-400" :
                          String(e.aiTone) === "tense" || String(e.aiTone) === "adversarial" ? "text-red-400" :
                          "text-muted-foreground"
                        }`}>{String(e.aiTone)}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{e.from}</span>
                      <span>•</span>
                      <span className="shrink-0">{e.date}</span>
                    </div>
                    {e.bodyPreview && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{e.bodyPreview}</p>}
                  </div>
                  {Array.isArray(e.aiRiskFlags) && e.aiRiskFlags.length > 0 && (
                    <Badge variant="destructive" className="text-[9px] shrink-0">{"⚠️ " + e.aiRiskFlags.length + " risk"}</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No emails linked to this project. Assign emails in Correspondence → set project.</p>
          )}
          {(data.emails?.total || 0) > 0 && (
            <div className="mt-3 text-center">
              <a href="/correspondence" className="text-xs text-primary hover:underline">View all correspondence →</a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectDashboardPage() { return <AppShell><ProjectDashboardContent /></AppShell>; }
