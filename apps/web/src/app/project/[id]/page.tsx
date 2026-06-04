"use client";
import { useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { BillingOpsBooksPanel } from "@/components/billing-ops-books-panel";
import { EstimateRequirementsPanel } from "@/components/estimate-requirements-panel";
import { ScheduleIntelligencePanel } from "@/components/schedule-intelligence-panel";
import { SpecIntelligenceCommandCenter } from "@/components/spec-intelligence-command-center";
import { SpecDNAPanel } from "@/components/spec-dna-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
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

type ProjectDetailsFormState = {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  projectManager: string;
  contractor: string;
  projectRole: string;
  type: string;
  startDate: string;
  endDate: string;
  bidDateTime: string;
  status: string;
  contractValue: string;
};

type ProjectTeamMemberFormState = {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
};

type DropdownProjectDetailsField = "contractor" | "projectRole" | "type" | "status";

const PROJECT_DETAIL_DROPDOWN_STORAGE_KEY = "opsslate-project-detail-dropdown-options";
const PROJECT_CODE_STORAGE_KEY = "opsslate-project-codes";

const PROJECT_ROLE_DEFAULTS = ["Owner", "Project Manager", "Engineer", "Estimator"];
const PROJECT_STATUS_DEFAULTS = ["Active", "Bid", "On Hold", "Complete"];
const PROJECT_TYPE_DEFAULTS = ["Civil/Infrastructure", "Commercial", "Industrial", "EV Charging"];
const CONTRACTOR_DEFAULTS: string[] = [];

const emptyProjectDetailsForm: ProjectDetailsFormState = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  projectManager: "",
  contractor: "",
  projectRole: "",
  type: "",
  startDate: "",
  endDate: "",
  bidDateTime: "",
  status: "",
  contractValue: "",
};

function uniqueValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function readStoredProjectDetailOptions(): Partial<Record<DropdownProjectDetailsField, string[]>> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECT_DETAIL_DROPDOWN_STORAGE_KEY) || "{}");
    return {
      contractor: Array.isArray(parsed.contractor) ? parsed.contractor : [],
      projectRole: Array.isArray(parsed.projectRole) ? parsed.projectRole : [],
      type: Array.isArray(parsed.type) ? parsed.type : [],
      status: Array.isArray(parsed.status) ? parsed.status : [],
    };
  } catch {
    return {};
  }
}

function saveStoredProjectDetailOptions(options: Partial<Record<DropdownProjectDetailsField, string[]>>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECT_DETAIL_DROPDOWN_STORAGE_KEY, JSON.stringify(options));
}

function readStoredProjectCodes() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECT_CODE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function rememberProjectCode(code: string) {
  const cleanCode = code.trim();
  if (!cleanCode || typeof window === "undefined") return;
  const codes = uniqueValues([...readStoredProjectCodes(), cleanCode]);
  window.localStorage.setItem(PROJECT_CODE_STORAGE_KEY, JSON.stringify(codes));
}

function generateProjectCode(existingCodes: string[] = []) {
  const prefix = String(new Date().getFullYear()).slice(-2);
  const used = new Set(uniqueValues([...existingCodes, ...readStoredProjectCodes()]));
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const suffix = Math.floor(10000 + Math.random() * 90000);
    const candidate = `${prefix}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}-${String(Date.now()).slice(-5)}`;
}

function ProjectDetailSelectField({
  id,
  label,
  value,
  options,
  customOpen,
  placeholder,
  customPlaceholder,
  onSelect,
  onCustomChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  customOpen: boolean;
  placeholder?: string;
  customPlaceholder: string;
  onSelect: (value: string) => void;
  onCustomChange: (value: string) => void;
}) {
  const cleanOptions = uniqueValues(options);
  const selectedValue = customOpen ? "__other__" : cleanOptions.includes(value) ? value : value ? value : "";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={selectedValue}
        onChange={(e) => onSelect(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      >
        {placeholder && <option value="" className="text-black">{placeholder}</option>}
        {cleanOptions.map((option) => (
          <option key={option} value={option} className="text-black">{option}</option>
        ))}
        <option value="__other__" className="text-black">Other</option>
      </select>
      {customOpen && (
        <Input
          id={`${id}-other`}
          value={value}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder={customPlaceholder}
        />
      )}
    </div>
  );
}

const emptyProjectTeamMemberForm: ProjectTeamMemberFormState = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  email: "",
};

