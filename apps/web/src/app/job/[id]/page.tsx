"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";
import { CrudModal, FieldDef } from "@/components/crud-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractorSearchModal } from "@/components/contractor-search";
import { detectTradeAndRole } from "@/lib/trade-detect";
import { useAuth } from "@/lib/auth-context";
import { ScopeOfWorkModal } from "@/components/scope-of-work";
import { CallTranscriberModal } from "@/components/call-transcriber";
import { TaskPanel } from "@/components/task-panel";

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <p className={`text-xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function detectDocCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.match(/contract|agreement|aia/)) return "Contract";
  if (n.match(/insurance|cert|coi|bond/)) return "Insurance";
  if (n.match(/permit|license/)) return "Permits";
  if (n.match(/drawing|plan|blueprint|dwg/)) return "Drawings";
  if (n.match(/spec|specification/)) return "Specs";
  if (n.match(/shop.?draw/)) return "Shop Drawings";
  if (n.match(/submittal/)) return "Submittals";
  if (n.match(/rfi/)) return "RFIs";
  if (n.match(/change.?order|addend/)) return "Change Orders";
  if (n.match(/proposal|bid|quote/)) return "Proposal";
  if (n.match(/safety|osha/)) return "Safety";
  if (n.match(/report|inspect/)) return "Reports";
  if (n.match(/invoice|billing/)) return "Customer Invoices";
  if (n.match(/\.(jpg|jpeg|png|gif|heic|webp)$/)) return "Photos";
  return "Correspondence";
}

function isAdminRecipient(member: any) {
  const role = String(member?.role || "").toLowerCase();
  return Boolean(member?.email) && (role === "admin" || role === "owner");
}

function JobContent({ id }: { id: string }) {
  const { user } = useAuth();
  const data = useQuery(api.projectDetail.get, user ? { projectId: id as Id<"projects">, companyId: user.companyId } : "skip");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [contactModal, setContactModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);
  const [taskModal, setTaskModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);
  const updateProject = useMutation(api.projects.update);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const geocodeAndSave = useAction(api.weather.geocodeAndSave as any);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [showContractorSearch, setShowContractorSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<"subs" | "equipment">("subs");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const defaults = { details: false, workflowDesk: true, notes: false, deliveries: true, pours: true, risks: true, comms: true, rentals: true, contacts: true, media: true };
    if (typeof window === "undefined") return defaults;
    try { return { ...defaults, ...JSON.parse(localStorage.getItem("opsslate_job_collapsed") || "{}") }; } catch { return defaults; }
  });
  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("opsslate_job_collapsed", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [sowContact, setSowContact] = useState<Record<string, unknown> | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const emailAttachmentInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.siteMedia.generateUploadUrl);
  const createMedia = useMutation(api.siteMedia.create);
  // Field notes
  const fieldNotes = useQuery(api.fieldNotes.list, { projectId: id as Id<"projects"> });
  const addFieldNote = useMutation(api.fieldNotes.add);
  const removeFieldNote = useMutation(api.fieldNotes.remove);
  const [noteText, setNoteText] = useState("");
  const [showCallTranscriber, setShowCallTranscriber] = useState(false);
  const [dailySummary, setDailySummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const generateSummary = useAction(api.dailySummary.generate as any);
  const [dailyLog, setDailyLog] = useState<string | null>(null);
  const [generatingLog, setGeneratingLog] = useState(false);
  const [weatherSnapshot, setWeatherSnapshot] = useState<any>(null);
  const [weatherConsensus, setWeatherConsensus] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const generateDailyLog = useAction(api.autoDailyLog.generate as any);
  const analyzeWeather = useAction(api.weather.analyzeWeather as any);
  const analyzeWeatherMultiSource = useAction(api.weather.analyzeWeatherMultiSource as any);
  const projectPm = useQuery(api.aiPm.getByProject, id ? { projectId: id as Id<"projects"> } : "skip") as any;
  const projectPmMessages = useQuery(api.aiPm.getMessages, projectPm ? { pmId: projectPm._id as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;
  const projectPmTasks = useQuery(api.aiPm.getTasks, projectPm ? { pmId: projectPm._id as Id<"aiProjectManagers"> } : "skip") as any[] | undefined;
  const createShareLink = useMutation(api.clientPortal.createShareLink);
  const sendEmail = useAction(api.sendEmail.send as any);
  const chatWithPm = useAction(api.aiPmEngine.chat as any);
  const generatePmReport = useAction(api.aiPmEngine.dailyReport as any);
  const updateEmailRecord = useMutation(api.emails.update);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [scanningRepoEmails, setScanningRepoEmails] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");
  const [emailTab, setEmailTab] = useState<"inbox" | "compose" | "upload">("inbox");
  const [composeEmail, setComposeEmail] = useState({ to: "", subject: "", body: "" });
  const createEmail = useMutation(api.emails.create as any);
  const processRawEmail = useAction(api.emailUploadProcessor.processRawEmail as any);
  const genUploadUrl = useMutation(api.companyBranding.generateUploadUrl as any);
  const createDoc = useMutation(api.docManager.create as any);
  const removeDoc = useMutation(api.docManager.remove as any);
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);
  const [docUploading, setDocUploading] = useState(false);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const askProject = useAction(api.projectChat.ask as any);
  const [showSiteWalk, setShowSiteWalk] = useState(false);
  const [siteWalkAnalysis, setSiteWalkAnalysis] = useState<any>(null);
  const [siteWalkLoading, setSiteWalkLoading] = useState(false);
  const analyzeSitePhoto = useAction(api.siteWalk.analyzePhoto as any);
  const removeMedia = useMutation(api.siteMedia.remove);
  const createContact = useMutation(api.contacts.create);
  const updateContact = useMutation(api.contacts.update);
  const removeContact = useMutation(api.contacts.remove);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");
  const [switcherSort, setSwitcherSort] = useState<"name" | "jobNumber" | "city" | "zip">("name");
  const [activeWorkflowDesk, setActiveWorkflowDesk] = useState<"rfis" | "submittals" | "deliveries" | "docs">("rfis");
  const [activeOperationsTab, setActiveOperationsTab] = useState<"field" | "deliveries" | "team" | "docs" | "risks" | "comms" | "history">("field");
  const [showWeatherAnalysis, setShowWeatherAnalysis] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showMapShare, setShowMapShare] = useState(false);
  const [showBriefSender, setShowBriefSender] = useState(false);
  const [selectedBriefRecipients, setSelectedBriefRecipients] = useState<string[]>([]);
  const [selectedMapRecipients, setSelectedMapRecipients] = useState<string[]>([]);
  const [sendingBrief, setSendingBrief] = useState(false);
  const [sendingMapShare, setSendingMapShare] = useState(false);
  const [aiPmStatusPrompt, setAiPmStatusPrompt] = useState("");
  const [aiPmProblemReport, setAiPmProblemReport] = useState("");
  const [aiPmCardWorking, setAiPmCardWorking] = useState(false);
  const [adminEscalationState, setAdminEscalationState] = useState<"idle" | "director" | "sending" | "sent" | "queued" | "failed">("idle");
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);
  const createRfi = useMutation(api.rfis.create as any);
  const updateRfi = useMutation(api.rfis.update as any);
  const createSubmittal = useMutation(api.submittals.create as any);
  const updateSubmittal = useMutation(api.submittals.update as any);
  const createDelivery = useMutation(api.deliveries.create as any);
  const updateDelivery = useMutation(api.deliveries.update as any);
  const fallbackSaveUploadedEmail = useCallback(async (rawText: string, attachmentsUploaded = 0) => {
    if (!user) throw new Error("User not available");
    const match = (label: string) => rawText.match(new RegExp(`^${label}:\\s*(.+)$`, "im"))?.[1]?.trim() || "";
    const from = match("From") || "Unknown";
    const to = match("To");
    const cc = match("Cc") || match("CC");
    const subject = match("Subject") || "(No Subject)";
    const body = rawText.split(/\r?\n\r?\n/).slice(1).join("\n\n").trim() || rawText.slice(0, 5000);
    await createEmail({
      companyId: user.companyId as string,
      projectId: id,
      subject,
      from,
      to,
      cc,
      date: new Date().toISOString().slice(0, 10),
      body,
      bodyPreview: body.slice(0, 200),
      source: "Pasted Upload",
      category: "incoming",
      isRead: true,
      pipelineStatus: "filed",
    } as any);
    return {
      email: { from, to, cc, date: new Date().toISOString().slice(0, 10), subject },
      contactsAdded: 0,
      tasksCreated: 0,
      datesFound: 0,
      issuesLogged: 0,
      attachmentsUploaded,
      fallback: true,
    };
  }, [createEmail, id, user]);
  const allRepoEmails = useQuery(api.emails.list, user?.companyId ? { companyId: user.companyId as string } : "skip") as any[] | undefined;
  const projectDocs = useQuery(api.docManager.list, user?.companyId ? { companyId: user.companyId as any, projectId: id } : "skip") as any[] | undefined;
  const teamMembers = useQuery(api.team.list, user?.companyId ? { companyId: user.companyId as Id<"companies"> } : "skip") as any[] | undefined;
  // Vendors as master directory
  const vendors = useQuery(api.vendors.list, user?.companyId ? { companyId: user.companyId as Id<"companies"> } : "skip");
  const createVendor = useMutation(api.vendors.create);
  const allProjects = useQuery(api.projects.list, user?.companyId ? { companyId: user.companyId as Id<"companies"> } : "skip");

  const handlePhotoUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploadingPhoto(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const { storageId } = await res.json();
        const fileUrl = storageId; // Store the storageId, resolve at query time
        await createMedia({
          companyId: user.companyId as Id<"companies">,
          projectId: id as Id<"projects">,
          type: file.type.startsWith("video/") ? "video" : "photo",
          fileName: file.name,
          url: fileUrl,
          fileSize: file.size,
          capturedDate: new Date().toISOString().slice(0, 10),
          capturedBy: user.name,
          category: "progress",
        });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
    setUploadingPhoto(false);
  }, [user, id, generateUploadUrl, createMedia]);

  const resolvedData = data && data !== null ? data as typeof data & { emails: Array<Record<string, unknown>>; contacts: Array<Record<string, unknown>>; tasks: Array<Record<string, unknown>>; subcontractors: Array<Record<string, unknown>>; media: Array<Record<string, unknown>> } : null;
  const p = resolvedData?.project as any;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!resolvedData || !p) return;
      if (!p.latitude || !p.longitude) {
        const addr = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");
        if (addr && p._id) {
          geocodeAndSave({ projectId: p._id, address: addr }).catch(() => {});
        }
        return;
      }
      setWeatherLoading(true);
      try {
        const [result, multi] = await Promise.allSettled([
          analyzeWeather({ latitude: p.latitude, longitude: p.longitude }),
          analyzeWeatherMultiSource({ latitude: p.latitude, longitude: p.longitude }),
        ]);
        if (!cancelled) {
          setWeatherSnapshot(result.status === "fulfilled" ? result.value : null);
          setWeatherConsensus(multi.status === "fulfilled" ? multi.value : null);
        }
      } catch {
        if (!cancelled) {
          setWeatherSnapshot(null);
          setWeatherConsensus(null);
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    };
    run();
    const interval = setInterval(run, 1000 * 60 * 30);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [resolvedData, p, geocodeAndSave, analyzeWeather]);

  if (data === undefined) return <p className="text-muted-foreground">Loading...</p>;
  if (data === null || !resolvedData) return <p className="text-destructive">Project not found or you do not have access.</p>;

  const { kpis, rentals, deliveries, pours, rfis, submittals, risks, tasks, contacts, emails, subcontractors: projectSubs, media } = resolvedData;

  const taskTypes = ["Layout Building", "Call Underground", "Site Photos", "Other"];
  const priorities = ["Normal", "Medium", "High"];
  const statuses = ["Open", "In Progress", "On Hold", "Complete"];

  const taskFields: FieldDef[] = [
    { key: "task", label: "Task", type: "select", required: true, options: taskTypes.map((t) => ({ label: t, value: t })) },
    { key: "customTask", label: "Task Description", showWhen: (values) => values.task === "Other" },
    { key: "dateOrdered", label: "Date Ordered", type: "date" },
    { key: "dateScheduled", label: "Date Scheduled", type: "date" },
    { key: "dateComplete", label: "Date Complete", type: "date" },
    { key: "priority", label: "Priority", type: "select", options: priorities.map((p) => ({ label: p, value: p })) },
    { key: "status", label: "Status", type: "select", options: statuses.map((s) => ({ label: s, value: s })) },
    { key: "impact", label: "Impact", type: "textarea" },
  ];

  const handleTaskSave = async (values: Record<string, unknown>) => {
    if (taskModal?.mode === "edit" && taskModal.data) {
      const { _id, _creationTime, projectId, ...rest } = values;
      await updateTask({ id: taskModal.data._id as Id<"tasks">, ...(rest as Record<string, string | undefined>) });
    } else {
      await createTask({
        projectId: id as Id<"projects">,
        task: (values.task as string) ?? "",
        customTask: values.customTask as string,
        dateOrdered: values.dateOrdered as string,
        dateScheduled: values.dateScheduled as string,
        dateComplete: values.dateComplete as string,
        priority: values.priority as string,
        status: values.status as string,
        impact: values.impact as string,
      });
    }
  };

  const ROLES = [
    "General Contractor", "Owner/Developer", "Architect", "Engineer",
    "Subcontractor", "Supplier/Vendor", "Inspector", "Project Manager",
    "Superintendent", "Foreman", "Safety Officer", "Estimator", "Other",
  ];
  const TRADES = [
    "General", "Electrical", "Plumbing", "HVAC", "Concrete", "Steel",
    "Masonry", "Roofing", "Framing", "Drywall", "Painting", "Flooring",
    "Excavation", "Landscaping", "Fire Protection", "Elevator", "Other",
  ];

  const contactFields: FieldDef[] = [
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
    { key: "company", label: "Company" },
    { key: "title", label: "Job Title" },
    { key: "role", label: "Project Role", type: "select", options: ROLES.map((r) => ({ label: r, value: r })) },
    { key: "trade", label: "Trade", type: "select", options: TRADES.map((t) => ({ label: t, value: t })) },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "notes", label: "Notes / Scope of Work" },
    { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }, { label: "Pending", value: "Pending" }] },
  ];

  const handleContactSave = async (values: Record<string, unknown>) => {
    // Auto-detect trade and role from name/company if not set
    const searchText = [values.firstName, values.lastName, values.company].filter(Boolean).join(" ");
    const detected = detectTradeAndRole(searchText);
    const finalRole = (values.role as string) || detected.role || "";
    const finalTrade = (values.trade as string) || detected.trade || "";

    if (contactModal?.mode === "edit" && contactModal.data) {
      await updateContact({
        id: contactModal.data._id as Id<"contacts">,
        firstName: values.firstName as string,
        lastName: values.lastName as string,
        company: values.company as string,
        title: values.title as string,
        role: finalRole,
        trade: finalTrade,
        phone: values.phone as string,
        email: values.email as string,
        notes: values.notes as string,
        status: values.status as string,
      });
    } else {
      await createContact({
        projectId: id as Id<"projects">,
        firstName: (values.firstName as string) ?? "",
        lastName: values.lastName as string,
        company: values.company as string,
        title: values.title as string,
        role: finalRole,
        trade: finalTrade,
        phone: values.phone as string,
        email: values.email as string,
        notes: values.notes as string,
        status: values.status as string,
      });
      // Also add to Vendors directory if not already there (by name match)
      if (user?.companyId) {
        const fullName = [values.firstName, values.lastName].filter(Boolean).join(" ");
        const vendorExists = ((vendors || []) as any[]).some((v) =>
          (v.name as string)?.toLowerCase() === fullName.toLowerCase() ||
          (v.contactName as string)?.toLowerCase() === fullName.toLowerCase()
        );
        if (!vendorExists && fullName) {
          await createVendor({
            companyId: user.companyId as Id<"companies">,
            name: (values.company as string) || fullName,
            category: finalTrade || finalRole || "General",
            contactName: fullName,
            phone: (values.phone as string) || "",
            email: (values.email as string) || "",
            notes: (values.notes as string) || "",
          });
        }
      }
    }
  };

  const now = new Date();
  const workflowSteps = [
    { key: "estimate", label: "Estimate", done: Boolean((p as any).estimateId), href: "/estimating", icon: "💰" },
    { key: "subs", label: "Subs", done: (projectSubs?.length || 0) > 0, href: "/subcontractors", icon: "🏗️" },
    { key: "equipment", label: "Equipment", done: (rentals?.length || 0) > 0, href: "/equipment", icon: "🚜" },
    { key: "docs", label: "Docs", done: (projectDocs?.length || 0) > 0, href: "/documents", icon: "📁" },
    { key: "rfis", label: "RFIs", done: (rfis?.length || 0) > 0, href: "/rfis", icon: "📋" },
    { key: "daily", label: "Daily Logs", done: Boolean(dailyLog) || ((fieldNotes?.length || 0) > 0), href: "/daily-logs", icon: "📝" },
  ];
  const nextActions: Array<{ title: string; desc: string; action: () => void; cta: string }> = [];
  if (!(projectDocs?.length)) nextActions.push({ title: "Add project docs", desc: "Upload plans, specs, emails, and attachments so the job has a real paper trail.", action: () => setShowEmailPanel(true), cta: "Open Documents" });
  if (!(projectSubs?.length)) nextActions.push({ title: "Find subcontractors", desc: "Build your buyout list and attach subs directly to this job.", action: () => { setSearchMode("subs"); setShowContractorSearch(true); }, cta: "Find Subs" });
  if (!(rentals?.length)) nextActions.push({ title: "Source equipment", desc: "Search rental yards and equipment suppliers around the jobsite.", action: () => { setSearchMode("equipment"); setShowContractorSearch(true); }, cta: "Find Equipment" });
  if ((kpis?.openRFIs || 0) > 0) nextActions.push({ title: "Resolve RFIs", desc: `There ${kpis.openRFIs === 1 ? "is" : "are"} ${kpis.openRFIs} open RFI${kpis.openRFIs === 1 ? "" : "s"} holding the project open.`, action: () => { window.location.href = "/rfis"; }, cta: "Open RFIs" });
  if (!(fieldNotes?.length)) nextActions.push({ title: "Capture field notes", desc: "Start a daily rhythm with notes, photos, and calls from the field.", action: () => { const el = document.getElementById("field-notes-input"); if (el) { el.scrollIntoView({ behavior: "smooth" }); (el as HTMLTextAreaElement).focus(); } }, cta: "Add Note" });
  const readinessScore = Math.round((workflowSteps.filter((s) => s.done).length / workflowSteps.length) * 100);
  const complianceScore = Math.max(0, 100 - (kpis.openRFIs || 0) * 12 - (kpis.pendingSubmittals || 0) * 8 - (kpis.lateDeliveries || 0) * 10);
  const fieldActivityScore = Math.min(100, ((fieldNotes?.length || 0) * 20) + (media?.length || 0) * 5);
  const liveWeather = weatherSnapshot?.forecast?.[0];
  const liveWeatherAlerts = liveWeather?.alerts || [];
  const weatherHeadline = liveWeather ? `${liveWeather.icon} ${liveWeather.condition} today, ${liveWeather.high}°/${liveWeather.low}°F` : (kpis.lateDeliveries > 0 ? "Weather-sensitive logistics should be checked today" : readinessScore < 60 ? "Site conditions and prep need an early check-in" : "Normal operating day, keep field updates tight");
  const weatherImpact = liveWeather ? (liveWeather.fieldStatus === "red" ? "Weather Risk" : liveWeather.fieldStatus === "yellow" ? "Watch Conditions" : "Normal") : (kpis.lateDeliveries > 0 ? "Attention" : (pours?.length || 0) > 0 ? "Watch Conditions" : "Normal");
  const weatherImpactColor = weatherImpact === "Attention" || weatherImpact === "Weather Risk" ? "bg-red-500/15 text-red-300" : weatherImpact === "Watch Conditions" ? "bg-amber-500/15 text-amber-300" : "bg-green-500/15 text-green-300";
  const dailyAlertCount = [kpis.openRFIs || 0, kpis.pendingSubmittals || 0, kpis.lateDeliveries || 0, !(fieldNotes?.length) ? 1 : 0].reduce((a, b) => a + b, 0);
  const commandBrief = [
    liveWeather ? `${liveWeather.icon} ${liveWeather.condition}, rain ${liveWeather.precipProb}% and wind ${liveWeather.windMax} mph` : "Weather forecast pending project coordinates",
    (kpis.openRFIs || 0) > 0 ? `${kpis.openRFIs} open RFIs need response` : "No open RFIs blocking work",
    (kpis.pendingSubmittals || 0) > 0 ? `${kpis.pendingSubmittals} pending submittals need follow-up` : "Submittal flow is clear",
    !(fieldNotes?.length) ? "No field note logged yet today" : `${fieldNotes?.length} field updates already captured`,
    (deliveries?.length || 0) > 0 ? `${deliveries.length} deliveries on the board` : "No scheduled deliveries recorded",
  ];
  const briefRecipients = (contacts || []).filter((c: any) => c.email).map((c: any) => ({ id: c._id as string, name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.company || c.email, email: c.email as string, role: c.role as string | undefined }));
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

  const handleAiPmStatusUpdate = async () => {
    if (!user?.companyId || !projectPm || aiPmCardWorking) return;
    const prompt = aiPmStatusPrompt.trim() || "Post a concise project status update for the team. Include current posture, blockers, and the next action you recommend.";
    setAiPmCardWorking(true);
    try {
      await chatWithPm({
        pmId: projectPm._id,
        projectId: id as Id<"projects">,
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
        pmId: projectPm._id,
        projectId: id as Id<"projects">,
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
    if (!user?.companyId || !projectPm || !p) return;
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
        subject: `${p.name} — AI PM Director Escalation`,
        body: [
          `Project: ${p.name}`,
          `AI PM: ${projectPm.name}`,
          `Director status: Notified in OpsSlate`,
          ``,
          `Reported issue`,
          issueText,
          ``,
          `Requested action`,
          `Please review the project dashboard and respond to the assigned AI PM or project team.`,
        ].join("\n"),
        projectId: p._id,
        senderName: "OpsSlate AI Director",
      });
      setAdminEscalationState("sent");
    } catch {
      setAdminEscalationState("failed");
    }
  };

  const handleQuickRfiCreate = async () => {
    if (!user?.companyId) return;
    const subject = window.prompt("RFI subject:");
    if (!subject) return;
    const question = window.prompt("RFI question / field issue:");
    if (!question) return;
    await createRfi({ companyId: user.companyId as Id<"companies">, projectId: id as Id<"projects">, subject, question });
  };

  const handleQuickSubmittalCreate = async () => {
    if (!user?.companyId) return;
    const title = window.prompt("Submittal title:");
    if (!title) return;
    const trade = window.prompt("Trade or spec section:") || undefined;
    await createSubmittal({ companyId: user.companyId as Id<"companies">, projectId: id as Id<"projects">, title, trade, specSection: trade });
  };

  const handleQuickDeliveryCreate = async () => {
    const material = window.prompt("Material or delivery item:");
    if (!material) return;
    const supplier = window.prompt("Supplier / vendor:") || undefined;
    const eta = window.prompt("ETA or delivery date:") || undefined;
    await createDelivery({ projectId: id as Id<"projects">, material, supplier, eta, status: "Scheduled" });
  };

  return (
    <div className="space-y-6">
      {/* Standard Header Shell */}
      <Card className="border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-2 z-20 shadow-[0_12px_36px_rgba(0,0,0,0.16)]">
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 items-center">
            <div className="flex flex-wrap justify-center gap-3 w-full">
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="min-w-[140px] rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary flex items-center justify-center gap-2">
                <span>📍</span><span>Top Summary</span>
              </button>
              <button onClick={() => document.getElementById("workflow-desk")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-w-[140px] rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary flex items-center justify-center gap-2">
                <span>🧰</span><span>Workflow Desk</span>
              </button>
              <button onClick={() => document.getElementById("operations-layer")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-w-[140px] rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary flex items-center justify-center gap-2">
                <span>⚙️</span><span>Operations</span>
              </button>
              <button onClick={() => document.getElementById("project-record")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-w-[140px] rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary flex items-center justify-center gap-2">
                <span>🗂️</span><span>Project Record</span>
              </button>
            </div>
            <div className="text-xs text-muted-foreground text-center">Command layer first, deep records below.</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-gradient-to-r from-background to-secondary/20 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardContent className="px-6 py-6 md:px-8 md:py-7 xl:px-10 xl:py-8">
          <div className="space-y-4">
            <div className="min-w-0">
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">← Back to Dashboard</Link>
              <div className="flex flex-wrap items-center justify-end gap-2 mb-2 text-right">
                <Badge className="bg-blue-500/15 text-blue-300">Project Command Center</Badge>
                <Badge
                  variant="secondary"
                  className={`cursor-pointer transition-colors ${
                    p.status === "Active" ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" :
                    p.status === "Inactive" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" :
                    p.status === "Bid" ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" :
                    p.status === "On Hold" ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" :
                    "bg-secondary text-muted-foreground"
                  }`}
                  onClick={async () => {
                    const cycle = ["Active", "Inactive", "Bid", "On Hold", "Complete"];
                    const idx = cycle.indexOf(p.status ?? "Active");
                    const next = cycle[(idx + 1) % cycle.length];
                    await updateProject({ id: p._id as Id<"projects">, status: next });
                  }}
                  title={`Click to cycle status (currently ${p.status})`}
                >
                  {p.status ?? "Active"} ⟳
                </Badge>
                {p.code ? <span className="text-sm text-muted-foreground">Project Code: {p.code}</span> : null}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                  onClick={() => {
                    const addr = [p.address, p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", ");
                    if (!addr) return;
                    setShowLocationMap(true);
                  }}
                >
                  <span>📍</span>
                  <span>{p.name}</span>
                </button>
              </h1>
              {([p.address, p.city || p.town || p.location, p.state, p.zip] as Array<string | undefined>).some(Boolean) ? (
                <div className="mt-3 w-full rounded-xl border border-border bg-background/50 px-6 py-5 md:px-8 md:py-6 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground mb-1 text-right">Project Location</div>
                  {p.address ? <div>{p.address}</div> : null}
                  <div>{[p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", ")}</div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-3">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mr-2">Page Actions</div>
                <Button variant="outline" className="h-10 px-4" onClick={() => {
                  if (collapsedSections["attachments"]) toggleSection("attachments");
                  setTimeout(() => document.getElementById("project-attachments")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
                }}>📁 Documents</Button>
                <Button variant="outline" className="h-10 px-4" onClick={() => { setEmailTab("compose"); setShowEmailPanel(true); }}>📧 Email</Button>
                <Button variant="outline" className="h-10 px-4" onClick={() => { setSearchMode("subs"); setShowContractorSearch(true); }}>🔍 Find Subs</Button>
                <Button variant="outline" className="h-10 px-4" onClick={() => { setSearchMode("equipment"); setShowContractorSearch(true); }}>🚜 Equipment</Button>
                <Button variant="outline" className="h-10 px-4" onClick={() => setShowChat(true)}>🗣️ Ask AI</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Command Layer */}
      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <Card className="border-border bg-gradient-to-r from-blue-500/5 via-background to-amber-500/5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <CardContent className="p-5 space-y-5">
            <div className="flex flex-col xl:flex-row gap-5 xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge className="bg-blue-500/15 text-blue-300">Project Summary</Badge>
                  <button onClick={() => setShowWeatherAnalysis(true)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${weatherImpactColor} hover:opacity-90`}>{weatherImpact}</button>
                  {dailyAlertCount > 0 ? <Badge className="bg-amber-500/15 text-amber-300">{dailyAlertCount} alerts to review</Badge> : <Badge className="bg-green-500/15 text-green-300">No immediate alerts</Badge>}
                </div>
                <h3 className="text-xl font-semibold">{weatherHeadline}</h3>
                <p className="text-sm text-muted-foreground mt-2">First-load command layer for the PM: project status, weather/risk, blockers, and next moves.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-[280px]">
                <div className="rounded-xl bg-blue-500/10 p-3 text-center"><div className="text-2xl font-bold text-blue-400">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div><div className="text-xs text-muted-foreground">Today</div></div>
                <div className="rounded-xl bg-amber-500/10 p-3 text-center"><div className="text-2xl font-bold text-amber-400">{dailyAlertCount + liveWeatherAlerts.length}</div><div className="text-xs text-muted-foreground">Attention Items</div></div>
                <div className="rounded-xl bg-green-500/10 p-3 text-center"><div className="text-2xl font-bold text-green-400">{fieldNotes?.length || 0}</div><div className="text-xs text-muted-foreground">Field Updates</div></div>
                <div className="rounded-xl bg-blue-500/10 p-3 text-center"><div className="text-2xl font-bold text-blue-400">{liveWeather ? `${liveWeather.high}°` : weatherLoading ? "..." : "--"}</div><div className="text-xs text-muted-foreground">Weather High</div></div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Project Summary</div>
                <div className="space-y-2 text-sm">
                  <div className="rounded-xl border border-border bg-background/60 px-3 py-3"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground mt-1">{p.code ? `Code: ${p.code}` : "No project code yet"}</div></div>
                  <div className="rounded-xl border border-border bg-background/60 px-3 py-3"><div className="font-medium">{p.status ?? "Active"}</div><div className="text-xs text-muted-foreground mt-1">Current project status</div></div>
                  <div className="rounded-xl border border-border bg-background/60 px-3 py-3"><div className="font-medium">{p.location || [p.address, p.city, p.state].filter(Boolean).join(", ") || "Location not fully set"}</div><div className="text-xs text-muted-foreground mt-1">Jobsite / operating location</div></div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-2 mb-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">Weather / Risk</div><Button size="sm" variant="outline" className="text-xs" onClick={() => setShowWeatherAnalysis(true)}>Open Weather</Button></div>
                <div className="space-y-2 text-sm">
                  <div className="rounded-xl border border-border bg-background/60 px-3 py-3"><div className="font-medium">{weatherLoading ? "Refreshing weather..." : liveWeather ? `${liveWeather.icon} ${liveWeather.condition}` : "Waiting on project coordinates"}</div><div className="text-xs text-muted-foreground mt-1">{liveWeather ? `High ${liveWeather.high}°F, low ${liveWeather.low}°F, rain ${liveWeather.precipProb}%, wind ${liveWeather.windMax} mph.` : "Add a complete job address and the system will geocode and refresh forecast data automatically."}</div></div>
                  <div className="rounded-xl border border-border bg-background/60 px-3 py-3"><div className="font-medium">Risk posture: {weatherImpact}</div><div className="text-xs text-muted-foreground mt-1">{weatherConsensus?.consensus ? `${weatherConsensus.consensus.summary} Recommendation: ${weatherConsensus.consensus.recommendation}` : "Weather consensus and risk recommendation will appear here."}</div></div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Blockers</div>
                <div className="space-y-2 text-sm">
                  {commandBrief.slice(0, 3).map((line) => <div key={line} className="rounded-xl border border-border bg-background/60 px-3 py-3">{line}</div>)}
                  {commandBrief.length === 0 && <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-3 text-green-300">No blockers surfaced right now.</div>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-2 mb-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">Next Actions</div><Button size="sm" variant="outline" className="text-xs" onClick={() => setShowBriefSender(true)}>Send Brief</Button></div>
              <div className="grid lg:grid-cols-3 gap-3">
                {nextActions.slice(0, 3).map((item) => <button key={item.title} onClick={item.action} className="w-full text-left rounded-xl border border-border bg-background/60 px-3 py-3 hover:bg-background transition-colors"><div className="text-sm font-medium">{item.title}</div><div className="text-xs text-muted-foreground mt-1">{item.desc}</div><div className="text-xs text-blue-300 mt-2">{item.cta} →</div></button>)}
                {nextActions.length === 0 && <div className="lg:col-span-3 rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-3 text-sm text-green-300">Core PM follow-ups are under control.</div>}
              </div>
            </div>
          </CardContent>
      {/* Project Details moved below first-load command layer */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base cursor-pointer select-none" onClick={() => toggleSection("details")}><span className="text-sm mr-1">{collapsedSections["details"] ? "▶" : "▼"}</span>📋 Project Details</CardTitle>
          <div className="flex gap-2">
            {[p.address, p.city, p.state].some(Boolean) && (() => {
              const addr = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
              const shareText = `${p.name}\n📍 ${addr}`;
              return (
                <>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" type="button">🧭 Get Directions</Button>
                  </a>
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: p.name, text: shareText, url: mapsUrl });
                      } catch { /* user cancelled */ }
                    } else {
                      await navigator.clipboard.writeText(`${shareText}\n${mapsUrl}`);
                      alert("Location copied to clipboard!");
                    }
                  }}>📤 Share Location</Button>
                  <Button size="sm" variant="outline" onClick={() => geocodeAndSave({ projectId: p._id, address: addr }).then(() => alert("Project coordinates updated.")).catch(() => alert("Unable to geocode project address."))}>📍 Update Coordinates</Button>
                </>
              );
            })()}
            <Button size="sm" variant="outline" onClick={() => setShowProjectInfo(true)}>Edit</Button>
          </div>
        </CardHeader>
        {!collapsedSections["details"] && (
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
            {[
              ["Address", p.address],
              ["City", p.city],
              ["State", p.state],
              ["Zip", p.zip],
              ["Latitude", p.latitude ? Number(p.latitude).toFixed(6) : null],
              ["Longitude", p.longitude ? Number(p.longitude).toFixed(6) : null],
              ["County", p.county],
              ["Fabricator", p.fabricator],
              ["Contractor", p.contractor],
              ["Type", p.type],
              ["Size", p.size],
              ["Style", p.style],
              ["Contract Date", p.contractDate],
              ["Order Date", p.orderDate],
              ["Start Date", p.startDate],
              ["End Date", p.endDate],
              ["Foundation", p.foundationType],
              ["Project Manager", p.projectManager],
              ["Contract Value", (p as any).contractValue ? `$${Number((p as any).contractValue).toLocaleString()}` : null],
              ["Retainage", (p as any).retainagePercent ? `${(p as any).retainagePercent}%` : null],
              ["Billing Method", (p as any).billingMethod],
              ["Client PO", (p as any).clientPO],
              ["Contingency", (p as any).contingencyPercent ? `${(p as any).contingencyPercent}%` : null],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label as string}>
                <span className="text-muted-foreground">{label}: </span>
                <span className="font-medium">{val as string}</span>
              </div>
            ))}
            {![p.address, p.city, p.contractor, p.fabricator, p.type, p.projectManager].some(Boolean) && (
              <p className="text-muted-foreground col-span-full">No project details yet. Click Edit to add info.</p>
            )}
          </div>
        </CardContent>
        )}
      </Card>


        </Card>

        <Card id="workflow-desk" className="border-border bg-gradient-to-r from-background to-secondary/20 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
          {collapsedSections["workflowDesk"] ? (
            <CardContent className="p-4">
              <button
                onClick={() => toggleSection("workflowDesk")}
                className="w-full rounded-2xl border border-border bg-background/50 px-4 py-4 text-left hover:bg-background transition-colors"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-base font-semibold flex items-center gap-2"><span>🧰</span><span>Open Workflow Desk</span></div>
                    <p className="text-sm text-muted-foreground mt-1">Open the active PM workspace only when you want to work inside RFIs, submittals, deliveries, and docs.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <div className="text-xs text-muted-foreground">RFIs {rfis?.length || 0} • Subs {submittals?.length || 0} • Deliveries {deliveries?.length || 0} • Docs {projectDocs?.length || 0}</div>
                    <Badge className="bg-blue-500/15 text-blue-300">Click to open</Badge>
                  </div>
                </div>
              </button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggleSection("workflowDesk")}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base"><span className="text-sm mr-2">▼</span>🧰 Workflow Desk</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Handle the highest-frequency PM work here without leaving the project view.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-xs text-muted-foreground">RFIs {rfis?.length || 0} • Subs {submittals?.length || 0} • Deliveries {deliveries?.length || 0} • Docs {projectDocs?.length || 0}</div>
                    <Badge className="bg-blue-500/15 text-blue-300">Inline project workflows</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { key: "rfis", label: "RFIs", count: rfis?.length || 0, tone: "bg-red-500/15 text-red-300", note: "Questions and field clarifications" },
                { key: "submittals", label: "Submittals", count: submittals?.length || 0, tone: "bg-amber-500/15 text-amber-300", note: "Approvals and procurement flow" },
                { key: "deliveries", label: "Deliveries", count: deliveries?.length || 0, tone: "bg-blue-500/15 text-blue-300", note: "Shipping and site arrivals" },
                { key: "docs", label: "Docs & Email", count: projectDocs?.length || 0, tone: "bg-green-500/15 text-green-300", note: "Files, updates, and communication" },
              ].map((desk) => (
                <button
                  key={desk.key}
                  onClick={() => setActiveWorkflowDesk(desk.key as "rfis" | "submittals" | "deliveries" | "docs")}
                  className={`rounded-2xl border p-4 text-left transition-colors ${activeWorkflowDesk === desk.key ? "border-blue-500/40 bg-blue-500/10" : "border-border bg-background/50 hover:bg-background"}`}
                >
                  <div className="flex items-center justify-between gap-2"><div className="font-semibold text-sm">{desk.label}</div><span className={`rounded-full px-2 py-1 text-xs ${desk.tone}`}>{desk.count}</span></div>
                  <div className="text-xs text-muted-foreground mt-2">{desk.note}</div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-5">
              {activeWorkflowDesk === "rfis" && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-lg font-semibold">RFI Desk</div><p className="text-sm text-muted-foreground mt-1">Keep project questions visible, route blockers fast, and stay anchored to the job context.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setShowChat(true)}>Draft with AI</Button><Button variant="outline" onClick={handleQuickRfiCreate}>+ Quick RFI</Button><Button onClick={() => window.location.href = "/rfis"}>Open Full RFI Module</Button></div></div>
                  <div className="grid lg:grid-cols-3 gap-3">{(rfis || []).slice(0, 3).map((r: any) => <div key={r._id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex items-center justify-between gap-2"><div className="font-medium text-sm">RFI-{r.number || "?"}</div><Badge className={(r.status === "Closed" || r.status === "Answered") ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}>{r.status || "Open"}</Badge></div><div className="text-sm mt-2">{r.subject || r.question || "Open RFI"}</div><div className="text-xs text-muted-foreground mt-2">{r.assignedTo ? `Assigned to ${r.assignedTo}` : "Needs owner"}</div><div className="flex gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => updateRfi({ id: r._id, status: "Answered" })}>Mark Answered</Button><Button size="sm" variant="outline" onClick={() => updateRfi({ id: r._id, status: "Closed" })}>Close</Button></div></div>)}{!(rfis || []).length && <div className="lg:col-span-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">No active RFIs right now. This project is clear on current field questions.</div>}</div>
                </div>
              )}
              {activeWorkflowDesk === "submittals" && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-lg font-semibold">Submittal Desk</div><p className="text-sm text-muted-foreground mt-1">See the approval pipeline without losing project context.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setShowEmailPanel(true)}>Send Update</Button><Button variant="outline" onClick={handleQuickSubmittalCreate}>+ Quick Submittal</Button><Button onClick={() => window.location.href = "/submittals"}>Open Full Submittal Module</Button></div></div>
                  <div className="grid lg:grid-cols-3 gap-3">{(submittals || []).slice(0, 3).map((s: any) => <div key={s._id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex items-center justify-between gap-2"><div className="font-medium text-sm">SUB-{s.number || "?"}</div><Badge className={(s.status === "Approved") ? "bg-green-500/15 text-green-300" : (s.status === "Rejected" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300")}>{s.status || "Pending"}</Badge></div><div className="text-sm mt-2">{s.title || s.description || "Pending submittal"}</div><div className="text-xs text-muted-foreground mt-2">{s.specSection || s.trade || "Awaiting review details"}</div><div className="flex gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => updateSubmittal({ id: s._id, status: "Approved" })}>Approve</Button><Button size="sm" variant="outline" onClick={() => updateSubmittal({ id: s._id, status: "Revise & Resubmit" })}>Revise</Button></div></div>)}{!(submittals || []).length && <div className="lg:col-span-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">No pending submittals right now. Procurement is clear.</div>}</div>
                </div>
              )}
              {activeWorkflowDesk === "deliveries" && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-lg font-semibold">Delivery Desk</div><p className="text-sm text-muted-foreground mt-1">Keep incoming material, late shipments, and site readiness in one place.</p></div><div className="flex gap-2"><Button variant="outline" onClick={handleQuickDeliveryCreate}>+ Quick Delivery</Button><Button variant="outline" onClick={() => { const el = document.getElementById("deliveries-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}>Jump to Delivery Board</Button><Button onClick={() => window.location.href = "/deliveries"}>Open Full Delivery Module</Button></div></div>
                  <div className="grid lg:grid-cols-3 gap-3">{(deliveries || []).slice(0, 3).map((d: any) => <div key={d._id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex items-center justify-between gap-2"><div className="font-medium text-sm">{d.material || d.description || "Delivery"}</div><Badge className={d.status === "Delivered" ? "bg-green-500/15 text-green-300" : d.status === "Late" ? "bg-red-500/15 text-red-300" : "bg-blue-500/15 text-blue-300"}>{d.status || "Scheduled"}</Badge></div><div className="text-xs text-muted-foreground mt-2">{d.date || d.expectedDate || d.eta || "No date set"}</div><div className="text-xs text-muted-foreground mt-1">{d.vendor || d.supplier || "Vendor TBD"}</div><div className="flex gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => updateDelivery({ id: d._id, status: "Delivered" })}>Mark Delivered</Button><Button size="sm" variant="outline" onClick={() => updateDelivery({ id: d._id, status: "Late" })}>Flag Late</Button></div></div>)}{!(deliveries || []).length && <div className="lg:col-span-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">No deliveries are scheduled. Site logistics look clear.</div>}</div>
                </div>
              )}
              {activeWorkflowDesk === "docs" && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap"><div><div className="text-lg font-semibold">Docs & Email Desk</div><p className="text-sm text-muted-foreground mt-1">Handle the project paper trail, updates, and file-driven communication from the same command surface.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => { setEmailTab("compose"); setShowEmailPanel(true); }}>Quick Email</Button><Button variant="outline" onClick={() => setShowBriefSender(true)}>Send Brief</Button><Button onClick={() => setShowEmailPanel(true)}>Open Docs & Email</Button></div></div>
                  <div className="grid lg:grid-cols-3 gap-3"><div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="font-medium text-sm">Project files</div><div className="text-3xl font-bold mt-2">{projectDocs?.length || 0}</div><div className="text-xs text-muted-foreground mt-2">Plans, specs, uploaded emails, and field attachments.</div></div><div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="font-medium text-sm">Project contacts with email</div><div className="text-3xl font-bold mt-2">{briefRecipients.length}</div><div className="text-xs text-muted-foreground mt-2">Ready to receive weather briefs and project updates.</div></div><div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="font-medium text-sm">Latest communication posture</div><div className="text-sm mt-2">{emails?.length ? "Project emails are attached to the job record." : "No project emails linked yet."}</div><div className="text-xs text-muted-foreground mt-2">Keep the record complete so field and office teams stay aligned.</div></div></div>
                </div>
              )}
            </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Standard Action Panels */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Field Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm" onClick={() => cameraInputRef.current?.click()}><span className="text-lg">📸</span>Photo</Button>
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm" onClick={() => { const el = document.getElementById("field-notes-input"); if (el) { el.scrollIntoView({ behavior: "smooth" }); el.focus(); } }}><span className="text-lg">📝</span>Note</Button>
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm" onClick={() => setShowCallTranscriber(true)}><span className="text-lg">📞</span>Log Call</Button>
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm border-cyan-500/30 hover:bg-cyan-500/10" onClick={() => setShowSiteWalk(true)}><span className="text-lg">📸</span>Site Walk</Button>
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm" disabled={generatingLog}
              onClick={async () => { if (!user?.companyId) return; setGeneratingLog(true); try { const result = await generateDailyLog({ projectId: id as Id<"projects">, companyId: user.companyId as Id<"companies"> }); setDailyLog((result as any).log); } catch { setDailyLog("Failed to generate daily log."); } setGeneratingLog(false); }}><span className="text-lg">{generatingLog ? "🔄" : "📝"}</span>{generatingLog ? "..." : "Daily Log"}</Button>
            {[p.address, p.city, p.state].some(Boolean) && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([p.address, p.city, p.state, p.zip].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="h-14 w-full flex flex-col gap-1 text-sm"><span className="text-lg">🧭</span>Directions</Button></a>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Buyout & Sourcing</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm" onClick={() => { setSearchMode("subs"); setShowContractorSearch(true); }}><span className="text-lg">🔍</span>Find Subs</Button>
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm border-teal-500/30 hover:bg-teal-500/10" onClick={() => { setSearchMode("equipment"); setShowContractorSearch(true); }}><span className="text-lg">🚜</span>Equipment</Button>
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm border-blue-500/30 hover:bg-blue-500/10" onClick={() => setShowEmailPanel(true)}><span className="text-lg">📧</span>Email</Button>
            <Link href={`/rfis`}><Button variant="outline" className="h-14 flex flex-col gap-1 text-sm border-purple-500/30 hover:bg-purple-500/10 w-full"><span className="text-lg">🤖</span>Auto RFIs</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Command & Communication</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm border-orange-500/30 hover:bg-orange-500/10" onClick={() => setShowChat(true)}><span className="text-lg">🗣️</span>Ask AI</Button>
            <Button variant="outline" className="h-14 flex flex-col gap-1 text-sm border-green-500/30 hover:bg-green-500/10" onClick={async () => { if (!user) return; const clientName = window.prompt("Client name (for the portal greeting):", "Client"); if (!clientName) return; const result = await createShareLink({ projectId: id as Id<"projects">, companyId: user.companyId as Id<"companies">, clientName }); setShareUrl((result as any).url); navigator.clipboard.writeText((result as any).url); alert(`Link copied!\n\n${(result as any).url}\n\nShare this with your client.`); }}><span className="text-lg">🔗</span>Client Link</Button>
          </CardContent>
        </Card>
      </div>

      <div id="project-record" className="flex items-center justify-between gap-3 flex-wrap"><div><h3 className="text-lg font-semibold">Project Record</h3><p className="text-sm text-muted-foreground">Controlled workspace below. Switch operational context without adding page length.</p></div></div>

      <Card className="bg-gradient-to-r from-orange-500/10 via-background to-blue-500/10 border-orange-500/30 border-l-4 border-l-orange-500 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-2xl">{projectPm?.avatar || "🤖"}</div>
              <div>
                <CardTitle className="text-base">AI Project Manager</CardTitle>
                <div className="mt-1 text-xl font-bold">{projectPm?.name || "No AI PM assigned"}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {projectPm ? `${projectPm.personality === "direct" ? "Direct & no-nonsense" : projectPm.personality === "detailed" ? "Detailed & methodical" : "Friendly & proactive"} • ${projectPm.status === "active" ? "Active" : "Paused"}` : "Assign an AI PM from the AI Project Managers workspace to activate status posts and escalations."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {projectPm ? <Button variant="outline" size="sm" disabled={aiPmCardWorking} onClick={handleAiPmDailyReport}>{aiPmCardWorking ? "Working..." : "Generate Status"}</Button> : null}
              <Link href={`/ai-pm?project=${id}`}><Button size="sm" className="bg-orange-500 hover:bg-orange-600">Open AI PM</Button></Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border bg-background/55 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="font-semibold text-sm">Discussion & Status</div>
                  <p className="text-xs text-muted-foreground mt-1">Team-facing updates posted by the assigned AI PM.</p>
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
                    <p className="text-xs text-muted-foreground mt-1">AI PM problem reports and tasks that need attention.</p>
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
                    <p className="text-xs text-muted-foreground mt-1">Reported problems surface to the Director, then route to the assigned Admin.</p>
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
                  Admin target: {adminRecipient?.email ? `${adminRecipient.name || "Admin"} <${adminRecipient.email}>` : "No admin email found. The UI will mark the escalation for admin follow-up without sending email."}
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

      <Card id="operations-layer" className="border-border bg-gradient-to-r from-background to-secondary/20 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2"><Badge className="bg-blue-500/15 text-blue-300">Operational Workspace</Badge><Badge className="bg-amber-500/15 text-amber-300">Controlled Lower-Half View</Badge></div>
              <h3 className="text-lg font-semibold">One workspace, multiple operating contexts</h3>
              <p className="text-sm text-muted-foreground mt-1">Switch between field, logistics, team, documentation, risk, comms, and history without stacking endless sections.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center min-w-[320px]">
              <div className="rounded-xl bg-blue-500/10 p-3"><div className="text-xl font-bold text-blue-400">{tasks?.length || 0}</div><div className="text-xs text-muted-foreground">Tasks</div></div>
              <div className="rounded-xl bg-amber-500/10 p-3"><div className="text-xl font-bold text-amber-400">{fieldNotes?.length || 0}</div><div className="text-xs text-muted-foreground">Field</div></div>
              <div className="rounded-xl bg-green-500/10 p-3"><div className="text-xl font-bold text-green-400">{contacts?.length || 0}</div><div className="text-xs text-muted-foreground">Team</div></div>
              <div className="rounded-xl bg-purple-500/10 p-3"><div className="text-xl font-bold text-purple-400">{(emails?.length || 0) + (projectDocs?.length || 0)}</div><div className="text-xs text-muted-foreground">Docs / Comms</div></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "field", label: "Field" },
              { key: "deliveries", label: "Deliveries" },
              { key: "team", label: "Team" },
              { key: "docs", label: "Docs" },
              { key: "risks", label: "Risks" },
              { key: "comms", label: "Comms" },
              { key: "history", label: "History" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveOperationsTab(tab.key as "field" | "deliveries" | "team" | "docs" | "risks" | "comms" | "history")}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${activeOperationsTab === tab.key ? "border-blue-500/40 bg-blue-500/10 text-blue-300" : "border-border hover:bg-secondary"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4">
            {activeOperationsTab === "field" && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <KPI label="Field Notes" value={String(fieldNotes?.length || 0)} />
                  <KPI label="Photos" value={String(media?.length || 0)} />
                  <KPI label="Tasks" value={String(tasks?.length || 0)} />
                </div>
                <Card className="bg-card border-border border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2"><CardTitle className="text-base">📝 Field Notes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <Input id="field-notes-input" placeholder="Quick note from the field..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && noteText.trim() && user) { await addFieldNote({ companyId: user.companyId as Id<"companies">, projectId: id as Id<"projects">, note: noteText.trim(), author: user.name }); setNoteText(""); } }} className="flex-1" />
                      <Button size="sm" disabled={!noteText.trim()} onClick={async () => { if (noteText.trim() && user) { await addFieldNote({ companyId: user.companyId as Id<"companies">, projectId: id as Id<"projects">, note: noteText.trim(), author: user.name }); setNoteText(""); } }}>Add</Button>
                    </div>
                    {fieldNotes && fieldNotes.length > 0 ? <div className="space-y-2 max-h-64 overflow-y-auto">{fieldNotes.map((n) => { const d = new Date(n.createdAt); const time = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); return <div key={n._id} className="flex items-start gap-2 text-sm bg-secondary/50 rounded-lg p-2 group"><div className="flex-1"><span>{n.note}</span><span className="text-xs text-muted-foreground ml-2">— {n.author}, {time}</span></div><button className="text-red-400 hover:text-red-300 text-xs opacity-70" onClick={() => removeFieldNote({ id: n._id })}>✕</button></div>; })}</div> : <p className="text-xs text-muted-foreground text-center">No notes yet. Type something and hit Enter.</p>}
                  </CardContent>
                </Card>
                <Card className="bg-card border-border border-l-4 border-l-blue-500"><CardHeader className="pb-2 flex flex-row items-center justify-between"><div><CardTitle className="text-base">📷 Project Photos</CardTitle><p className="text-xs text-muted-foreground mt-1">{media ? `${media.length} photo${media.length !== 1 ? "s" : ""}` : "0 photos"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={uploadingPhoto}>📸 Take Photo</Button><Button size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>{uploadingPhoto ? "Uploading..." : "📁 Upload Photos"}</Button><input ref={photoInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} /><input ref={cameraInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} /></div></CardHeader><CardContent>{media && media.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">{media.map((m) => { const url = m.url as string; const isVideo = (m.type as string) === "video"; return <div key={m._id as string} className="relative group aspect-square rounded-lg overflow-hidden bg-secondary border border-border cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => !isVideo && setLightboxUrl(url)}>{isVideo ? <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">🎥</span></div> : <img src={url} alt={(m.fileName as string) || "Photo"} className="w-full h-full object-cover" loading="lazy" />}<button className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm z-10" title="Delete photo" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this photo?")) removeMedia({ id: m._id as Id<"siteMedia"> }); }}>✕</button><div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2"><p className="text-xs text-white truncate">{(m.fileName as string) || "Photo"}</p><div className="flex items-center gap-2 text-xs text-white/70">{m.capturedDate && <span>{m.capturedDate as string}</span>}{m.capturedBy && <span>by {m.capturedBy as string}</span>}</div></div></div>; })}</div> : <div className="text-center py-8"><span className="text-4xl block mb-3">📷</span><p className="text-muted-foreground">No photos yet</p><p className="text-xs text-muted-foreground mt-1">Upload photos or take them directly from the field</p></div>}</CardContent></Card>
                <Card className="bg-card border-border border-l-4 border-l-blue-500"><CardContent className="pt-4"><TaskPanel tasks={tasks || []} projectId={id} userName={user?.name || "User"} /></CardContent></Card>
              </div>
            )}

            {activeOperationsTab === "deliveries" && <div className="space-y-4"><div className="grid md:grid-cols-3 gap-3"><KPI label="Deliveries" value={String(kpis.deliveryCount)} /><KPI label="Late Deliveries" value={String(kpis.lateDeliveries || 0)} /><KPI label="Equipment" value={String(kpis.activeRentals)} /></div><Card className="bg-card border-border border-l-4 border-l-amber-500"><CardHeader className="pb-2"><CardTitle className="text-base">🚚 Deliveries</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Material</TableHead><TableHead>PO</TableHead><TableHead>ETA</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>{deliveries.map((d) => { const late = d.eta && d.eta < now.toISOString().slice(0, 10) && d.status !== "Delivered"; return <TableRow key={d._id}><TableCell className="font-medium">{d.supplier ?? ""}</TableCell><TableCell>{d.material ?? ""}</TableCell><TableCell>{d.po ?? ""}</TableCell><TableCell>{d.eta ?? "—"}</TableCell><TableCell><Badge variant={late ? "destructive" : "secondary"}>{late ? "LATE" : (d.status ?? "Scheduled")}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{d.notes ?? ""}</TableCell></TableRow>; })}{deliveries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No deliveries.</TableCell></TableRow>}</TableBody></Table></CardContent></Card><Card className="bg-card border-border border-l-4 border-l-blue-500"><CardHeader className="pb-2"><CardTitle className="text-base">🏗️ Equipment On Rent</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Equipment</TableHead><TableHead>Vendor</TableHead><TableHead>PO</TableHead><TableHead>Start</TableHead><TableHead>Days</TableHead><TableHead>Rate</TableHead><TableHead>Weekly</TableHead><TableHead>Cost to Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rentals.map((r) => <TableRow key={r._id}><TableCell className="font-medium">{r.equipmentName}</TableCell><TableCell>{r.vendor ?? ""}</TableCell><TableCell>{r.po ?? ""}</TableCell><TableCell>{r.start ?? ""}</TableCell><TableCell>{r.days}</TableCell><TableCell>{r.rateType} ${r.rate}</TableCell><TableCell className="text-accent">${r.weekly.toFixed(0)}</TableCell><TableCell className="text-accent">${r.costToDate.toFixed(0)}</TableCell><TableCell><Badge variant={r.status === "On Rent" ? "default" : "secondary"}>{r.status}</Badge>{r.overdue ? <Badge variant="destructive" className="ml-1">Past End</Badge> : null}{r.unverified ? <Badge variant="destructive" className="ml-1">Unverified</Badge> : null}</TableCell></TableRow>)}{rentals.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No rentals.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>{pours.length > 0 && <Card className="bg-card border-border"><CardHeader className="pb-2"><CardTitle className="text-base">🧱 Concrete Pours</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Pour</TableHead><TableHead>CY</TableHead><TableHead>Mix</TableHead><TableHead>Supplier</TableHead><TableHead>Pump</TableHead><TableHead>Crew</TableHead><TableHead>Weather</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{pours.map((c) => <TableRow key={c._id}><TableCell className="font-medium">{c.date ?? ""}</TableCell><TableCell>{c.pour ?? ""}</TableCell><TableCell>{c.cy ?? ""}</TableCell><TableCell>{c.mixDesign ?? ""}</TableCell><TableCell>{c.supplier ?? ""}</TableCell><TableCell>{c.pump ?? ""}</TableCell><TableCell>{c.crew ?? ""}</TableCell><TableCell>{c.weatherRisk ? <Badge variant={c.weatherRisk === "High" ? "destructive" : "secondary"}>{c.weatherRisk}</Badge> : null}</TableCell><TableCell><Badge>{c.status ?? "Planned"}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}</div>}

            {activeOperationsTab === "team" && <div className="space-y-4"><div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">Team workspace will centralize contacts, subs, and partner coordination here. I&apos;m keeping the page controlled now and will keep extending this tab cleanly.</div></div>}
            {activeOperationsTab === "docs" && <div className="space-y-4"><div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">Docs workspace will centralize attachments, budget, and supporting records here.</div></div>}
            {activeOperationsTab === "risks" && <div className="space-y-4"><div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">Risks workspace will centralize risk register, RFIs, and submittals here.</div></div>}
            {activeOperationsTab === "comms" && <div className="space-y-4"><div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">Comms workspace will centralize project email and communication history here.</div></div>}
            {activeOperationsTab === "history" && <div className="space-y-4"><div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">History workspace will centralize project record and baseline reference here.</div></div>}
          </div>
        </CardContent>
      </Card>


      {showProjectInfo && (
        <CrudModal
          title="Edit Project Details"
          fields={[
            { key: "name", label: "Project Name", required: true },
            { key: "code", label: "Project Code" },
            { key: "address", label: "Address" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "zip", label: "Zip Code" },
            { key: "county", label: "County" },
            { key: "fabricator", label: "Fabricator" },
            { key: "contractor", label: "Contractor" },
            { key: "type", label: "Type" },
            { key: "size", label: "Size" },
            { key: "style", label: "Style" },
            { key: "contractDate", label: "Contract Date", type: "date" },
            { key: "orderDate", label: "Order Date", type: "date" },
            { key: "startDate", label: "Start Date", type: "date" },
            { key: "endDate", label: "End Date", type: "date" },
            { key: "foundationType", label: "Foundation Type" },
            { key: "projectManager", label: "Project Manager" },
            { key: "contractValue", label: "Contract Value ($)", type: "number" },
            { key: "retainagePercent", label: "Retainage %", type: "number" },
            { key: "billingMethod", label: "Billing Method", type: "select", options: [
              { label: "Fixed Price", value: "Fixed Price" },
              { label: "Time & Materials", value: "Time & Materials" },
              { label: "Cost Plus", value: "Cost Plus" },
              { label: "Unit Price", value: "Unit Price" },
            ] },
            { key: "clientPO", label: "Client PO #" },
            { key: "contingencyPercent", label: "Contingency %", type: "number" },
          ] as FieldDef[]}
          initialValues={p as any}
          onSave={async (values) => {
            const payload = {
              id: p._id as Id<"projects">,
              name: values.name,
              code: values.code,
              address: values.address,
              city: values.city,
              state: values.state,
              zip: values.zip,
              county: values.county,
              fabricator: values.fabricator,
              contractor: values.contractor,
              type: values.type,
              size: values.size,
              style: values.style,
              contractDate: values.contractDate,
              orderDate: values.orderDate,
              startDate: values.startDate,
              endDate: values.endDate,
              foundationType: values.foundationType,
              projectManager: values.projectManager,
              contractValue: values.contractValue,
              retainagePercent: values.retainagePercent,
              billingMethod: values.billingMethod,
              clientPO: values.clientPO,
              contingencyPercent: values.contingencyPercent,
            };
            await updateProject(payload as any);
          }}
          onClose={() => setShowProjectInfo(false)}
        />
      )}

      {showCallTranscriber && (
        <CallTranscriberModal
          projectId={id}
          projectName={p.name}
          companyId={String(p.companyId)}
          contacts={(contacts || []).map((c) => ({
            _id: c._id as string,
            firstName: c.firstName as string,
            lastName: c.lastName as string,
            company: c.company as string,
            role: c.role as string,
            phone: c.phone as string,
          }))}
          userName={user?.name || "Unknown"}
          onClose={() => setShowCallTranscriber(false)}
        />
      )}

      {sowContact && (
        <ScopeOfWorkModal
          contact={{
            firstName: sowContact.firstName as string,
            lastName: sowContact.lastName as string,
            company: sowContact.company as string,
            trade: sowContact.trade as string,
            phone: sowContact.phone as string,
            email: sowContact.email as string,
            notes: sowContact.notes as string,
          }}
          project={{
            name: p.name,
            location: p.location,
            address: p.address,
            city: p.city,
            state: p.state,
            zipCode: (p as Record<string, unknown>).zipCode as string,
          }}
          onClose={() => setSowContact(null)}
        />
      )}

      {showContractorSearch && (
        <ContractorSearchModal
          projectId={id}
          projectName={p.name}
          projectLocation={[p.city, p.state].filter(Boolean).join(", ") || p.location || ""}
          companyId={String(p.companyId)}
          mode={searchMode === "equipment" ? "equipment" : "contractor"}
          initialTrade={searchMode === "equipment" ? "Equipment Rental" : undefined}
          title={searchMode === "equipment" ? "AI Equipment Rental Finder" : "AI Contractor Finder"}
          subtitle={searchMode === "equipment" ? "Search for equipment rental companies, heavy equipment yards, trucks, and specialty fleet providers near your project" : "Search for qualified subcontractors & suppliers near your project"}
          onClose={() => setShowContractorSearch(false)}
        />
      )}

      {showLocationMap && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="p-4 border-b border-border flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">📍 Project Location</h3>
                <p className="text-xs text-muted-foreground mt-1">{[p.address, p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", ")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowLocationMap(false)}>✕</Button>
            </div>
            <div className="px-4 pb-4">
              <div className="rounded-xl overflow-hidden border border-border bg-secondary/20">
                <iframe
                  title={`${p.name} location map`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent([p.address, p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", "))}&z=15&output=embed`}
                  className="w-full h-[320px] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowMapShare(true)}>Share</Button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([p.address, p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">Directions</Button>
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.address, p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">Open in Google Maps</Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Project Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-lg h-[85vh] sm:h-[70vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">🗣️ Ask Your Project</h3>
                <p className="text-xs text-muted-foreground">Ask anything — budget, status, history, crew, schedule</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm space-y-2 mt-8">
                  <p className="text-3xl">🤖</p>
                  <p>Ask me anything about this project</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {["What happened this week?", "Are we over budget?", "What's still outstanding?", "Give me an owner update"].map((q) => (
                      <button key={q} className="text-xs bg-secondary/60 hover:bg-secondary px-3 py-1.5 rounded-full border border-border"
                        onClick={() => { setChatInput(q); }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === "user" ? "bg-orange-500/20 text-orange-100 border border-orange-500/30" : "bg-secondary/60 border border-border"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
                    🔄 Thinking...
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!chatInput.trim() || chatLoading || !user) return;
                const question = chatInput.trim();
                setChatInput("");
                setChatMessages((prev) => [...prev, { role: "user", text: question }]);
                setChatLoading(true);
                try {
                  const result = await askProject({ projectId: id as any, companyId: user.companyId as any, question });
                  setChatMessages((prev) => [...prev, { role: "ai", text: (result as any).answer }]);
                } catch { setChatMessages((prev) => [...prev, { role: "ai", text: "Sorry, I couldn't process that. Try again." }]); }
                setChatLoading(false);
              }} className="flex gap-2">
                <Input placeholder="Ask anything about this project..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1" autoFocus />
                <Button type="submit" disabled={chatLoading || !chatInput.trim()} className="bg-orange-500 hover:bg-orange-600">
                  {chatLoading ? "..." : "Ask"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Site Walk Modal */}
      {showSiteWalk && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">📸 AI Site Walk</h3>
                <p className="text-xs text-muted-foreground">Upload a jobsite photo for instant AI analysis</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowSiteWalk(false); setSiteWalkAnalysis(null); }}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {!siteWalkAnalysis && !siteWalkLoading && (
                <div className="text-center space-y-4">
                  <div className="text-6xl">📷</div>
                  <p className="text-muted-foreground">Take or upload a jobsite photo</p>
                  <p className="text-xs text-muted-foreground">AI will detect trades, estimate progress, flag safety issues, and tag the location</p>
                  <div className="flex gap-3 justify-center">
                    <label className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                      📷 Take Photo
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        setSiteWalkLoading(true);
                        try {
                          const uploadUrl = await generateUploadUrl();
                          const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                          const { storageId } = await res.json();
                          await createMedia({ companyId: user.companyId as any, projectId: id as any, type: "photo", fileName: file.name, url: storageId, uploadedBy: user.email || "" });
                          const analysis = await analyzeSitePhoto({ storageId, projectId: id, projectName: data?.project?.name || "Project" });
                          setSiteWalkAnalysis(analysis);
                        } catch (err) { setSiteWalkAnalysis({ summary: "Analysis failed. Photo was still uploaded to Site Media.", concerns: [(err as Error).message] }); }
                        setSiteWalkLoading(false);
                      }} />
                    </label>
                  </div>
                </div>
              )}
              {siteWalkLoading && (
                <div className="text-center space-y-4 py-12">
                  <div className="text-5xl animate-pulse">🔍</div>
                  <p className="font-medium">Analyzing jobsite photo...</p>
                  <p className="text-xs text-muted-foreground">Detecting trades, assessing safety, estimating progress</p>
                </div>
              )}
              {siteWalkAnalysis && !siteWalkLoading && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-lg p-4">
                    <p className="font-bold text-sm mb-1">📋 Summary</p>
                    <p className="text-sm">{siteWalkAnalysis.summary || "Analysis complete"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/40 rounded-lg p-3">
                      <p className="font-bold text-xs mb-2">🔨 Trades Visible</p>
                      <div className="flex flex-wrap gap-1">
                        {(siteWalkAnalysis.trades_visible || []).map((t: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3">
                      <p className="font-bold text-xs mb-2">📍 Location</p>
                      <p className="text-sm">{siteWalkAnalysis.location_tag || "Not determined"}</p>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3">
                      <p className="font-bold text-xs mb-2">📊 Progress</p>
                      <p className="text-sm">{siteWalkAnalysis.estimated_progress || "Not determined"}</p>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3">
                      <p className="font-bold text-xs mb-2">⛅ Weather</p>
                      <p className="text-sm">{siteWalkAnalysis.weather_conditions || "Not visible"}</p>
                    </div>
                  </div>
                  <div className={`rounded-lg p-3 border ${(siteWalkAnalysis.safety_score || 10) >= 7 ? "bg-green-500/10 border-green-500/30" : (siteWalkAnalysis.safety_score || 10) >= 4 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                    <p className="font-bold text-xs mb-2">🦺 Safety Score: {siteWalkAnalysis.safety_score || "?"}/10</p>
                    {(siteWalkAnalysis.safety_observations || []).map((s: string, i: number) => (
                      <p key={i} className="text-xs my-0.5">• {s}</p>
                    ))}
                  </div>
                  {(siteWalkAnalysis.concerns || []).length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="font-bold text-xs mb-2">⚠️ Concerns</p>
                      {siteWalkAnalysis.concerns.map((c: string, i: number) => (
                        <p key={i} className="text-xs my-0.5">• {c}</p>
                      ))}
                    </div>
                  )}
                  {(siteWalkAnalysis.materials_visible || []).length > 0 && (
                    <div className="bg-secondary/40 rounded-lg p-3">
                      <p className="font-bold text-xs mb-2">📦 Materials on Site</p>
                      <div className="flex flex-wrap gap-1">
                        {siteWalkAnalysis.materials_visible.map((m: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => {
                      const text = `Site Walk Report - ${data?.project?.name || "Project"}\n${new Date().toLocaleDateString()}\n\nSummary: ${siteWalkAnalysis.summary}\nProgress: ${siteWalkAnalysis.estimated_progress}\nSafety Score: ${siteWalkAnalysis.safety_score}/10\nLocation: ${siteWalkAnalysis.location_tag}\nTrades: ${(siteWalkAnalysis.trades_visible || []).join(", ")}\nConcerns: ${(siteWalkAnalysis.concerns || []).join(", ") || "None"}`;
                      navigator.clipboard.writeText(text);
                      alert("Copied!");
                    }}>📋 Copy Report</Button>
                    <Button variant="outline" size="sm" onClick={() => setSiteWalkAnalysis(null)}>📸 Analyze Another</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto Daily Log Modal */}
      {dailyLog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">📝 Auto Daily Log</h3>
                <p className="text-xs text-muted-foreground">Generated from today&apos;s field notes, communications, and activity</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDailyLog(null)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {dailyLog.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold mb-3">{line.replace("# ", "")}</h2>;
                  if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold mt-4 mb-1 text-orange-400">{line.replace("## ", "")}</h3>;
                  if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-bold mt-3 mb-1">{line.replace("### ", "")}</h4>;
                  if (line.match(/^\d+\.\s\*\*/)) return <p key={i} className="font-medium mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
                  if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="ml-4 my-0.5">• {line.slice(2).replace(/\*\*/g, "").replace(/\*/g, "")}</p>;
                  if (line.startsWith("**")) return <p key={i} className="font-medium mt-2">{line.replace(/\*\*/g, "")}</p>;
                  if (line.startsWith("---")) return <hr key={i} className="border-border my-3" />;
                  return <p key={i} className="my-0.5">{line.replace(/\*\*/g, "").replace(/\*/g, "")}</p>;
                })}
              </div>
            </div>
            <div className="p-3 border-t border-border flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(dailyLog.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,3} /g, ""));
                alert("Daily log copied to clipboard!");
              }}>📋 Copy</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const blob = new Blob([dailyLog.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,3} /g, "")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `daily-log-${new Date().toISOString().slice(0,10)}.txt`; a.click();
                URL.revokeObjectURL(url);
              }}>💾 Download</Button>
              <Button variant="outline" size="sm" onClick={() => setDailyLog(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Project Switcher Button */}
      <button
        onClick={() => setShowProjectSwitcher(true)}
        className="fixed bottom-6 right-20 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-xl"
        title="Switch Project"
      >🔀</button>

      {/* Project Switcher Modal */}
      {showWeatherAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowWeatherAnalysis(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between gap-3"><div><h3 className="font-bold text-lg">Weather Risk Analysis</h3><p className="text-xs text-muted-foreground mt-1">See the forecast sources used, the consensus summary, and how OpsSlate determined the current weather risk.</p></div><Button variant="outline" size="sm" onClick={() => setShowWeatherAnalysis(false)}>Close</Button></div>
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Final Result</div><div className="flex flex-wrap gap-2 items-center mb-2"><span className={`rounded-full px-3 py-1 text-xs font-medium ${weatherImpactColor}`}>{weatherImpact}</span>{weatherConsensus?.consensus?.confidence ? <Badge variant="outline">Confidence: {weatherConsensus.consensus.confidence}</Badge> : null}</div><div className="text-sm">{weatherConsensus?.consensus?.summary || (liveWeather ? `${liveWeather.icon} ${liveWeather.condition}, high ${liveWeather.high}°F, rain ${liveWeather.precipProb}%, wind ${liveWeather.windMax} mph.` : "Weather analysis is still loading.")}</div>{weatherConsensus?.consensus?.recommendation ? <div className="text-sm text-muted-foreground mt-2">Recommendation: {weatherConsensus.consensus.recommendation}</div> : null}</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Forecast Sources Used</div><div className="space-y-2">{weatherConsensus?.sources?.length ? weatherConsensus.sources.map((source: any) => <div key={source.source} className="rounded-xl border border-border bg-background/60 p-3"><div className="font-medium text-sm">{source.source}</div><div className="text-xs text-muted-foreground mt-1">{source.summary}</div><div className="text-xs text-muted-foreground mt-1">{source.precipProb !== null && source.precipProb !== undefined ? `Rain: ${source.precipProb}%` : "Rain: n/a"}{source.windMax ? ` • Wind: ${source.windMax}` : ""}{source.tempHigh ? ` • High: ${source.tempHigh}°` : ""}</div></div>) : <div className="text-sm text-muted-foreground">No source comparison available yet.</div>}</div></div>
                <div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">How The Result Was Determined</div><div className="space-y-2 text-sm"><div className="rounded-xl border border-border bg-background/60 p-3">OpsSlate compares Open-Meteo, National Weather Service forecast data, NWS active alerts, and a local radar-style signal proxy.</div><div className="rounded-xl border border-border bg-background/60 p-3">It checks precipitation probability, wind, severe alerts, and whether sources agree or conflict.</div><div className="rounded-xl border border-border bg-background/60 p-3">The final weather risk is raised when severe alerts exist, rain probability spikes, or wind reaches operational thresholds for deliveries, lifts, and exterior work.</div></div></div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Active Alerts / Inputs</div><div className="space-y-2">{weatherConsensus?.activeAlerts?.length ? weatherConsensus.activeAlerts.map((alert: any, idx: number) => <div key={`${alert.event}-${idx}`} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3"><div className="font-medium text-sm">{alert.event || "Weather Alert"}</div><div className="text-xs text-muted-foreground mt-1">{alert.headline || "Active advisory in the project area."}</div></div>) : liveWeatherAlerts.length ? liveWeatherAlerts.map((alert: any, idx: number) => <div key={`${alert.type}-${idx}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><div className="font-medium text-sm">{alert.type}</div><div className="text-xs text-muted-foreground mt-1">{alert.message}</div></div>) : <div className="text-sm text-muted-foreground">No active weather alerts are driving the current result.</div>}</div></div>
            </div>
          </div>
        </div>
      )}

      {showMapShare && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowMapShare(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between gap-3"><div><h3 className="font-bold text-lg">Share Project Location</h3><p className="text-xs text-muted-foreground mt-1">Choose which project contacts should receive this location by email.</p></div><Button variant="outline" size="sm" onClick={() => setShowMapShare(false)}>Close</Button></div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{[p.address, p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", ")}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {briefRecipients.map((person) => {
                  const checked = selectedMapRecipients.includes(person.email);
                  return <label key={person.id} className={`rounded-xl border p-3 cursor-pointer ${checked ? "border-blue-500/40 bg-blue-500/10" : "border-border bg-secondary/20"}`}><div className="flex items-start gap-3"><input type="checkbox" checked={checked} onChange={(e) => setSelectedMapRecipients((prev) => e.target.checked ? [...prev, person.email] : prev.filter((x) => x !== person.email))} className="mt-1" /><div><div className="text-sm font-medium">{person.name}</div><div className="text-xs text-muted-foreground">{person.email}</div>{person.role ? <div className="text-[11px] text-muted-foreground mt-1">{person.role}</div> : null}</div></div></label>;
                })}
                {briefRecipients.length === 0 && <div className="text-sm text-muted-foreground">No project contacts with email yet.</div>}
              </div>
            </div>
            <div className="p-4 border-t border-border flex items-center justify-between gap-3"><div className="text-xs text-muted-foreground">{selectedMapRecipients.length} recipient{selectedMapRecipients.length === 1 ? "" : "s"} selected</div><Button disabled={sendingMapShare || selectedMapRecipients.length === 0 || !user} onClick={async () => { if (!user) return; setSendingMapShare(true); try { const addr = [p.address, p.city || p.town || p.location, p.state, p.zip].filter(Boolean).join(", "); const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`; await sendEmail({ companyId: user.companyId, to: selectedMapRecipients.join(", "), subject: `${p.name} — Project Location`, body: [`Project: ${p.name}`, ``, `Location`, addr, ``, `Map Link`, mapsUrl].join("\n"), projectId: p._id, senderName: "OpsSlate Project Location" }); setShowMapShare(false); setSelectedMapRecipients([]); alert("Project location sent."); } catch { alert("Failed to send project location."); } finally { setSendingMapShare(false); } }}>
              {sendingMapShare ? "Sending..." : "Send Location"}
            </Button></div>
          </div>
        </div>
      )}

      {showBriefSender && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBriefSender(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between gap-3"><div><h3 className="font-bold text-lg">Send Project Brief</h3><p className="text-xs text-muted-foreground mt-1">Choose which project contacts should receive today&apos;s command brief by email.</p></div><Button variant="outline" size="sm" onClick={() => setShowBriefSender(false)}>Close</Button></div>
            <div className="p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {briefRecipients.map((person) => {
                  const checked = selectedBriefRecipients.includes(person.email);
                  return <label key={person.id} className={`rounded-xl border p-3 cursor-pointer ${checked ? "border-blue-500/40 bg-blue-500/10" : "border-border bg-secondary/20"}`}><div className="flex items-start gap-3"><input type="checkbox" checked={checked} onChange={(e) => setSelectedBriefRecipients((prev) => e.target.checked ? [...prev, person.email] : prev.filter((x) => x !== person.email))} className="mt-1" /><div><div className="text-sm font-medium">{person.name}</div><div className="text-xs text-muted-foreground">{person.email}</div>{person.role ? <div className="text-[11px] text-muted-foreground mt-1">{person.role}</div> : null}</div></div></label>;
                })}
                {briefRecipients.length === 0 && <div className="text-sm text-muted-foreground">No project contacts with email yet.</div>}
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm"><div className="font-medium mb-2">Email preview</div><div className="space-y-1 text-muted-foreground"><div>Project: {p.name}</div><div>Weather: {liveWeather ? `${liveWeather.icon} ${liveWeather.condition}, high ${liveWeather.high}°F, rain ${liveWeather.precipProb}%, wind ${liveWeather.windMax} mph` : "Weather not available yet"}</div>{commandBrief.slice(0,3).map((line) => <div key={line}>• {line}</div>)}</div></div>
            </div>
            <div className="p-4 border-t border-border flex items-center justify-between gap-3"><div className="text-xs text-muted-foreground">{selectedBriefRecipients.length} recipient{selectedBriefRecipients.length === 1 ? "" : "s"} selected</div><Button disabled={sendingBrief || selectedBriefRecipients.length === 0} onClick={async () => { if (!user) return; setSendingBrief(true); try { await sendEmail({ companyId: user.companyId, to: selectedBriefRecipients.join(", "), subject: `${p.name} — Daily Project Command Brief`, body: [`Project: ${p.name}`, `Date: ${new Date().toLocaleDateString()}`, ``, `Weather`, liveWeather ? `${liveWeather.icon} ${liveWeather.condition}, high ${liveWeather.high}°F, low ${liveWeather.low}°F, rain ${liveWeather.precipProb}%, wind ${liveWeather.windMax} mph` : "Weather not available yet", ``, `Today’s Command Brief`, ...commandBrief.map((line) => `- ${line}`), ``, `Recommended Actions`, ...nextActions.slice(0,3).map((item) => `- ${item.title}: ${item.desc}`)].join("\n"), projectId: p._id, senderName: "OpsSlate Project Brief" }); setShowBriefSender(false); setSelectedBriefRecipients([]); alert("Project brief sent."); } catch (e) { alert("Failed to send project brief."); } finally { setSendingBrief(false); } }}>Send Brief</Button></div>
          </div>
        </div>
      )}

      {showProjectSwitcher && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">🔀 Switch Project</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowProjectSwitcher(false); setSwitcherSearch(""); }}>✕</Button>
            </div>
            <div className="p-3 border-b border-border space-y-3">
              <Input placeholder="Search projects..." value={switcherSearch} onChange={(e) => setSwitcherSearch(e.target.value)} autoFocus />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort by</span>
                <select
                  value={switcherSort}
                  onChange={(e) => setSwitcherSort(e.target.value as "name" | "jobNumber" | "city" | "zip")}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="name">Project Name</option>
                  <option value="jobNumber">Job Number</option>
                  <option value="city">City/Town</option>
                  <option value="zip">Zip</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {((allProjects || []) as any[])
                .filter((proj) => proj.status !== "Inactive" && proj.status !== "Archived")
                .filter((proj) => {
                  if (!switcherSearch) return true;
                  const q = switcherSearch.toLowerCase();
                  return [proj.name, proj.code, proj.city, proj.town, proj.zip, proj.location]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(q));
                })
                .sort((a, b) => {
                  const normalize = (value: any) => String(value ?? "").trim().toLowerCase();
                  const aCity = normalize(a.city || a.town || a.location);
                  const bCity = normalize(b.city || b.town || b.location);
                  const aName = normalize(a.name);
                  const bName = normalize(b.name);
                  const aCode = normalize(a.code);
                  const bCode = normalize(b.code);
                  const aZip = normalize(a.zip || a.zipCode);
                  const bZip = normalize(b.zip || b.zipCode);

                  if (switcherSort === "jobNumber") {
                    return aCode.localeCompare(bCode) || aName.localeCompare(bName);
                  }
                  if (switcherSort === "city") {
                    return aCity.localeCompare(bCity) || aName.localeCompare(bName);
                  }
                  if (switcherSort === "zip") {
                    return aZip.localeCompare(bZip) || aName.localeCompare(bName);
                  }
                  return aName.localeCompare(bName) || aCode.localeCompare(bCode);
                })
                .map((proj) => (
                  <Link
                    key={proj._id}
                    href={`/job/${proj._id}`}
                    onClick={() => { setShowProjectSwitcher(false); setSwitcherSearch(""); }}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors border-b border-border/30 ${proj._id === id ? "bg-orange-500/10" : ""}`}
                  >
                    <span className="text-lg">{proj._id === id ? "📍" : "📁"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{proj.name}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                        {proj.code && <span>#{proj.code}</span>}
                        {(proj.city || proj.town || proj.location) && <span>📌 {proj.city || proj.town || proj.location}</span>}
                        {(proj.zip || proj.zipCode) && <span>{proj.zip || proj.zipCode}</span>}
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${
                      proj.status === "Active" ? "bg-green-500/20 text-green-400" :
                      proj.status === "Bid" ? "bg-purple-500/20 text-purple-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>{proj.status || "Active"}</Badge>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Summary Modal */}
      {dailySummary && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">📊 Daily Project Summary</h3>
              <Button variant="ghost" size="sm" onClick={() => setDailySummary(null)}>✕</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {dailySummary.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold mb-2">{line.replace("# ", "")}</h2>;
                  if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold mt-4 mb-1 text-orange-400">{line.replace("## ", "")}</h3>;
                  if (line.startsWith("**") && line.includes("**")) return <p key={i} className="font-medium text-base mb-1">{line.replace(/\*\*/g, "")}</p>;
                  if (line.startsWith("- ")) return <p key={i} className="ml-3 my-0.5">• {line.slice(2).replace(/\*\*/g, "").replace(/\*/g, "")}</p>;
                  if (line.startsWith("*") && line.endsWith("*")) return <p key={i} className="text-muted-foreground italic text-xs mt-2">{line.replace(/\*/g, "")}</p>;
                  if (line.startsWith("---")) return <hr key={i} className="border-border my-3" />;
                  return <p key={i}>{line}</p>;
                })}
              </div>
            </div>
            <div className="p-3 border-t border-border flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(dailySummary.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,3} /g, ""));
                alert("Copied to clipboard!");
              }}>📋 Copy</Button>
              <Button variant="outline" size="sm" onClick={() => setDailySummary(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Directory Picker */}
      {showVendorPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">📋 Add from Vendor Directory</h3>
                <p className="text-xs text-muted-foreground mt-1">Select an existing contact to add to this project</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowVendorPicker(false); setVendorSearch(""); }}>✕</Button>
            </div>
            <div className="p-3 border-b border-border">
              <Input
                placeholder="Search vendors by name, company, trade..."
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {(() => {
                const term = vendorSearch.toLowerCase();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const filtered = ((vendors || []) as any[]).filter((v) =>
                  !term ||
                  String(v.name || "").toLowerCase().includes(term) ||
                  String(v.contactName || "").toLowerCase().includes(term) ||
                  String(v.category || "").toLowerCase().includes(term) ||
                  String(v.email || "").toLowerCase().includes(term)
                );
                // Check which vendors are already on this project
                const existingNames = new Set(((contacts || []) as any[]).map((c) =>
                  [c.firstName, c.lastName].filter(Boolean).join(" ").toLowerCase()
                ));
                if (filtered.length === 0) return <p className="text-center text-muted-foreground py-8 text-sm">No vendors found. Add contacts using &quot;+ New&quot; and they&apos;ll appear here for future projects.</p>;
                return filtered.map((v: any) => {
                  const name = (v.contactName as string) || (v.name as string) || "";
                  const alreadyAdded = existingNames.has(name.toLowerCase());
                  return (
                    <div
                      key={v._id as string}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${alreadyAdded ? "opacity-50 bg-green-500/5" : "hover:bg-secondary/60"}`}
                      onClick={async () => {
                        if (alreadyAdded) return;
                        const parts = name.split(" ");
                        const firstName = parts[0] || "";
                        const lastName = parts.slice(1).join(" ") || "";
                        const searchText = [firstName, lastName, v.name as string].join(" ");
                        const detected = detectTradeAndRole(searchText);
                        await createContact({
                          projectId: id as Id<"projects">,
                          firstName,
                          lastName,
                          company: (v.name as string) || "",
                          role: detected.role || (v.category as string) || "",
                          trade: detected.trade || (v.category as string) || "",
                          phone: (v.phone as string) || "",
                          email: (v.email as string) || "",
                          notes: (v.notes as string) || "",
                          status: "Active",
                        });
                        setShowVendorPicker(false);
                        setVendorSearch("");
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                        {alreadyAdded ? "✅" : "👤"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{name || (v.name as string)}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                          {v.name && v.name !== name && <span>{v.name as string}</span>}
                          {v.category && <Badge variant="outline" className="text-[10px]">{v.category as string}</Badge>}
                          {v.phone && <span>📞 {v.phone as string}</span>}
                        </div>
                      </div>
                      {alreadyAdded && <span className="text-xs text-green-400">Already on team</span>}
                    </div>
                  );
                });
              })()}
            </div>
            <div className="p-3 border-t border-border flex justify-between">
              <Button variant="outline" size="sm" onClick={() => { setShowVendorPicker(false); setVendorSearch(""); }}>Cancel</Button>
              <Button size="sm" onClick={() => { setShowVendorPicker(false); setVendorSearch(""); setContactModal({ mode: "create" }); }}>+ Add New Instead</Button>
            </div>
          </div>
        </div>
      )}

      {contactModal && (
        <CrudModal
          title={contactModal.mode === "edit" ? "Edit Contact" : "Add Contact"}
          fields={contactFields}
          initialValues={contactModal.data}
          onSave={handleContactSave}
          onClose={() => setContactModal(null)}
          onDelete={contactModal.mode === "edit" ? async () => { await removeContact({ id: contactModal.data!._id as Id<"contacts"> }); } : undefined}
        />
      )}

      {/* Email Panel Fullscreen */}
      {showEmailPanel && (
        <div className="fixed inset-0 bg-[#0b0f14] z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setShowEmailPanel(false)}>← Back</Button>
            <span className="text-xl">📧</span>
            <div className="flex-1">
              <p className="font-bold text-sm">Project Emails</p>
              <p className="text-[10px] text-muted-foreground">{(data as any)?.project?.name}</p>
            </div>
            <Badge variant="secondary" className="text-xs">{emails?.length || 0} emails</Badge>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 py-2 border-b border-border shrink-0">
            {([
              { key: "inbox", label: "📥 Inbox", icon: "" },
              { key: "compose", label: "✏️ Compose", icon: "" },
              { key: "upload", label: "📤 Upload", icon: "" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setEmailTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${emailTab === key ? "bg-orange-500 text-white" : "bg-secondary/50 text-muted-foreground"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* INBOX TAB */}
          {emailTab === "inbox" && (
            <div className="flex-1 overflow-y-auto">
              {/* Search + Scan */}
              <div className="flex gap-2 p-3 border-b border-border">
                <Input placeholder="Search emails..." value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)} className="flex-1 bg-secondary text-sm" />
                <Button size="sm" variant="outline" className="text-xs border-blue-500/30 shrink-0" disabled={scanningRepoEmails}
                  onClick={async () => {
                    if (!user || !id || !allRepoEmails) return;
                    setScanningRepoEmails(true);
                    const pName = (data as any)?.project?.name?.toLowerCase() || "";
                    const pCode = (data as any)?.project?.code?.toLowerCase() || "";
                    const pAddr = (data as any)?.project?.address?.toLowerCase() || "";
                    let moved = 0;
                    for (const email of allRepoEmails) {
                      if (email.projectId === id) continue;
                      const text = `${email.subject || ""} ${email.body || ""} ${email.from || ""}`.toLowerCase();
                      if ((pName.length > 3 && text.includes(pName)) || (pCode.length > 2 && text.includes(pCode)) || (pAddr.length > 5 && text.includes(pAddr))) {
                        await updateEmailRecord({ id: email._id, projectId: id, pipelineStatus: "assigned" });
                        moved++;
                      }
                    }
                    alert(moved > 0 ? `📧 Moved ${moved} email${moved > 1 ? "s" : ""}!` : "No new matching emails found.");
                    setScanningRepoEmails(false);
                  }}>
                  {scanningRepoEmails ? "🔄" : "🔍"} Scan Repository
                </Button>
              </div>

              {/* Email List */}
              <div className="p-3 space-y-1.5">
                {(() => {
                  const sorted = [...(emails || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
                  const searched = emailSearch ? sorted.filter((e) => `${e.subject} ${e.from} ${e.body}`.toLowerCase().includes(emailSearch.toLowerCase())) : sorted;
                  if (searched.length === 0) return (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-sm">{emailSearch ? "No emails match your search" : "No emails yet — tap 🔍 Scan Repository to find them"}</p>
                    </div>
                  );
                  return searched.map((e: any) => {
                    const isExp = expandedEmail === e._id;
                    return (
                      <div key={e._id}>
                        <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${isExp ? "bg-orange-500/10 border-orange-500/30" : "bg-secondary/20 border-border hover:bg-secondary/40"}`}
                          onClick={() => setExpandedEmail(isExp ? null : e._id)}>
                          <span className="text-sm mt-0.5">{e.hasAttachments ? "📎" : "📧"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{e.subject || "(No Subject)"}</p>
                            <p className="text-xs text-muted-foreground">{e.from} • {e.date}</p>
                          </div>
                        </div>
                        {isExp && (
                          <div className="ml-6 mt-1 mb-2 bg-card border border-border rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">From:</span> {e.from}</div>
                              <div><span className="text-muted-foreground">To:</span> {e.to || "—"}</div>
                              <div><span className="text-muted-foreground">Date:</span> {e.date}</div>
                              <div><span className="text-muted-foreground">Source:</span> {e.source || "—"}</div>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3 max-h-60 overflow-auto">{e.body || "(No body)"}</pre>
                            {e.aiSummary && (
                              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                                <p className="text-[10px] font-bold text-purple-400">🧠 AI Summary</p>
                                <p className="text-xs">{e.aiSummary}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* COMPOSE TAB */}
          {emailTab === "compose" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                <p className="text-xs text-yellow-400 font-bold">⚠️ DRAFT ONLY — Requires administrator approval to send</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input value={composeEmail.to} onChange={(e) => setComposeEmail({ ...composeEmail, to: e.target.value })} placeholder="recipient@email.com" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <Input value={composeEmail.subject} onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })} placeholder="Email subject..." className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Body</label>
                <textarea
                  value={composeEmail.body}
                  onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                  placeholder="Type your email..."
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-h-[250px] resize-y"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={async () => {
                  if (!user || !composeEmail.subject) return;
                  await createEmail({
                    companyId: user.companyId as string,
                    projectId: id,
                    subject: `[DRAFT] ${composeEmail.subject}`,
                    from: user.name || user.email || "Draft",
                    to: composeEmail.to || "",
                    date: new Date().toISOString().slice(0, 10),
                    body: composeEmail.body,
                    source: "Draft",
                    category: "outgoing",
                    isRead: true,
                  } as any);
                  setComposeEmail({ to: "", subject: "", body: "" });
                  alert("✅ Draft saved to project emails!");
                  setEmailTab("inbox");
                }}>
                  💾 Save Draft
                </Button>
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(`To: ${composeEmail.to}\nSubject: ${composeEmail.subject}\n\n${composeEmail.body}`);
                  alert("Copied to clipboard!");
                }}>
                  📋 Copy
                </Button>
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {emailTab === "upload" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!uploadResult ? (
                <>
                  {/* Drag & Drop Zone */}
                  <div
                    id="email-drop-zone"
                    className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-orange-500/50 transition-colors cursor-pointer"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).classList.add("border-orange-500", "bg-orange-500/10"); }}
                    onDragLeave={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.remove("border-orange-500", "bg-orange-500/10"); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).classList.remove("border-orange-500", "bg-orange-500/10");
                      if (!user) return;

                      const files = Array.from(e.dataTransfer.files);
                      // Try all text formats Outlook might provide
                      const textPlain = e.dataTransfer.getData("text/plain") || "";
                      const textHtml = e.dataTransfer.getData("text/html") || "";
                      const textUri = e.dataTransfer.getData("text/uri-list") || "";

                      // Strip HTML tags to get plain text from HTML content
                      const htmlToText = (html: string) => {
                        const tmp = document.createElement("div");
                        tmp.innerHTML = html;
                        return tmp.textContent || tmp.innerText || "";
                      };

                      let emailText = textPlain || htmlToText(textHtml) || textUri;

                      // Handle dropped files
                      const attachmentFiles: File[] = [];
                      for (const file of files) {
                        const ext = file.name.toLowerCase().split(".").pop() || "";
                        if (ext === "eml" || ext === "msg" || ext === "txt") {
                          const text = await file.text();
                          emailText += "\n" + text;
                        } else {
                          attachmentFiles.push(file);
                        }
                      }

                      // Upload attachments
                      let attachmentsUploaded = 0;
                      for (const file of attachmentFiles) {
                        if (file.size > 20 * 1024 * 1024) continue;
                        try {
                          const url = await genUploadUrl();
                          const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                          const { storageId } = await res.json();
                          await createDoc({ companyId: user.companyId, projectId: id as any, name: file.name, category: "Correspondence", url: `storage://${storageId}`, storageId, fileSize: file.size, uploadedBy: user.name });
                          attachmentsUploaded++;
                        } catch {}
                      }

                      if (emailText.trim().length < 10 && attachmentsUploaded > 0) {
                        alert(`📎 ${attachmentsUploaded} attachment${attachmentsUploaded !== 1 ? "s" : ""} uploaded to Documents.\n\nFor the email itself: in Outlook, open the email → Select All (Ctrl+A) → Copy (Ctrl+C) → tap the "📋 Paste from Clipboard" button below.`);
                        return;
                      }
                      if (emailText.trim().length < 10) {
                        alert("Outlook doesn't share email content via drag.\n\nInstead:\n1. Open the email in Outlook\n2. Select All (Ctrl+A) → Copy (Ctrl+C)\n3. Tap the \"📋 Paste from Clipboard\" button below");
                        return;
                      }

                      setUploadProcessing(true);
                      try {
                        const result = await processRawEmail({ companyId: user.companyId, projectId: id, rawText: emailText.trim() });
                        if (attachmentsUploaded > 0) (result as any).attachmentsUploaded = attachmentsUploaded;
                        setUploadResult(result);
                      } catch {
                        const result = await fallbackSaveUploadedEmail(emailText.trim(), attachmentsUploaded);
                        setUploadResult(result as any);
                      }
                      setUploadProcessing(false);
                    }}
                    onClick={() => document.getElementById("email-file-input")?.click()}
                  >
                    {uploadProcessing ? (
                      <div className="space-y-2">
                        <p className="text-3xl animate-spin">🔄</p>
                        <p className="text-sm font-medium">AI processing email...</p>
                        <p className="text-xs text-muted-foreground">Extracting contacts, tasks, schedules, issues</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-3xl">📧</p>
                        <p className="text-sm font-medium">Drag & drop email here</p>
                        <p className="text-xs text-muted-foreground">Drop .eml files, drag from Outlook, or drop attachments</p>
                        <p className="text-xs text-muted-foreground">— or tap to select files —</p>
                      </div>
                    )}
                  </div>
                  <input id="email-file-input" type="file" multiple accept=".eml,.msg,.txt,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" className="hidden"
                    onChange={async (e) => {
                      if (!e.target.files || !user) return;
                      const files = Array.from(e.target.files);
                      const attachments: File[] = [];
                      let emailText = "";
                      for (const file of files) {
                        const ext = file.name.toLowerCase().split(".").pop() || "";
                        if (ext === "eml" || ext === "msg" || ext === "txt") {
                          emailText += "\n" + await file.text();
                        } else {
                          attachments.push(file);
                        }
                      }
                      let attachmentsUploaded = 0;
                      for (const file of attachments) {
                        if (file.size > 20 * 1024 * 1024) continue;
                        try {
                          const url = await genUploadUrl();
                          const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                          const { storageId } = await res.json();
                          await createDoc({ companyId: user.companyId, projectId: id as any, name: file.name, category: "Correspondence", url: `storage://${storageId}`, storageId, fileSize: file.size, uploadedBy: user.name });
                          attachmentsUploaded++;
                        } catch {}
                      }
                      if (emailText.trim().length >= 10) {
                        setUploadProcessing(true);
                        try {
                          const result = await processRawEmail({ companyId: user.companyId, projectId: id, rawText: emailText.trim() });
                          if (attachmentsUploaded > 0) (result as any).attachmentsUploaded = attachmentsUploaded;
                          setUploadResult(result);
                        } catch {
                          const result = await fallbackSaveUploadedEmail(emailText.trim(), attachmentsUploaded);
                          setUploadResult(result as any);
                        }
                        setUploadProcessing(false);
                      } else if (attachmentsUploaded > 0) {
                        alert(`📎 ${attachmentsUploaded} file${attachmentsUploaded !== 1 ? "s" : ""} uploaded to Documents.`);
                      }
                    }}
                  />

                  {/* Attachments */}
                  <div className="border border-dashed border-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-muted-foreground">📎 Attachments ({emailAttachments.length})</span>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); emailAttachmentInputRef.current?.click(); }}>
                        + Add Files
                      </Button>
                      <input ref={emailAttachmentInputRef} id="attach-input" type="file" multiple className="hidden" onChange={(e) => {
                        if (e.target.files) setEmailAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
                        e.target.value = "";
                      }} />
                    </div>
                    {emailAttachments.length > 0 ? (
                      <div className="space-y-1">
                        {emailAttachments.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5">
                            <span>{f.name.match(/\.pdf$/i) ? "📕" : f.name.match(/\.(doc|docx)$/i) ? "📘" : f.name.match(/\.(xls|xlsx)$/i) ? "📗" : f.name.match(/\.(jpg|jpeg|png)$/i) ? "🖼️" : "📄"}</span>
                            <span className="flex-1 truncate">{f.name}</span>
                            <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)}KB</span>
                            <button className="text-red-400 hover:text-red-300" onClick={() => setEmailAttachments((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-1">Save email attachments from Outlook to desktop, then add them here</p>
                    )}
                  </div>

                  {/* Quick paste from clipboard */}
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                    disabled={uploadProcessing}
                    onClick={async () => {
                      if (!user) return;
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (!clipText || clipText.trim().length < 10) {
                          if (emailAttachments.length > 0) {
                            // Just upload attachments without email text
                            setUploadProcessing(true);
                            let attached = 0;
                            for (const file of emailAttachments) {
                              if (file.size > 20 * 1024 * 1024) continue;
                              try {
                                const url = await genUploadUrl();
                                const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                                const { storageId } = await res.json();
                                await createDoc({ companyId: user.companyId, projectId: id as any, name: file.name, category: "Correspondence", url: `storage://${storageId}`, storageId, fileSize: file.size, uploadedBy: user.name });
                                attached++;
                              } catch {}
                            }
                            setEmailAttachments([]);
                            setUploadProcessing(false);
                            alert(`📎 ${attached} attachment${attached !== 1 ? "s" : ""} saved to Documents.`);
                            return;
                          }
                          alert("Nothing in clipboard. Copy email text first (Ctrl+A → Ctrl+C in Outlook).");
                          return;
                        }
                        setUploadProcessing(true);
                        // Upload attachments first
                        let attached = 0;
                        const attachNames: string[] = [];
                        for (const file of emailAttachments) {
                          if (file.size > 20 * 1024 * 1024) continue;
                          try {
                            const url = await genUploadUrl();
                            const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                            const { storageId } = await res.json();
                            await createDoc({ companyId: user.companyId, projectId: id as any, name: file.name, category: "Correspondence", url: `storage://${storageId}`, storageId, fileSize: file.size, uploadedBy: user.name });
                            attached++;
                            attachNames.push(file.name);
                          } catch {}
                        }
                        // Process email text
                        try {
                          const result = await processRawEmail({ companyId: user.companyId, projectId: id, rawText: clipText.trim() });
                          if (attached > 0) (result as any).attachmentsUploaded = attached;
                          setUploadResult(result);
                        } catch {
                          const result = await fallbackSaveUploadedEmail(clipText.trim(), attached);
                          setUploadResult(result as any);
                        }
                        setEmailAttachments([]);
                      } catch {
                        alert("Clipboard access denied. Use the text box below.");
                      }
                      setUploadProcessing(false);
                    }}>
                    {uploadProcessing ? (
                      <span className="flex items-center gap-2"><span className="animate-spin">🔄</span> AI processing...</span>
                    ) : `📋 Paste from Clipboard & Process${emailAttachments.length > 0 ? ` (+ ${emailAttachments.length} files)` : ""}`}
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">Copy email text in Outlook (Ctrl+A → Ctrl+C), add attachments above, then tap the button</p>

                  {/* Or manual paste */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-xs text-muted-foreground">or paste manually</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <textarea
                    id="paste-email"
                    placeholder="Paste email text here..."
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-h-[100px] resize-y font-mono"
                  />
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    disabled={uploadProcessing}
                    onClick={async () => {
                      const rawText = (document.getElementById("paste-email") as HTMLTextAreaElement)?.value || "";
                      if (!rawText.trim() || rawText.trim().length < 10) { alert("Paste an email first"); return; }
                      if (!user) return;
                      setUploadProcessing(true);
                      // Upload attachments
                      let attached = 0;
                      for (const file of emailAttachments) {
                        if (file.size > 20 * 1024 * 1024) continue;
                        try {
                          const url = await genUploadUrl();
                          const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                          const { storageId } = await res.json();
                          await createDoc({ companyId: user.companyId, projectId: id as any, name: file.name, category: "Correspondence", url: `storage://${storageId}`, storageId, fileSize: file.size, uploadedBy: user.name });
                          attached++;
                        } catch {}
                      }
                      try {
                        const result = await processRawEmail({ companyId: user.companyId, projectId: id, rawText: rawText.trim() });
                        if (attached > 0) (result as any).attachmentsUploaded = attached;
                        setUploadResult(result);
                      } catch {
                        const result = await fallbackSaveUploadedEmail(rawText.trim(), attached);
                        setUploadResult(result as any);
                      }
                      setEmailAttachments([]);
                      setUploadProcessing(false);
                    }}>
                    🧠 Process & Save{emailAttachments.length > 0 ? ` (+ ${emailAttachments.length} files)` : ""}
                  </Button>
                </>
              ) : (
                /* Results */
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                    <p className="text-2xl mb-1">✅</p>
                    <p className="font-bold text-sm">Email Processed & Saved</p>
                  </div>

                  {/* Extracted Email Info */}
                  <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-sm">
                    <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{uploadResult.email?.from || "?"}</span></div>
                    <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{uploadResult.email?.to || "?"}</span></div>
                    {uploadResult.email?.cc && <div><span className="text-muted-foreground">CC:</span> <span>{uploadResult.email.cc}</span></div>}
                    <div><span className="text-muted-foreground">Date:</span> <span>{uploadResult.email?.date || "?"}</span></div>
                    <div><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{uploadResult.email?.subject || "?"}</span></div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-400">{uploadResult.contactsAdded || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Contacts Added</p>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-400">{uploadResult.tasksCreated || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Tasks Created</p>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-400">{uploadResult.datesFound || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Schedule Dates</p>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-red-400">{uploadResult.issuesLogged || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Issues Flagged</p>
                    </div>
                  </div>
                  {uploadResult.attachmentsUploaded > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-sm">📎 {uploadResult.attachmentsUploaded} attachment{uploadResult.attachmentsUploaded !== 1 ? "s" : ""} saved to Documents</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => { setUploadResult(null); setEmailTab("inbox"); }}>📥 View Inbox</Button>
                    <Button variant="outline" className="flex-1" onClick={() => setUploadResult(null)}>📤 Upload Another</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Project Attachments / Documents */}
      <Card id="project-attachments" className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base cursor-pointer select-none" onClick={() => toggleSection("attachments")}>
              <span className="text-sm mr-1">{collapsedSections["attachments"] ? "▶" : "▼"}</span>📎 Attachments
              {projectDocs && projectDocs.length > 0 && <Badge variant="secondary" className="text-[10px] ml-2">{projectDocs.length}</Badge>}
            </CardTitle>
            {!collapsedSections["attachments"] && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => document.getElementById("proj-doc-input")?.click()} disabled={docUploading}>
                  {docUploading ? "🔄" : "📤"} Upload
                </Button>
                <Link href="/documents"><Button size="sm" variant="outline" className="text-xs h-7">📁 All Docs</Button></Link>
              </div>
            )}
          </div>
        </CardHeader>
        {!collapsedSections["attachments"] && (
          <CardContent>
            <input id="proj-doc-input" type="file" multiple className="hidden" onChange={async (e) => {
              if (!e.target.files || !user) return;
              setDocUploading(true);
              for (const file of Array.from(e.target.files)) {
                if (file.size > 20 * 1024 * 1024) continue;
                try {
                  const url = await genUploadUrl();
                  const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                  const { storageId } = await res.json();
                  await createDoc({ companyId: user.companyId, projectId: id as any, name: file.name, category: detectDocCategory(file.name), url: `storage://${storageId}`, storageId, fileSize: file.size, uploadedBy: user.name });
                } catch {}
              }
              setDocUploading(false);
              e.target.value = "";
            }} />
            {projectDocs && projectDocs.length > 0 ? (
              <div className="space-y-1">
                {projectDocs.sort((a: any, b: any) => (b._creationTime || 0) - (a._creationTime || 0)).map((doc: any) => (
                  <div key={doc._id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/20 border border-border hover:bg-secondary/40 transition-colors group">
                    <span className="text-sm">
                      {doc.name?.match(/\.pdf$/i) ? "📕" : doc.name?.match(/\.(doc|docx)$/i) ? "📘" : doc.name?.match(/\.(xls|xlsx)$/i) ? "📗" : doc.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "🖼️" : "📄"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{doc.name}</p>
                      <div className="text-[10px] text-muted-foreground">
                        <Badge variant="secondary" className="text-[8px] mr-1">{doc.category}</Badge>
                        {doc.fileSize && `${(doc.fileSize / 1024).toFixed(0)}KB`}
                        {doc.aiStatus === "complete" && <span className="text-green-400 ml-1">✅ AI Read</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {doc.storageId && (
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 opacity-70 hover:opacity-100" onClick={async () => {
                          // Get URL and open
                          try {
                            const url = doc.url?.startsWith("http") ? doc.url : null;
                            if (url) window.open(url, "_blank");
                            else alert("Preview not available — open from Documents page");
                          } catch {}
                        }}>👁️</Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs h-6 px-1.5 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => {
                        if (confirm(`Delete ${doc.name}?`)) removeDoc({ id: doc._id });
                      }}>✕</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p className="text-2xl mb-2">📎</p>
                <p>No attachments yet</p>
                <p className="text-xs mt-1">Upload files or add attachments when uploading emails</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Project Emails */}
      <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base cursor-pointer select-none" onClick={() => toggleSection("comms")}>
                <span className="text-sm mr-1">{collapsedSections["comms"] ? "▶" : "▼"}</span>📧 Project Emails
                {emails && emails.length > 0 && <Badge variant="secondary" className="text-[10px] ml-2">{emails.length}</Badge>}
              </CardTitle>
              {!collapsedSections["comms"] && (
                <Button size="sm" variant="outline" className="text-xs border-blue-500/30 hover:bg-blue-500/10" disabled={scanningRepoEmails}
                  onClick={async () => {
                    if (!user || !id || !allRepoEmails) return;
                    setScanningRepoEmails(true);
                    try {
                      const projectName = (data as any)?.project?.name?.toLowerCase() || "";
                      const projectCode = (data as any)?.project?.code?.toLowerCase() || "";
                      const projectAddress = (data as any)?.project?.address?.toLowerCase() || "";
                      let moved = 0;
                      for (const email of allRepoEmails) {
                        if (email.projectId === id) continue;
                        const text = `${email.subject || ""} ${email.body || ""} ${email.from || ""}`.toLowerCase();
                        const matches = (projectName && projectName.length > 3 && text.includes(projectName)) ||
                          (projectCode && projectCode.length > 2 && text.includes(projectCode)) ||
                          (projectAddress && projectAddress.length > 5 && text.includes(projectAddress));
                        if (matches) {
                          await updateEmailRecord({ id: email._id, projectId: id, pipelineStatus: "assigned" });
                          moved++;
                        }
                      }
                      alert(moved > 0 ? `📧 Found and moved ${moved} email${moved > 1 ? "s" : ""} to this project!` : "No new emails found matching this project.");
                    } catch { alert("Scan failed"); }
                    setScanningRepoEmails(false);
                  }}>
                  {scanningRepoEmails ? "🔄 Scanning..." : "🔍 Find Project Emails"}
                </Button>
              )}
            </div>
          </CardHeader>
          {!collapsedSections["comms"] && (
          <CardContent>
            {emails && emails.length > 0 ? (
              <div className="space-y-1.5">
                {[...emails].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((e) => {
                  const eid = String(e._id);
                  const isExpanded = expandedEmail === eid;
                  const status = (e as any).pipelineStatus || "filed";
                  return (
                    <div key={eid}>
                      <div
                        className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${isExpanded ? "bg-orange-500/10 border-orange-500/30" : "bg-secondary/20 border-border hover:bg-secondary/40"}`}
                        onClick={() => setExpandedEmail(isExpanded ? null : eid)}
                      >
                        <span className="text-xs mt-1">{(e as any).hasAttachments ? "📎" : "📧"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{String(e.subject ?? "(No Subject)")}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {String(e.from ?? "")} • {String(e.date ?? "")}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {(e as any).processedByPm && <Badge variant="secondary" className="text-[9px]">🤖 {(e as any).processedByPm}</Badge>}
                          <Badge variant="secondary" className="text-[9px]">{status}</Badge>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="ml-6 mt-1 mb-2 bg-card border border-border rounded-lg p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">From:</span> {String(e.from)}</div>
                            <div><span className="text-muted-foreground">To:</span> {String(e.to || "—")}</div>
                            <div><span className="text-muted-foreground">Date:</span> {String(e.date)}</div>
                            <div><span className="text-muted-foreground">Source:</span> {String(e.source || "—")}</div>
                          </div>
                          <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3 max-h-60 overflow-auto">
                            {String(e.body ?? "(No body)")}
                          </pre>
                          {(e as any).aiSummary && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                              <p className="text-[10px] font-bold text-purple-400 mb-1">🧠 AI Summary</p>
                              <p className="text-xs">{(e as any).aiSummary}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <p className="text-2xl mb-2">📧</p>
              <p>No emails filed to this project yet.</p>
              <p className="text-xs mt-1">Tap <strong>🔍 Find Project Emails</strong> to scan the repository.</p>
            </div>
          )}
          </CardContent>
          )}
        </Card>
    </div>
  );
}

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (<AppShell><JobContent id={id} /></AppShell>);
}