function getProjectDetailsForm(project: Partial<Doc<"projects">> | null | undefined): ProjectDetailsFormState {
  return {
    name: project?.name || "",
    code: project?.code || "",
    address: project?.address || "",
    city: project?.city || "",
    state: project?.state || "",
    zip: project?.zip || "",
    projectManager: project?.projectManager || "",
    contractor: project?.contractor || "",
    projectRole: project?.projectRole || "",
    type: project?.type || "",
    startDate: project?.startDate || "",
    endDate: project?.endDate || "",
    bidDateTime: project?.contractDate || "",
    status: project?.status || "",
    contractValue: typeof project?.contractValue === "number" ? String(project.contractValue) : "",
  };
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function clientGeocodeProjectAddress(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const response = await fetch(url, { headers: { "Accept-Language": "en-US,en;q=0.9" } });
  if (!response.ok) throw new Error("Address geocoding failed.");
  const data = await response.json();
  const match = Array.isArray(data) ? data[0] : null;
  const latitude = match ? Number(match.lat) : NaN;
  const longitude = match ? Number(match.lon) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Project address could not be geocoded.");
  }
  return { latitude, longitude };
}

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
  const router = useRouter();
  const { user } = useAuth();
  const data = useQuery(
    api.projectDashboard.getProjectOverview,
    params.id && user ? { projectId: params.id as Id<"projects">, companyId: user.companyId } : "skip",
  ) as any;
  const projectPm = data?.aiPm as any | null | undefined;
  const projectPmMessages = useQuery(api.aiPm.getMessages, projectPm?.id ? { pmId: projectPm.id as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;
  const projectPmTasks = useQuery(api.aiPm.getTasks, projectPm?.id ? { pmId: projectPm.id as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;
  const teamMembers = useQuery(api.team.list, user?.companyId ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  const allProjects = useQuery(api.projects.list, user?.companyId ? { companyId: user.companyId as Id<"companies"> } : "skip") as Doc<"projects">[] | undefined;
  const projectTeamMembers = useQuery(
    api.contacts.list,
    params.id && user ? { projectId: params.id as Id<"projects"> } : "skip",
  ) as Doc<"contacts">[] | undefined;
  const chatWithPm = useAction(api.aiPmEngine.chat as any);
  const generatePmReport = useAction(api.aiPmEngine.dailyReport as any);
  const sendEmail = useAction(api.sendEmail.send as any);
  const analyzeWeatherMultiSource = useAction(api.weather.analyzeWeatherMultiSource as any);
  const geocodeProjectAddress = useAction(api.weather.geocodeAndSave as any);
  const updateProject = useMutation(api.projects.update);
  const archiveProject = useMutation(api.projects.archive);
  const removeProject = useMutation((api as any).projects.remove);
  const createProjectTeamMember = useMutation(api.contacts.create);
  const updateProjectTeamMember = useMutation(api.contacts.update);
  const removeProjectTeamMember = useMutation(api.contacts.remove);
  const [aiPmStatusPrompt, setAiPmStatusPrompt] = useState("");
  const [aiPmProblemReport, setAiPmProblemReport] = useState("");
  const [aiPmCardWorking, setAiPmCardWorking] = useState(false);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [projectDetailsForm, setProjectDetailsForm] = useState<ProjectDetailsFormState>(emptyProjectDetailsForm);
  const [projectDetailsCustomFields, setProjectDetailsCustomFields] = useState<Partial<Record<DropdownProjectDetailsField, boolean>>>({});
  const [storedProjectDetailOptions, setStoredProjectDetailOptions] = useState<Partial<Record<DropdownProjectDetailsField, string[]>>>({});
  const [projectDetailsSaving, setProjectDetailsSaving] = useState(false);
  const [projectDetailsError, setProjectDetailsError] = useState<string | null>(null);
  const [projectTeamOpen, setProjectTeamOpen] = useState(false);
  const [editingProjectTeamMember, setEditingProjectTeamMember] = useState<Doc<"contacts"> | null>(null);
  const [projectTeamForm, setProjectTeamForm] = useState<ProjectTeamMemberFormState>(emptyProjectTeamMemberForm);
  const [projectTeamSaving, setProjectTeamSaving] = useState(false);
  const [projectTeamError, setProjectTeamError] = useState<string | null>(null);
  const [bidInvitationSendingId, setBidInvitationSendingId] = useState<string | null>(null);
  const [bidInvitationStatus, setBidInvitationStatus] = useState<Record<string, "sent" | "failed">>({});
  const [adminEscalationState, setAdminEscalationState] = useState<"idle" | "director" | "sending" | "sent" | "queued" | "failed">("idle");
  const [weatherMonitor, setWeatherMonitor] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [selectedWeatherRecipientIds, setSelectedWeatherRecipientIds] = useState<string[]>([]);
  const [weatherAlertState, setWeatherAlertState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    setStoredProjectDetailOptions(readStoredProjectDetailOptions());
  }, []);

  const project = data?.project || {};
  const projectDetailsSeed = useMemo(() => getProjectDetailsForm(project), [
    project?._id,
    project?.name,
    project?.code,
    project?.address,
    project?.city,
    project?.state,
    project?.zip,
    project?.projectManager,
    project?.contractor,
    project?.projectRole,
    project?.type,
    project?.startDate,
    project?.endDate,
    project?.contractDate,
    project?.status,
    project?.contractValue,
  ]);
  const existingProjectCodes = useMemo(() => uniqueValues((allProjects || []).map((item) => item.code)), [allProjects]);
  const projectDetailDropdownOptions = useMemo(() => ({
    contractor: uniqueValues([
      ...CONTRACTOR_DEFAULTS,
      ...(allProjects || []).map((item) => item.contractor),
      ...(storedProjectDetailOptions.contractor || []),
      projectDetailsForm.contractor,
      project?.contractor,
    ]),
    projectRole: uniqueValues([
      ...PROJECT_ROLE_DEFAULTS,
      ...(allProjects || []).map((item) => item.projectRole),
      ...(storedProjectDetailOptions.projectRole || []),
      projectDetailsForm.projectRole,
      project?.projectRole,
    ]),
    type: uniqueValues([
      ...PROJECT_TYPE_DEFAULTS,
      ...(allProjects || []).map((item) => item.type),
      ...(storedProjectDetailOptions.type || []),
      projectDetailsForm.type,
      project?.type,
    ]),
    status: uniqueValues([
      ...PROJECT_STATUS_DEFAULTS,
      ...(allProjects || []).map((item) => item.status),
      ...(storedProjectDetailOptions.status || []),
      projectDetailsForm.status,
      project?.status,
    ]),
  }), [
    allProjects,
    project?.contractor,
    project?.projectRole,
    project?.type,
    project?.status,
    projectDetailsForm.contractor,
    projectDetailsForm.projectRole,
    projectDetailsForm.type,
    projectDetailsForm.status,
    storedProjectDetailOptions,
  ]);
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

  useEffect(() => {
    if (!project?._id || projectDetailsOpen) return;
    setProjectDetailsForm(projectDetailsSeed);
  }, [project?._id, projectDetailsOpen, projectDetailsSeed]);

  const locationText = [project.address, project.city || project.location, project.state, project.zip].filter(Boolean).join(", ");
  const addressForWeather = [project.address || project.location, project.city, project.state, project.zip].filter(Boolean).join(", ");

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

  useEffect(() => {
    const currentProject = project;
    if (!currentProject?._id) {
      setWeatherMonitor(null);
      return;
    }

    let cancelled = false;
    async function loadProjectWeather() {
      let latitude = typeof currentProject.latitude === "number" ? currentProject.latitude : null;
      let longitude = typeof currentProject.longitude === "number" ? currentProject.longitude : null;

      if ((latitude === null || longitude === null) && addressForWeather) {
        const geocoded = await geocodeProjectAddress({
          projectId: currentProject._id as Id<"projects">,
          address: addressForWeather,
        }).catch(() => null);
        if (geocoded?.success && typeof geocoded.latitude === "number" && typeof geocoded.longitude === "number") {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        } else {
          const browserGeocoded = await clientGeocodeProjectAddress(addressForWeather);
          latitude = browserGeocoded.latitude;
          longitude = browserGeocoded.longitude;
          await updateProject({
            id: currentProject._id as Id<"projects">,
            latitude,
            longitude,
          });
        }
      }

      if (latitude === null || longitude === null) {
        if (!cancelled) setWeatherMonitor(null);
        return;
      }

      const result = await analyzeWeatherMultiSource({ latitude, longitude });
      if (!cancelled) setWeatherMonitor(result);
    }

    setWeatherLoading(true);
    setWeatherError(null);
    loadProjectWeather()
      .catch((err: Error) => {
        if (!cancelled) {
          setWeatherMonitor(null);
          setWeatherError(err.message || "Weather check failed");
        }
      })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [
    addressForWeather,
    analyzeWeatherMultiSource,
    project?._id,
    project?.latitude,
    project?.longitude,
    geocodeProjectAddress,
    updateProject,
  ]);

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
  const directionsUrl = locationText ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationText)}` : "";
  const mapUrl = locationText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}` : "";
  const projectLocationMessage = locationText
    ? `${project.name || "Project"} location: ${locationText}${directionsUrl ? ` ${directionsUrl}` : ""}`
    : `${project.name || "Project"} location has not been set yet.`;
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

  const openProjectDetailsEditor = () => {
    const nextForm = getProjectDetailsForm(project);
    if (!nextForm.code) nextForm.code = generateProjectCode(existingProjectCodes);
    setProjectDetailsForm(nextForm);
    setProjectDetailsCustomFields({});
    setProjectDetailsError(null);
    setProjectDetailsOpen(true);
  };

  const updateProjectDetailsField = (field: keyof ProjectDetailsFormState, value: string) => {
    setProjectDetailsForm((current) => ({ ...current, [field]: value }));
    if (projectDetailsError) setProjectDetailsError(null);
  };

  const updateProjectDetailsDropdown = (field: DropdownProjectDetailsField, value: string) => {
    if (value === "__other__") {
      setProjectDetailsCustomFields((current) => ({ ...current, [field]: true }));
      setProjectDetailsForm((current) => ({ ...current, [field]: "" }));
    } else {
      setProjectDetailsCustomFields((current) => ({ ...current, [field]: false }));
      updateProjectDetailsField(field, value);
    }
  };

  const updateProjectDetailsCustomDropdown = (field: DropdownProjectDetailsField, value: string) => {
    setProjectDetailsCustomFields((current) => ({ ...current, [field]: true }));
    updateProjectDetailsField(field, value);
  };

  const persistProjectDetailsDropdownValues = (values: ProjectDetailsFormState) => {
    const current = readStoredProjectDetailOptions();
    const next = {
      contractor: uniqueValues([...(current.contractor || []), values.contractor]),
      projectRole: uniqueValues([...(current.projectRole || []), values.projectRole]),
      type: uniqueValues([...(current.type || []), values.type]),
      status: uniqueValues([...(current.status || []), values.status]),
    };
    saveStoredProjectDetailOptions(next);
    setStoredProjectDetailOptions(next);
  };

  const updateProjectTeamField = (field: keyof ProjectTeamMemberFormState, value: string) => {
    setProjectTeamForm((current) => ({ ...current, [field]: value }));
    if (projectTeamError) setProjectTeamError(null);
  };

  const openProjectTeamMemberEditor = (member?: Doc<"contacts">) => {
    setEditingProjectTeamMember(member || null);
    setProjectTeamForm(member ? {
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      company: member.company || "",
      phone: member.phone || "",
      email: member.email || "",
    } : emptyProjectTeamMemberForm);
    setProjectTeamError(null);
    setProjectTeamOpen(true);
  };

  const handleSaveProjectDetails = async () => {
    if (!project?._id) return;
    const name = projectDetailsForm.name.trim();
    if (!name) {
      setProjectDetailsError("Project name is required.");
      return;
    }
    if (projectDetailsForm.status === "Bid" && !projectDetailsForm.bidDateTime) {
      setProjectDetailsError("Bid date and time is required when status is Bid.");
      return;
    }
    setProjectDetailsSaving(true);
    setProjectDetailsError(null);
    try {
      const projectCode = projectDetailsForm.code.trim() || generateProjectCode(existingProjectCodes);
      await updateProject({
        id: project._id as Id<"projects">,
        name,
        code: projectCode,
        address: projectDetailsForm.address.trim() || undefined,
        city: projectDetailsForm.city.trim() || undefined,
        state: projectDetailsForm.state.trim() || undefined,
        zip: projectDetailsForm.zip.trim() || undefined,
        projectManager: projectDetailsForm.projectManager.trim() || undefined,
        contractor: projectDetailsForm.contractor.trim() || undefined,
        projectRole: projectDetailsForm.projectRole.trim() || undefined,
        type: projectDetailsForm.type.trim() || undefined,
        startDate: projectDetailsForm.startDate || undefined,
        endDate: projectDetailsForm.endDate || undefined,
        contractDate: projectDetailsForm.status === "Bid" ? projectDetailsForm.bidDateTime : "",
        status: projectDetailsForm.status.trim() || undefined,
        contractValue: optionalNumber(projectDetailsForm.contractValue),
      });
      rememberProjectCode(projectCode);
      persistProjectDetailsDropdownValues({ ...projectDetailsForm, code: projectCode });
      setProjectDetailsOpen(false);
    } catch (error) {
      setProjectDetailsError(error instanceof Error ? error.message : "Project details could not be saved.");
    } finally {
      setProjectDetailsSaving(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!project?._id) return;
    const confirmed = window.confirm("Archive this project? It will be removed from normal project lists, but the project data will be saved for later use.");
    if (!confirmed) return;
    await archiveProject({ id: project._id as Id<"projects"> });
    router.replace("/");
  };

  const handleDeleteProject = async () => {
    if (!project?._id) return;
    const confirmed = window.confirm("Delete this project permanently? This removes the project from OpsSlate. Use Archive if you want to save it for later.");
    if (!confirmed) return;
    await removeProject({ id: project._id as Id<"projects"> });
    router.replace("/");
  };

  const handleSaveProjectTeamMember = async () => {
    const firstName = projectTeamForm.firstName.trim();
    if (!firstName) {
      setProjectTeamError("First name is required.");
      return;
    }
    setProjectTeamSaving(true);
    setProjectTeamError(null);
    try {
      const values = {
        firstName,
        lastName: projectTeamForm.lastName.trim() || undefined,
        company: projectTeamForm.company.trim() || undefined,
        phone: projectTeamForm.phone.trim() || undefined,
        email: projectTeamForm.email.trim() || undefined,
      };
      if (editingProjectTeamMember) {
        await updateProjectTeamMember({
          id: editingProjectTeamMember._id,
          ...values,
        });
      } else {
        await createProjectTeamMember({
          projectId: params.id as Id<"projects">,
          ...values,
          role: "Project Team",
          status: "Active",
        });
      }
      setProjectTeamForm(emptyProjectTeamMemberForm);
      setEditingProjectTeamMember(null);
      setProjectTeamOpen(false);
    } catch (error) {
      setProjectTeamError(error instanceof Error ? error.message : "Project team member could not be saved.");
    } finally {
      setProjectTeamSaving(false);
    }
  };

  const getSmsHref = (phone: string) => {
    const smsPhone = phone.replace(/[^\d+]/g, "");
    return smsPhone ? `sms:${smsPhone}?body=${encodeURIComponent(projectLocationMessage)}` : "";
  };

  const handleTextProjectLocation = async (phone?: string) => {
    if (!phone) return;
    const smsHref = getSmsHref(phone);
    if (!smsHref) return;
    try {
      await navigator.clipboard.writeText(projectLocationMessage);
    } catch {
      // Clipboard can be blocked by browser permissions; still try the SMS app.
    }
    window.location.href = smsHref;
  };

  const handleInviteToBid = async (member: Doc<"contacts">) => {
    if (!user?.companyId || !member.email || bidInvitationSendingId) return;
    const memberName = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.company || "there";
    const projectName = project.name || "this project";
    const body = [
      `Hi ${memberName},`,
      "",
      `You are invited to bid ${projectName}.`,
      locationText ? `Project location: ${locationText}` : "",
      directionsUrl ? `Directions: ${directionsUrl}` : "",
      project.contractDate && project.status === "Bid" ? `Bid date/time: ${formatDateTime(project.contractDate)}` : "",
      project.projectManager ? `Project manager: ${project.projectManager}` : "",
      "",
      "Please review the project information and reply with your bid questions, availability, and proposal.",
      "",
      "Thank you.",
    ].filter(Boolean).join("\n");

    const memberId = String(member._id);
    setBidInvitationSendingId(memberId);
    setBidInvitationStatus((current) => {
      const next = { ...current };
      delete next[memberId];
      return next;
    });
    try {
      await sendEmail({
        companyId: String(user.companyId),
        to: member.email,
        subject: `Invitation to Bid: ${projectName}`,
        body,
        projectId: String(project._id || params.id || ""),
        senderName: user.name || "OpsSlate",
      });
      setBidInvitationStatus((current) => ({ ...current, [memberId]: "sent" }));
    } catch {
      setBidInvitationStatus((current) => ({ ...current, [memberId]: "failed" }));
    } finally {
      setBidInvitationSendingId(null);
    }
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

      {/* Project details */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-sm">Project Details</h3>
            <p className="text-xs text-muted-foreground mt-1">Location and baseline job info</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" type="button" onClick={openProjectDetailsEditor} className="h-8 px-3">
            <Pencil className="size-3.5" />
            Edit
            </Button>
            {project.status && <Badge variant="outline" className="text-[10px]">{project.status}</Badge>}
          </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          {[
            ["Address", locationText],
            ["Code", project.code],
            ["Manager", project.projectManager],
            ["Contractor", project.contractor],
            ["Project Role", project.projectRole],
            ["Type", project.type],
            ["Start", project.startDate],
            ["End", project.endDate],
            ["Bid Date/Time", project.status === "Bid" ? formatDateTime(project.contractDate) : ""],
            ["Contract Value", typeof project.contractValue === "number" ? fmt(project.contractValue) : ""],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label as string} className="min-w-0">
            <div className="text-[10px] uppercase text-muted-foreground">{label as string}</div>
            <div className="font-medium truncate">{value as string}</div>
            </div>
          ))}
          {!locationText && !project.code && !project.projectManager && !project.contractor && !project.projectRole && !project.type && !project.contractDate && !project.contractValue && (
            <p className="text-sm text-muted-foreground col-span-2 md:col-span-4">No project details recorded yet.</p>
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
          <Dialog open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
            <DialogTitle>Edit Project Details</DialogTitle>
            <DialogDescription>Add or update the baseline information used across this project.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input id="project-name" value={projectDetailsForm.name} onChange={(e) => updateProjectDetailsField("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-code">Project code</Label>
              <div className="flex gap-2">
                <Input id="project-code" value={projectDetailsForm.code} onChange={(e) => updateProjectDetailsField("code", e.target.value)} placeholder="Auto-generated" />
                <Button type="button" variant="outline" onClick={() => updateProjectDetailsField("code", generateProjectCode(existingProjectCodes))}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="project-address">Address</Label>
              <Input id="project-address" value={projectDetailsForm.address} onChange={(e) => updateProjectDetailsField("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-city">City</Label>
              <Input id="project-city" value={projectDetailsForm.city} onChange={(e) => updateProjectDetailsField("city", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
              <Label htmlFor="project-state">State</Label>
              <Input id="project-state" value={projectDetailsForm.state} onChange={(e) => updateProjectDetailsField("state", e.target.value)} />
              </div>
              <div className="space-y-2">
              <Label htmlFor="project-zip">ZIP</Label>
              <Input id="project-zip" value={projectDetailsForm.zip} onChange={(e) => updateProjectDetailsField("zip", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-manager">Project manager</Label>
              <Input id="project-manager" value={projectDetailsForm.projectManager} onChange={(e) => updateProjectDetailsField("projectManager", e.target.value)} />
            </div>
            <ProjectDetailSelectField
              id="project-contractor"
              label="Contractor"
              value={projectDetailsForm.contractor}
              options={projectDetailDropdownOptions.contractor}
              placeholder="Select contractor..."
              customOpen={Boolean(projectDetailsCustomFields.contractor)}
              customPlaceholder="Enter contractor..."
              onSelect={(value) => updateProjectDetailsDropdown("contractor", value)}
              onCustomChange={(value) => updateProjectDetailsCustomDropdown("contractor", value)}
            />
            <ProjectDetailSelectField
              id="project-role"
              label="Project role"
              value={projectDetailsForm.projectRole}
              options={projectDetailDropdownOptions.projectRole}
              placeholder="Select role..."
              customOpen={Boolean(projectDetailsCustomFields.projectRole)}
              customPlaceholder="Enter project role..."
              onSelect={(value) => updateProjectDetailsDropdown("projectRole", value)}
              onCustomChange={(value) => updateProjectDetailsCustomDropdown("projectRole", value)}
            />
            <ProjectDetailSelectField
              id="project-type"
              label="Project type"
              value={projectDetailsForm.type}
              options={projectDetailDropdownOptions.type}
              placeholder="Select project type..."
              customOpen={Boolean(projectDetailsCustomFields.type)}
              customPlaceholder="Enter project type..."
              onSelect={(value) => updateProjectDetailsDropdown("type", value)}
              onCustomChange={(value) => updateProjectDetailsCustomDropdown("type", value)}
            />
            <ProjectDetailSelectField
              id="project-status"
              label="Status"
              value={projectDetailsForm.status || "Active"}
              options={projectDetailDropdownOptions.status}
              customOpen={Boolean(projectDetailsCustomFields.status)}
              customPlaceholder="Enter status..."
              onSelect={(value) => updateProjectDetailsDropdown("status", value)}
              onCustomChange={(value) => updateProjectDetailsCustomDropdown("status", value)}
            />
            {projectDetailsForm.status === "Bid" && (
              <div className="space-y-2">
                <Label htmlFor="project-bid-date-time">Bid date and time</Label>
                <Input id="project-bid-date-time" type="datetime-local" value={projectDetailsForm.bidDateTime} onChange={(e) => updateProjectDetailsField("bidDateTime", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="project-start">Start date</Label>
              <Input id="project-start" type="date" value={projectDetailsForm.startDate} onChange={(e) => updateProjectDetailsField("startDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-end">End date</Label>
              <Input id="project-end" type="date" value={projectDetailsForm.endDate} onChange={(e) => updateProjectDetailsField("endDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-contract-value">Contract value</Label>
              <Input id="project-contract-value" type="number" min="0" step="0.01" value={projectDetailsForm.contractValue} onChange={(e) => updateProjectDetailsField("contractValue", e.target.value)} />
            </div>
            </div>
            {projectDetailsError && <p className="text-sm text-destructive">{projectDetailsError}</p>}
            <DialogFooter>
            <Button type="button" variant="outline" disabled={projectDetailsSaving} onClick={handleArchiveProject}>Archive project</Button>
            <Button type="button" variant="destructive" disabled={projectDetailsSaving} onClick={handleDeleteProject}>Delete project</Button>
            <Button type="button" variant="outline" disabled={projectDetailsSaving} onClick={() => setProjectDetailsOpen(false)}>Cancel</Button>
            <Button type="button" disabled={projectDetailsSaving} onClick={handleSaveProjectDetails}>{projectDetailsSaving ? "Saving..." : "Save Project Details"}</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </CardContent>
        </Card>


      {/* Project team member contacts */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-sm">Project Team Members</h3>
              <p className="text-xs text-muted-foreground mt-1">Project contact cards for people working this job.</p>
            </div>
            <Button size="sm" type="button" onClick={() => openProjectTeamMemberEditor()} className="h-8 px-3">
              <Plus className="size-3.5" />
              Add member
            </Button>
          </div>

          {projectTeamMembers === undefined ? (
            <p className="text-sm text-muted-foreground">Loading project team members...</p>
          ) : projectTeamMembers.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {projectTeamMembers.map((member) => {
                const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
                const smsHref = member.phone ? getSmsHref(member.phone) : "";
                const emailHref = member.email ? `mailto:${member.email}?subject=${encodeURIComponent(`${project.name || "Project"} location`)}&body=${encodeURIComponent(projectLocationMessage)}` : "";
                const bidInviteStatus = bidInvitationStatus[String(member._id)];
                const bidInviteSending = bidInvitationSendingId === String(member._id);
                return (
                  <div key={member._id} className="rounded-xl border border-border bg-secondary/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{name || "Unnamed team member"}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.company || "Company not set"}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-xs">
                      {member.phone ? (
                        <a href={`tel:${member.phone}`} className="flex min-w-0 items-center gap-2 text-muted-foreground hover:text-primary">
                          <Phone className="size-3.5 shrink-0" />
                          <span className="truncate">{member.phone}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground/70">
                          <Phone className="size-3.5 shrink-0" />
                          <span>No phone number</span>
                        </div>
                      )}
                      {member.email ? (
                        <a href={`mailto:${member.email}`} className="flex min-w-0 items-center gap-2 text-muted-foreground hover:text-primary">
                          <Mail className="size-3.5 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground/70">
                          <Mail className="size-3.5 shrink-0" />
                          <span>No email address</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button size="sm" type="button" variant="outline" className="h-8 justify-start px-2 text-xs" onClick={() => openProjectTeamMemberEditor(member)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button size="sm" type="button" variant="outline" className="h-8 justify-start px-2 text-xs" onClick={() => removeProjectTeamMember({ id: member._id })}>
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                      {smsHref ? (
                        <Button size="sm" type="button" variant="outline" className="h-8 justify-start px-2 text-xs" onClick={() => handleTextProjectLocation(member.phone)}>
                          <Phone className="size-3.5" />
                          Text location
                        </Button>
                      ) : (
                        <Button size="sm" type="button" variant="outline" disabled className="h-8 justify-start px-2 text-xs">
                          <Phone className="size-3.5" />
                          Text location
                        </Button>
                      )}
                      {emailHref ? (
                        <Button asChild size="sm" variant="outline" className="h-8 w-full justify-start px-2 text-xs">
                          <a href={emailHref}>
                            <Mail className="size-3.5" />
                            Send email
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" type="button" variant="outline" disabled className="h-8 justify-start px-2 text-xs">
                          <Mail className="size-3.5" />
                          Send email
                        </Button>
                      )}
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        type="button"
                        variant="secondary"
                        disabled={!member.email || bidInvitationSendingId !== null}
                        className="h-8 w-full justify-start px-2 text-xs"
                        onClick={() => handleInviteToBid(member)}
                      >
                        <Mail className="size-3.5" />
                        {bidInviteSending ? "Sending invite..." : "Invite to Bid"}
                      </Button>
                      {bidInviteStatus === "sent" && <p className="mt-1 text-xs text-green-400">Bid invitation sent.</p>}
                      {bidInviteStatus === "failed" && <p className="mt-1 text-xs text-red-400">Bid invitation failed.</p>}
                      {!member.email && <p className="mt-1 text-xs text-muted-foreground">Add an email to send bid invites.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No project team members added yet.</p>
          )}

          <Dialog open={projectTeamOpen} onOpenChange={(open) => {
            setProjectTeamOpen(open);
            if (!open) {
              setEditingProjectTeamMember(null);
              setProjectTeamForm(emptyProjectTeamMemberForm);
              setProjectTeamError(null);
            }
          }}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProjectTeamMember ? "Edit Project Team Member" : "Add Project Team Member"}</DialogTitle>
                <DialogDescription>Create a project contact card with the key team member details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="project-team-first-name">First name</Label>
                  <Input id="project-team-first-name" value={projectTeamForm.firstName} onChange={(e) => updateProjectTeamField("firstName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-team-last-name">Last name</Label>
                  <Input id="project-team-last-name" value={projectTeamForm.lastName} onChange={(e) => updateProjectTeamField("lastName", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project-team-company">Company</Label>
                  <Input id="project-team-company" value={projectTeamForm.company} onChange={(e) => updateProjectTeamField("company", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-team-phone">Contact phone Number</Label>
                  <Input id="project-team-phone" value={projectTeamForm.phone} onChange={(e) => updateProjectTeamField("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-team-email">Email address</Label>
                  <Input id="project-team-email" type="email" value={projectTeamForm.email} onChange={(e) => updateProjectTeamField("email", e.target.value)} />
                </div>
              </div>
              {projectTeamError && <p className="text-sm text-destructive">{projectTeamError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={projectTeamSaving} onClick={() => setProjectTeamOpen(false)}>Cancel</Button>
                <Button type="button" disabled={projectTeamSaving} onClick={handleSaveProjectTeamMember}>{projectTeamSaving ? "Saving..." : editingProjectTeamMember ? "Update Team Member" : "Save Team Member"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {params.id && (
        <SpecIntelligenceCommandCenter projectId={params.id as Id<"projects">} />
      )}

      {user?.companyId && params.id && (
        <SpecDNAPanel
          companyId={user.companyId}
          projectId={params.id as Id<"projects">}
          userName={user.name}
          projectRole={project.projectRole}
        />
      )}

      {params.id && (
        <ScheduleIntelligencePanel projectId={params.id as Id<"projects">} />
      )}

      {params.id && (
        <EstimateRequirementsPanel projectId={params.id as Id<"projects">} />
      )}

      {params.id && (
        <BillingOpsBooksPanel projectId={params.id as Id<"projects">} />
      )}

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
        <ModuleCard icon="❓" title="RFIs" href={`/rfis?projectId=${params.id}`} alert={data.rfis.overdue > 0 ? `${data.rfis.overdue} overdue` : undefined} stats={[{ label: "Open", value: data.rfis.open, color: data.rfis.open > 0 ? "text-purple-400" : "" }, { label: "Total", value: data.rfis.total }]} />
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
