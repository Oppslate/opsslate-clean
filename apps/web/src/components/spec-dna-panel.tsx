"use client";

import { useMemo, useRef, useState } from "react";
import { Brain, Check, FileText, Filter, RefreshCw, Upload, X } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Input } from "@opsslate/suite-ui/input";
import type { Id } from "../../convex/_generated/dataModel";

const CATEGORY_TABS = [
  { key: "all", label: "Summary" },
  { key: "bid_requirement", label: "Bid Requirements" },
  { key: "scope_item", label: "Scope" },
  { key: "submittal", label: "Submittals" },
  { key: "task", label: "Tasks" },
  { key: "schedule_driver", label: "Schedule" },
  { key: "billing_rule", label: "Billing" },
  { key: "risk", label: "Risks / RFIs" },
];

const DESTINATION_FILTERS = [
  { key: "all", label: "All destinations" },
  { key: "estimating", label: "Estimating" },
  { key: "pm", label: "Project Management" },
  { key: "submittals", label: "Submittals" },
  { key: "schedule", label: "Schedule" },
  { key: "billing", label: "Billing" },
  { key: "rfi", label: "RFI" },
];

function categoryLabel(value: string) {
  return CATEGORY_TABS.find((tab) => tab.key === value)?.label || value.replace(/_/g, " ");
}

function confidenceTone(confidence?: number) {
  const value = confidence ?? 0;
  if (value >= 0.8) return "bg-green-500/15 text-green-300 border-green-500/30";
  if (value >= 0.55) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-red-500/15 text-red-300 border-red-500/30";
}

function looksLikeSpec(doc: any) {
  const haystack = `${doc.name || ""} ${doc.category || ""}`.toLowerCase();
  return /spec|project manual|book|division|section|contract/.test(haystack);
}

export function SpecDNAPanel({ companyId, projectId, userName, projectRole }: { companyId: Id<"companies">; projectId: Id<"projects">; userName?: string; projectRole?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [rfiDraftItem, setRfiDraftItem] = useState<any | null>(null);
  const [rfiDraft, setRfiDraft] = useState({
    subject: "",
    question: "",
    priority: "High",
    assignedTo: "",
    dateRequired: "",
    costImpact: false,
    scheduleImpact: false,
    notes: "",
  });
  const [submittalDraftItem, setSubmittalDraftItem] = useState<any | null>(null);
  const [submittalDraft, setSubmittalDraft] = useState({
    title: "",
    description: "",
    specSection: "",
    trade: "",
    priority: "Medium",
    reviewer: "",
    dueDate: "",
    itemNumber: "",
    notes: "",
    responsibleSubcontractorId: "",
    responsibleCompany: "",
    responsibleContact: "",
    responsibleEmail: "",
    responsiblePhone: "",
  });
  const [taskDraftItem, setTaskDraftItem] = useState<any | null>(null);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    impact: "",
    priority: "Medium",
    assignedTo: "",
    trade: "",
    phase: "",
    startDate: "",
    dateScheduled: "",
    blocker: "",
  });
  const [scheduleDraftItem, setScheduleDraftItem] = useState<any | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState({
    title: "",
    description: "",
    constraintType: "sequencing",
    priority: "Medium",
    trade: "",
    phase: "",
    startDate: "",
    dueDate: "",
    leadTimeDays: "",
    reviewPeriodDays: "",
    blockingRule: "",
    relatedTaskId: "",
  });
  const [paymentRuleDraftItem, setPaymentRuleDraftItem] = useState<any | null>(null);
  const [paymentRuleDraft, setPaymentRuleDraft] = useState({
    title: "",
    ruleType: "payment",
    description: "",
    measurementLanguage: "",
    backupDocumentation: "",
    storedMaterialRule: "",
    retainageRule: "",
    certifiedPayrollRequired: false,
    unitPriceRule: "",
    payItemNotes: "",
    trade: "",
    phase: "",
    priority: "Medium",
  });
  const [estimateRequirementDraftItem, setEstimateRequirementDraftItem] = useState<any | null>(null);
  const [estimateRequirementDraft, setEstimateRequirementDraft] = useState({
    title: "",
    requirementType: "bid_requirement",
    description: "",
    allowance: "",
    alternate: "",
    exclusion: "",
    wageRule: "",
    bondRule: "",
    taxRule: "",
    dbeRule: "",
    liquidatedDamagesRule: "",
    scopeAssumption: "",
    trade: "",
    phase: "",
    priority: "Medium",
  });

  const documents = useQuery(api.docManager.list, { companyId, projectId }) as any[] | undefined;
  const subcontractors = useQuery(api.subcontractors.list, { companyId }) as any[] | undefined;
  const runs = useQuery((api as any).specDNA.listRuns, { projectId }) as any[] | undefined;
  const latestRun = runs?.[0];
  const items = useQuery((api as any).specDNA.listItems, latestRun?._id ? { runId: latestRun._id } : "skip") as any[] | undefined;
  const generateUrl = useMutation(api.siteMedia.generateUploadUrl);
  const createDoc = useMutation(api.docManager.create);
  const analyzeSpecDocument = useAction((api as any).specDNA.analyzeSpecDocument);
  const updateItemStatus = useMutation((api as any).specDNA.updateItemStatus);
  const approveItem = useMutation((api as any).specDNA.approveItem);
  const publishRiskRfi = useMutation((api as any).specDNA.publishRiskRfi);
  const publishTask = useMutation((api as any).specDNA.publishTask);
  const publishScheduleConstraint = useMutation((api as any).specDNA.publishScheduleConstraint);
  const publishPaymentRule = useMutation((api as any).specDNA.publishPaymentRule);
  const publishEstimateRequirement = useMutation((api as any).specDNA.publishEstimateRequirement);
  const publishSubmittal = useMutation((api as any).specDNA.publishSubmittal);
  const commitApproved = useMutation((api as any).specDNA.commitApproved);
  const createRfisFromRisks = useMutation((api as any).specDNA.createRfisFromRisks);

  const specDocuments = useMemo(() => {
    const docs = documents || [];
    const likely = docs.filter(looksLikeSpec);
    return likely.length ? likely : docs;
  }, [documents]);

  const filteredItems = useMemo(() => {
    return (items || []).filter((item) => {
      const matchesCategory = activeTab === "all" || item.category === activeTab;
      const matchesReview =
        reviewFilter === "all" ||
        item.status === reviewFilter ||
        (reviewFilter === "low-confidence" && (item.confidence || 0) < 0.55);
      const destinations = Array.isArray(item.destinationModules) ? item.destinationModules.map((value: any) => String(value).toLowerCase()) : [];
      const matchesDestination = destinationFilter === "all" || destinations.includes(destinationFilter);
      return matchesCategory && matchesReview && matchesDestination;
    });
  }, [items, activeTab, reviewFilter, destinationFilter]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const item of items || []) next[item.category] = (next[item.category] || 0) + 1;
    return next;
  }, [items]);

  const approvedCount = (items || []).filter((item) => item.status === "approved").length;
  const committedCount = (items || []).filter((item) => item.status === "committed").length;
  const lowConfidenceCount = (items || []).filter((item) => (item.confidence || 0) < 0.55).length;
  const approvedRiskCount = (items || []).filter((item) => item.category === "risk" && item.status === "approved" && !item.createdRecordId).length;
  const visibleReviewableCount = filteredItems.filter((item) => item.status !== "committed").length;
  const footerMessage = message && /committing|committed|commit failed|created/i.test(message) ? message : "";

  const defaultRiskQuestion = (item: any) => [
    item.description || item.title,
    item.specSection ? `Spec section: ${item.specSection}` : "",
    item.sourcePage ? `Source page: ${item.sourcePage}` : "",
    item.sourceQuote ? `Source quote: ${item.sourceQuote}` : "",
    "Please clarify this requirement so estimating, project management, scheduling, and billing records can be aligned before work proceeds.",
  ].filter(Boolean).join("\n\n");

  const openRfiDraft = (item: any) => {
    const destinations = Array.isArray(item.destinationModules) ? item.destinationModules.map((value: any) => String(value).toLowerCase()) : [];
    setRfiDraftItem(item);
    setRfiDraft({
      subject: item.title || "Spec clarification",
      question: defaultRiskQuestion(item),
      priority: item.priority || "High",
      assignedTo: "",
      dateRequired: "",
      costImpact: destinations.includes("estimating") || destinations.includes("billing"),
      scheduleImpact: destinations.includes("schedule"),
      notes: item.notes || "",
    });
    setMessage("");
  };

  const openSubmittalDraft = (item: any) => {
    setSubmittalDraftItem(item);
    setSubmittalDraft({
      title: item.title || "Submittal requirement",
      description: item.description || "",
      specSection: item.specSection || "",
      trade: item.trade || "",
      priority: item.priority || "Medium",
      reviewer: "",
      dueDate: "",
      itemNumber: "",
      notes: item.notes || "",
      responsibleSubcontractorId: "",
      responsibleCompany: "",
      responsibleContact: "",
      responsibleEmail: "",
      responsiblePhone: "",
    });
    setMessage("");
  };

  const openTaskDraft = (item: any) => {
    setTaskDraftItem(item);
    setTaskDraft({
      title: item.title || "Project task",
      impact: [item.description, item.specSection ? `Spec: ${item.specSection}` : "", item.sourceQuote ? `Source: ${item.sourceQuote}` : ""].filter(Boolean).join("\n\n"),
      priority: item.priority || "Medium",
      assignedTo: "",
      trade: item.trade || "",
      phase: item.phase || "",
      startDate: "",
      dateScheduled: "",
      blocker: "",
    });
    setMessage("");
  };

  const openScheduleDraft = (item: any) => {
    setScheduleDraftItem(item);
    setScheduleDraft({
      title: item.title || "Schedule constraint",
      description: [item.description, item.specSection ? `Spec: ${item.specSection}` : "", item.sourceQuote ? `Source: ${item.sourceQuote}` : ""].filter(Boolean).join("\n\n"),
      constraintType: "sequencing",
      priority: item.priority || "Medium",
      trade: item.trade || "",
      phase: item.phase || "",
      startDate: "",
      dueDate: "",
      leadTimeDays: "",
      reviewPeriodDays: "",
      blockingRule: "",
      relatedTaskId: "",
    });
    setMessage("");
  };

  const openPaymentRuleDraft = (item: any) => {
    const sourceText = [item.description, item.specSection ? `Spec: ${item.specSection}` : "", item.sourceQuote ? `Source: ${item.sourceQuote}` : ""].filter(Boolean).join("\n\n");
    setPaymentRuleDraftItem(item);
    setPaymentRuleDraft({
      title: item.title || "Payment rule",
      ruleType: "payment",
      description: sourceText,
      measurementLanguage: "",
      backupDocumentation: "",
      storedMaterialRule: "",
      retainageRule: "",
      certifiedPayrollRequired: /certified payroll|payroll report/i.test(sourceText),
      unitPriceRule: "",
      payItemNotes: "",
      trade: item.trade || "",
      phase: item.phase || "",
      priority: item.priority || "Medium",
    });
    setMessage("");
  };

  const openEstimateRequirementDraft = (item: any) => {
    const sourceText = [item.description, item.specSection ? `Spec: ${item.specSection}` : "", item.sourceQuote ? `Source: ${item.sourceQuote}` : ""].filter(Boolean).join("\n\n");
    setEstimateRequirementDraftItem(item);
    setEstimateRequirementDraft({
      title: item.title || (item.category === "scope_item" ? "Scope assumption" : "Bid requirement"),
      requirementType: item.category === "scope_item" ? "scope_assumption" : "bid_requirement",
      description: sourceText,
      allowance: /allowance/i.test(sourceText) ? sourceText : "",
      alternate: /alternate/i.test(sourceText) ? sourceText : "",
      exclusion: /exclusion|excluded|not included/i.test(sourceText) ? sourceText : "",
      wageRule: /wage|davis-bacon|payroll/i.test(sourceText) ? sourceText : "",
      bondRule: /bond/i.test(sourceText) ? sourceText : "",
      taxRule: /tax/i.test(sourceText) ? sourceText : "",
      dbeRule: /\bDBE\b|\bMBE\b|\bWBE\b/i.test(sourceText) ? sourceText : "",
      liquidatedDamagesRule: /liquidated damages|damages per day|\bLD\b/i.test(sourceText) ? sourceText : "",
      scopeAssumption: item.category === "scope_item" ? sourceText : "",
      trade: item.trade || "",
      phase: item.phase || "",
      priority: item.priority || "Medium",
    });
    setMessage("");
  };

  const selectResponsibleSubcontractor = (id: string) => {
    const sub = (subcontractors || []).find((candidate) => String(candidate._id) === id);
    setSubmittalDraft((current) => ({
      ...current,
      responsibleSubcontractorId: id,
      responsibleCompany: sub?.name || "",
      responsibleContact: sub?.contactName || "",
      responsibleEmail: sub?.email || "",
      responsiblePhone: sub?.phone || "",
      trade: current.trade || sub?.trade || "",
    }));
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.match(/\.pdf$/i)) {
      setMessage("Upload a PDF spec book for the Spec Intelligence Intake Matrix.");
      return;
    }
    setBusy(true);
    setMessage("Uploading spec book...");
    try {
      const uploadUrl = await generateUrl();
      const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type || "application/pdf" }, body: file });
      const { storageId } = await response.json();
      const documentId = await createDoc({
        companyId,
        projectId,
        name: file.name,
        category: "Specs",
        storageId,
        fileSize: file.size,
        uploadedBy: userName,
      });
      setSelectedDocumentId(String(documentId));
      setMessage("Spec uploaded. Run the intake matrix when ready.");
    } catch (error: any) {
      setMessage(error?.message || "Spec upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    const documentId = selectedDocumentId || specDocuments[0]?._id;
    if (!documentId) {
      setMessage("Upload or select a spec document first.");
      return;
    }
    setBusy(true);
    setMessage("The Spec Intelligence Intake Matrix is reading the spec book and building the obligation graph...");
    try {
      const result = await analyzeSpecDocument({ companyId, projectId, documentId: documentId as Id<"documents">, createdBy: userName });
      setMessage(`Spec Intelligence Intake Matrix ready: ${result?.items || 0} obligations extracted.`);
    } catch (error: any) {
      setMessage(error?.message || "Spec Intelligence Intake Matrix analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!latestRun?._id) return;
    setBusy(true);
    setMessage("Committing approved intake matrix items...");
    try {
      const result = await commitApproved({ runId: latestRun._id });
      setMessage(`Committed. Created ${result.tasksCreated} tasks, ${result.submittalsCreated} submittals, ${result.rfisCreated || 0} RFIs, and ${result.intelligenceCommitted || 0} intelligence items.`);
    } catch (error: any) {
      setMessage(error?.message || "Commit failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveItem = async (item: any) => {
    if (item.category === "risk") {
      openRfiDraft(item);
      return;
    }
    if (item.category === "submittal") {
      openSubmittalDraft(item);
      return;
    }
    if (item.category === "task") {
      openTaskDraft(item);
      return;
    }
    if (item.category === "schedule_driver") {
      openScheduleDraft(item);
      return;
    }
    if (item.category === "billing_rule") {
      openPaymentRuleDraft(item);
      return;
    }
    if (item.category === "bid_requirement" || item.category === "scope_item") {
      openEstimateRequirementDraft(item);
      return;
    }
    setBusy(true);
    setMessage("Approving intake matrix item...");
    try {
      const result = await approveItem({ id: item._id, requestedBy: userName });
      if (result?.rfisCreated) setMessage("Approved risk and created 1 RFI.");
      else setMessage("Approved item.");
    } catch (error: any) {
      setMessage(error?.message || "Approval failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishRfiDraft = async () => {
    if (!rfiDraftItem?._id) return;
    setBusy(true);
    setMessage("Publishing reviewed RFI draft...");
    try {
      await publishRiskRfi({
        id: rfiDraftItem._id,
        requestedBy: userName,
        subject: rfiDraft.subject,
        question: rfiDraft.question,
        priority: rfiDraft.priority,
        assignedTo: rfiDraft.assignedTo || undefined,
        dateRequired: rfiDraft.dateRequired || undefined,
        costImpact: rfiDraft.costImpact,
        scheduleImpact: rfiDraft.scheduleImpact,
        notes: rfiDraft.notes || undefined,
      });
      setRfiDraftItem(null);
      setMessage("Published reviewed RFI with source evidence.");
    } catch (error: any) {
      setMessage(error?.message || "RFI publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishSubmittalDraft = async () => {
    if (!submittalDraftItem?._id) return;
    setBusy(true);
    setMessage("Publishing reviewed submittal draft...");
    try {
      await publishSubmittal({
        id: submittalDraftItem._id,
        title: submittalDraft.title,
        description: submittalDraft.description || undefined,
        specSection: submittalDraft.specSection || undefined,
        trade: submittalDraft.trade || undefined,
        priority: submittalDraft.priority,
        reviewer: submittalDraft.reviewer || undefined,
        dueDate: submittalDraft.dueDate || undefined,
        itemNumber: submittalDraft.itemNumber || undefined,
        notes: submittalDraft.notes || undefined,
        responsibleSubcontractorId: submittalDraft.responsibleSubcontractorId || undefined,
        responsibleCompany: submittalDraft.responsibleCompany || undefined,
        responsibleContact: submittalDraft.responsibleContact || undefined,
        responsibleEmail: submittalDraft.responsibleEmail || undefined,
        responsiblePhone: submittalDraft.responsiblePhone || undefined,
      });
      setSubmittalDraftItem(null);
      setMessage("Published reviewed submittal with source evidence.");
    } catch (error: any) {
      setMessage(error?.message || "Submittal publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishTaskDraft = async () => {
    if (!taskDraftItem?._id) return;
    setBusy(true);
    setMessage("Publishing reviewed task draft...");
    try {
      await publishTask({
        id: taskDraftItem._id,
        title: taskDraft.title,
        impact: taskDraft.impact || undefined,
        priority: taskDraft.priority,
        assignedTo: taskDraft.assignedTo || undefined,
        trade: taskDraft.trade || undefined,
        phase: taskDraft.phase || undefined,
        startDate: taskDraft.startDate || undefined,
        dateScheduled: taskDraft.dateScheduled || undefined,
        blocker: taskDraft.blocker || undefined,
        projectRole: projectRole || undefined,
      });
      setTaskDraftItem(null);
      setMessage("Published reviewed task with source evidence.");
    } catch (error: any) {
      setMessage(error?.message || "Task publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishScheduleDraft = async () => {
    if (!scheduleDraftItem?._id) return;
    setBusy(true);
    setMessage("Publishing reviewed schedule constraint...");
    const leadTimeDays = scheduleDraft.leadTimeDays.trim() ? Number(scheduleDraft.leadTimeDays) : undefined;
    const reviewPeriodDays = scheduleDraft.reviewPeriodDays.trim() ? Number(scheduleDraft.reviewPeriodDays) : undefined;
    try {
      await publishScheduleConstraint({
        id: scheduleDraftItem._id,
        title: scheduleDraft.title,
        description: scheduleDraft.description || undefined,
        constraintType: scheduleDraft.constraintType || undefined,
        priority: scheduleDraft.priority,
        trade: scheduleDraft.trade || undefined,
        phase: scheduleDraft.phase || undefined,
        startDate: scheduleDraft.startDate || undefined,
        dueDate: scheduleDraft.dueDate || undefined,
        leadTimeDays: Number.isFinite(leadTimeDays) ? leadTimeDays : undefined,
        reviewPeriodDays: Number.isFinite(reviewPeriodDays) ? reviewPeriodDays : undefined,
        blockingRule: scheduleDraft.blockingRule || undefined,
        relatedTaskId: scheduleDraft.relatedTaskId || undefined,
        projectRole: projectRole || undefined,
      });
      setScheduleDraftItem(null);
      setMessage("Published reviewed schedule constraint with source evidence.");
    } catch (error: any) {
      setMessage(error?.message || "Schedule constraint publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishPaymentRuleDraft = async () => {
    if (!paymentRuleDraftItem?._id) return;
    setBusy(true);
    setMessage("Publishing reviewed payment rule...");
    try {
      await publishPaymentRule({
        id: paymentRuleDraftItem._id,
        title: paymentRuleDraft.title,
        ruleType: paymentRuleDraft.ruleType || undefined,
        description: paymentRuleDraft.description || undefined,
        measurementLanguage: paymentRuleDraft.measurementLanguage || undefined,
        backupDocumentation: paymentRuleDraft.backupDocumentation || undefined,
        storedMaterialRule: paymentRuleDraft.storedMaterialRule || undefined,
        retainageRule: paymentRuleDraft.retainageRule || undefined,
        certifiedPayrollRequired: paymentRuleDraft.certifiedPayrollRequired,
        unitPriceRule: paymentRuleDraft.unitPriceRule || undefined,
        payItemNotes: paymentRuleDraft.payItemNotes || undefined,
        trade: paymentRuleDraft.trade || undefined,
        phase: paymentRuleDraft.phase || undefined,
        priority: paymentRuleDraft.priority,
        projectRole: projectRole || undefined,
      });
      setPaymentRuleDraftItem(null);
      setMessage("Published reviewed payment rule with source evidence.");
    } catch (error: any) {
      setMessage(error?.message || "Payment rule publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublishEstimateRequirementDraft = async () => {
    if (!estimateRequirementDraftItem?._id) return;
    setBusy(true);
    setMessage("Publishing reviewed estimate requirement...");
    try {
      await publishEstimateRequirement({
        id: estimateRequirementDraftItem._id,
        title: estimateRequirementDraft.title,
        requirementType: estimateRequirementDraft.requirementType || undefined,
        description: estimateRequirementDraft.description || undefined,
        allowance: estimateRequirementDraft.allowance || undefined,
        alternate: estimateRequirementDraft.alternate || undefined,
        exclusion: estimateRequirementDraft.exclusion || undefined,
        wageRule: estimateRequirementDraft.wageRule || undefined,
        bondRule: estimateRequirementDraft.bondRule || undefined,
        taxRule: estimateRequirementDraft.taxRule || undefined,
        dbeRule: estimateRequirementDraft.dbeRule || undefined,
        liquidatedDamagesRule: estimateRequirementDraft.liquidatedDamagesRule || undefined,
        scopeAssumption: estimateRequirementDraft.scopeAssumption || undefined,
        trade: estimateRequirementDraft.trade || undefined,
        phase: estimateRequirementDraft.phase || undefined,
        priority: estimateRequirementDraft.priority,
        projectRole: projectRole || undefined,
      });
      setEstimateRequirementDraftItem(null);
      setMessage("Published reviewed estimate requirement with source evidence.");
    } catch (error: any) {
      setMessage(error?.message || "Estimate requirement publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveVisible = async () => {
    const reviewable = filteredItems.filter((item) => item.status !== "committed");
    if (!reviewable.length) return;
    setBusy(true);
    setMessage(`Approving ${reviewable.length} visible intake matrix items...`);
    try {
      const results = await Promise.all(reviewable.map((item) => approveItem({ id: item._id, requestedBy: userName })));
      const rfisCreated = results.reduce((sum, result) => sum + (result?.rfisCreated || 0), 0);
      setMessage(`Approved ${reviewable.length} visible items${rfisCreated ? ` and created ${rfisCreated} RFIs` : ""}.`);
    } catch (error: any) {
      setMessage(error?.message || "Bulk approval failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRfis = async () => {
    if (!latestRun?._id) return;
    setBusy(true);
    setMessage("Creating RFIs from approved risk intelligence...");
    try {
      const result = await createRfisFromRisks({ runId: latestRun._id, requestedBy: userName });
      setMessage(`Created ${result.rfisCreated} RFIs from approved risks.`);
    } catch (error: any) {
      setMessage(error?.message || "RFI creation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-orange-500/10 via-background to-cyan-500/10 border-orange-500/30 border-l-4 border-l-orange-500 mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Brain className="size-5 text-orange-300" />
              <h3 className="font-bold text-lg">Spec Intelligence Intake Matrix</h3>
              <Badge className="bg-orange-500/15 text-orange-300">Bid-to-build intelligence graph</Badge>
              {latestRun?.status && <Badge variant="outline">{latestRun.status}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-4xl">
              Upload the spec book once. OpsSlate extracts bid requirements, submittals, tasks, schedule drivers, billing rules, and risks with source evidence for review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0] || null)} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="size-4" />
              Upload PDF
            </Button>
            <Button type="button" onClick={handleAnalyze} disabled={busy}>
              {busy ? <RefreshCw className="size-4 animate-spin" /> : <Brain className="size-4" />}
              Run Matrix
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Spec source</div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedDocumentId}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
            >
              <option value="">Select uploaded spec document...</option>
              {(specDocuments || []).map((doc) => (
                <option key={doc._id} value={doc._id}>{doc.name} {doc.category ? `(${doc.category})` : ""}</option>
              ))}
            </select>
            {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
              <div className="text-2xl font-bold">{items?.length || 0}</div>
              <div className="text-[10px] text-muted-foreground">Items</div>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
              <div className="text-2xl font-bold text-green-300">{approvedCount}</div>
              <div className="text-[10px] text-muted-foreground">Approved</div>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
              <div className="text-2xl font-bold text-blue-300">{committedCount}</div>
              <div className="text-[10px] text-muted-foreground">Committed</div>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{lowConfidenceCount}</div>
              <div className="text-[10px] text-muted-foreground">Review</div>
            </div>
          </div>
        </div>

        {latestRun?.summary && (
          <div className="rounded-xl border border-border bg-background/60 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <FileText className="size-4 text-cyan-300" />
              Intake Matrix Summary
            </div>
            <p className="text-muted-foreground leading-6">{latestRun.summary}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.key ? "border-orange-500/50 bg-orange-500 text-white" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}{tab.key !== "all" ? ` (${counts[tab.key] || 0})` : ""}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-cyan-300" />
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-xs"
              value={reviewFilter}
              onChange={(event) => setReviewFilter(event.target.value)}
            >
              <option value="all">All review states</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="committed">Committed</option>
              <option value="resolved">Resolved</option>
              <option value="low-confidence">Low confidence</option>
            </select>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-xs"
              value={destinationFilter}
              onChange={(event) => setDestinationFilter(event.target.value)}
            >
              {DESTINATION_FILTERS.map((destination) => (
                <option key={destination.key} value={destination.key}>{destination.label}</option>
              ))}
            </select>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={visibleReviewableCount === 0 || busy} onClick={handleApproveVisible}>
            <Check className="size-4" />
            Approve Visible
          </Button>
        </div>

        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
              No intake matrix items yet. Upload/select a spec book and run the matrix.
            </div>
          ) : filteredItems.map((item) => (
            <div key={item._id} className="rounded-xl border border-border bg-background/70 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{categoryLabel(item.category)}</Badge>
                    <Badge className={confidenceTone(item.confidence)}>{Math.round((item.confidence || 0) * 100)}%</Badge>
                    <Badge variant={item.status === "committed" ? "default" : "secondary"}>{item.status}</Badge>
                    {item.resolutionStatus === "resolved" && <Badge className="bg-green-500/15 text-green-300 border-green-500/30">Resolved by RFI answer</Badge>}
                    {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                  </div>
                  <div className="mt-2 font-semibold">{item.title}</div>
                  {item.description && <p className="mt-1 text-sm text-muted-foreground leading-6">{item.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {item.trade && <span>Trade: {item.trade}</span>}
                    {item.phase && <span>Phase: {item.phase}</span>}
                    {item.specSection && <span>Spec: {item.specSection}</span>}
                    {item.sourcePage && <span>Page: {item.sourcePage}</span>}
                    {Array.isArray(item.destinationModules) && item.destinationModules.length > 0 && <span>Feeds: {item.destinationModules.join(", ")}</span>}
                  </div>
                  {item.sourceQuote && <div className="mt-2 rounded-lg border border-border bg-secondary/20 p-2 text-xs text-muted-foreground">"{item.sourceQuote}"</div>}
                  {item.resolvedAnswer && (
                    <div className="mt-2 rounded-lg border border-green-500/25 bg-green-500/5 p-2 text-xs text-green-100">
                      <div className="mb-1 font-bold uppercase text-green-300">Resolved by RFI answer</div>
                      <p className="whitespace-pre-wrap leading-5">{item.resolvedAnswer}</p>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
                  <Button size="sm" variant="outline" disabled={item.status === "committed" || busy} onClick={() => handleApproveItem(item)}>
                    <Check className="size-4" />
                    {item.category === "risk" ? "Review RFI" : item.category === "submittal" ? "Review Submittal" : item.category === "task" ? "Review Task" : item.category === "schedule_driver" ? "Review Schedule" : item.category === "billing_rule" ? "Review Billing" : item.category === "bid_requirement" || item.category === "scope_item" ? "Review Estimate" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={item.status === "committed"} onClick={() => updateItemStatus({ id: item._id, status: "rejected" })}>
                    <X className="size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Commit Approved moves approved items into OpsSlate: tasks become tasks, submittals become submittals, risks become RFIs, and bid/scope/schedule/billing items become committed intelligence.
            </p>
            {footerMessage && <p className="font-medium text-orange-300">{footerMessage}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={!latestRun?._id || approvedRiskCount === 0 || busy} onClick={handleCreateRfis}>
              Create RFIs
            </Button>
            <Button type="button" disabled={!latestRun?._id || approvedCount === 0 || busy} onClick={handleCommit}>
              {busy ? "Committing..." : "Commit Approved"}
            </Button>
          </div>
        </div>

        {rfiDraftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-bold">Review RFI Draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">Edit the formal question before OpsSlate publishes it to the RFI log.</p>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Subject</label>
                    <Input value={rfiDraft.subject} onChange={(event) => setRfiDraft((current) => ({ ...current, subject: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={rfiDraft.priority} onChange={(event) => setRfiDraft((current) => ({ ...current, priority: event.target.value }))}>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Question</label>
                  <textarea className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={rfiDraft.question} onChange={(event) => setRfiDraft((current) => ({ ...current, question: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Assigned to</label>
                    <Input value={rfiDraft.assignedTo} onChange={(event) => setRfiDraft((current) => ({ ...current, assignedTo: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Date required</label>
                    <Input type="date" value={rfiDraft.dateRequired} onChange={(event) => setRfiDraft((current) => ({ ...current, dateRequired: event.target.value }))} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={rfiDraft.costImpact} onChange={(event) => setRfiDraft((current) => ({ ...current, costImpact: event.target.checked }))} />
                    Cost impact
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={rfiDraft.scheduleImpact} onChange={(event) => setRfiDraft((current) => ({ ...current, scheduleImpact: event.target.checked }))} />
                    Schedule impact
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Internal notes</label>
                  <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={rfiDraft.notes} onChange={(event) => setRfiDraft((current) => ({ ...current, notes: event.target.value }))} />
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-bold uppercase text-foreground">Source evidence</div>
                  <div className="flex flex-wrap gap-3">
                    {rfiDraftItem.specSection && <span>Spec: {rfiDraftItem.specSection}</span>}
                    {rfiDraftItem.sourcePage && <span>Page: {rfiDraftItem.sourcePage}</span>}
                    <span>Confidence: {Math.round((rfiDraftItem.confidence || 0) * 100)}%</span>
                  </div>
                  {rfiDraftItem.sourceQuote && <p className="mt-2 leading-5">"{rfiDraftItem.sourceQuote}"</p>}
                </div>
              </div>
              <div className="flex justify-between gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setRfiDraftItem(null)}>Cancel</Button>
                <Button type="button" disabled={busy || !rfiDraft.subject.trim() || !rfiDraft.question.trim()} onClick={handlePublishRfiDraft}>
                  {busy ? "Publishing..." : "Publish RFI"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {taskDraftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-bold">Review Task Draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">Edit the execution task before OpsSlate publishes it to the project task board.</p>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Task title</label>
                    <Input value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskDraft.priority} onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value }))}>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Scope / impact</label>
                  <textarea className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={taskDraft.impact} onChange={(event) => setTaskDraft((current) => ({ ...current, impact: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Assigned to</label>
                    <Input value={taskDraft.assignedTo} onChange={(event) => setTaskDraft((current) => ({ ...current, assignedTo: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Trade</label>
                    <Input value={taskDraft.trade} onChange={(event) => setTaskDraft((current) => ({ ...current, trade: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Phase</label>
                    <Input value={taskDraft.phase} onChange={(event) => setTaskDraft((current) => ({ ...current, phase: event.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Start date</label>
                    <Input type="date" value={taskDraft.startDate} onChange={(event) => setTaskDraft((current) => ({ ...current, startDate: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Due date</label>
                    <Input type="date" value={taskDraft.dateScheduled} onChange={(event) => setTaskDraft((current) => ({ ...current, dateScheduled: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Project role</label>
                    <Input value={projectRole || ""} readOnly />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Blocker / prerequisite</label>
                  <Input value={taskDraft.blocker} onChange={(event) => setTaskDraft((current) => ({ ...current, blocker: event.target.value }))} />
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-bold uppercase text-foreground">Source evidence</div>
                  <div className="flex flex-wrap gap-3">
                    {taskDraftItem.specSection && <span>Spec: {taskDraftItem.specSection}</span>}
                    {taskDraftItem.sourcePage && <span>Page: {taskDraftItem.sourcePage}</span>}
                    <span>Confidence: {Math.round((taskDraftItem.confidence || 0) * 100)}%</span>
                  </div>
                  {taskDraftItem.sourceQuote && <p className="mt-2 leading-5">"{taskDraftItem.sourceQuote}"</p>}
                </div>
              </div>
              <div className="flex justify-between gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setTaskDraftItem(null)}>Cancel</Button>
                <Button type="button" disabled={busy || !taskDraft.title.trim()} onClick={handlePublishTaskDraft}>
                  {busy ? "Publishing..." : "Publish Task"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {scheduleDraftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-bold">Review Schedule Draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">Edit the schedule driver before OpsSlate publishes it as a project schedule constraint.</p>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Constraint title</label>
                    <Input value={scheduleDraft.title} onChange={(event) => setScheduleDraft((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={scheduleDraft.priority} onChange={(event) => setScheduleDraft((current) => ({ ...current, priority: event.target.value }))}>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Constraint type</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={scheduleDraft.constraintType} onChange={(event) => setScheduleDraft((current) => ({ ...current, constraintType: event.target.value }))}>
                      <option value="milestone">Milestone</option>
                      <option value="lead_time">Lead time</option>
                      <option value="sequencing">Sequencing</option>
                      <option value="inspection">Inspection</option>
                      <option value="review_period">Review period</option>
                      <option value="hold_point">Hold point</option>
                      <option value="weather">Weather / access</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Project role</label>
                    <Input value={projectRole || ""} readOnly />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Schedule requirement</label>
                  <textarea className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={scheduleDraft.description} onChange={(event) => setScheduleDraft((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Trade</label>
                    <Input value={scheduleDraft.trade} onChange={(event) => setScheduleDraft((current) => ({ ...current, trade: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Phase</label>
                    <Input value={scheduleDraft.phase} onChange={(event) => setScheduleDraft((current) => ({ ...current, phase: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Related task ID</label>
                    <Input value={scheduleDraft.relatedTaskId} onChange={(event) => setScheduleDraft((current) => ({ ...current, relatedTaskId: event.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Start date</label>
                    <Input type="date" value={scheduleDraft.startDate} onChange={(event) => setScheduleDraft((current) => ({ ...current, startDate: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Due date</label>
                    <Input type="date" value={scheduleDraft.dueDate} onChange={(event) => setScheduleDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Lead days</label>
                    <Input inputMode="numeric" value={scheduleDraft.leadTimeDays} onChange={(event) => setScheduleDraft((current) => ({ ...current, leadTimeDays: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Review days</label>
                    <Input inputMode="numeric" value={scheduleDraft.reviewPeriodDays} onChange={(event) => setScheduleDraft((current) => ({ ...current, reviewPeriodDays: event.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Blocking rule / prerequisite</label>
                  <Input value={scheduleDraft.blockingRule} onChange={(event) => setScheduleDraft((current) => ({ ...current, blockingRule: event.target.value }))} />
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-bold uppercase text-foreground">Source evidence</div>
                  <div className="flex flex-wrap gap-3">
                    {scheduleDraftItem.specSection && <span>Spec: {scheduleDraftItem.specSection}</span>}
                    {scheduleDraftItem.sourcePage && <span>Page: {scheduleDraftItem.sourcePage}</span>}
                    <span>Confidence: {Math.round((scheduleDraftItem.confidence || 0) * 100)}%</span>
                  </div>
                  {scheduleDraftItem.sourceQuote && <p className="mt-2 leading-5">"{scheduleDraftItem.sourceQuote}"</p>}
                </div>
              </div>
              <div className="flex justify-between gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setScheduleDraftItem(null)}>Cancel</Button>
                <Button type="button" disabled={busy || !scheduleDraft.title.trim()} onClick={handlePublishScheduleDraft}>
                  {busy ? "Publishing..." : "Publish Schedule Constraint"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {paymentRuleDraftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-bold">Review Billing Draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">Turn the spec language into Ops Books payment rules before publishing it downstream.</p>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_190px_170px]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Rule title</label>
                    <Input value={paymentRuleDraft.title} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Rule type</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.ruleType} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, ruleType: event.target.value }))}>
                      <option value="measurement">Measurement</option>
                      <option value="backup_documentation">Backup docs</option>
                      <option value="stored_materials">Stored materials</option>
                      <option value="retainage">Retainage</option>
                      <option value="certified_payroll">Certified payroll</option>
                      <option value="unit_price">Unit price</option>
                      <option value="pay_item">Pay item</option>
                      <option value="payment">Payment</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.priority} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, priority: event.target.value }))}>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Payment / billing requirement</label>
                  <textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.description} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Measurement language</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.measurementLanguage} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, measurementLanguage: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Backup documentation</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.backupDocumentation} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, backupDocumentation: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Stored material rule</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.storedMaterialRule} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, storedMaterialRule: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Retainage rule</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.retainageRule} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, retainageRule: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Unit price rule</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.unitPriceRule} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, unitPriceRule: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Pay item notes</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentRuleDraft.payItemNotes} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, payItemNotes: event.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Trade</label>
                    <Input value={paymentRuleDraft.trade} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, trade: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Phase</label>
                    <Input value={paymentRuleDraft.phase} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, phase: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Project role</label>
                    <Input value={projectRole || ""} readOnly />
                  </div>
                  <label className="mt-6 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={paymentRuleDraft.certifiedPayrollRequired} onChange={(event) => setPaymentRuleDraft((current) => ({ ...current, certifiedPayrollRequired: event.target.checked }))} />
                    Certified payroll required
                  </label>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-bold uppercase text-foreground">Source evidence</div>
                  <div className="flex flex-wrap gap-3">
                    {paymentRuleDraftItem.specSection && <span>Spec: {paymentRuleDraftItem.specSection}</span>}
                    {paymentRuleDraftItem.sourcePage && <span>Page: {paymentRuleDraftItem.sourcePage}</span>}
                    <span>Confidence: {Math.round((paymentRuleDraftItem.confidence || 0) * 100)}%</span>
                  </div>
                  {paymentRuleDraftItem.sourceQuote && <p className="mt-2 leading-5">"{paymentRuleDraftItem.sourceQuote}"</p>}
                </div>
              </div>
              <div className="flex justify-between gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setPaymentRuleDraftItem(null)}>Cancel</Button>
                <Button type="button" disabled={busy || !paymentRuleDraft.title.trim()} onClick={handlePublishPaymentRuleDraft}>
                  {busy ? "Publishing..." : "Publish Payment Rule"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {estimateRequirementDraftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-bold">Review Estimate Draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">Push bid and scope intelligence into the Estimating Cockpit as reviewed estimate requirements.</p>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_210px_170px]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Requirement title</label>
                    <Input value={estimateRequirementDraft.title} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Requirement type</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.requirementType} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, requirementType: event.target.value }))}>
                      <option value="bid_requirement">Bid requirement</option>
                      <option value="scope_assumption">Scope assumption</option>
                      <option value="allowance">Allowance</option>
                      <option value="alternate">Alternate</option>
                      <option value="exclusion">Exclusion</option>
                      <option value="wage">Wage rule</option>
                      <option value="bond">Bond rule</option>
                      <option value="tax">Tax rule</option>
                      <option value="dbe">DBE / MBE / WBE</option>
                      <option value="liquidated_damages">Liquidated damages</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.priority} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, priority: event.target.value }))}>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Requirement summary</label>
                  <textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.description} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Allowance</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.allowance} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, allowance: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Alternate</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.alternate} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, alternate: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Exclusion</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.exclusion} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, exclusion: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Scope assumption</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.scopeAssumption} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, scopeAssumption: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Wage rule</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.wageRule} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, wageRule: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Bond rule</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.bondRule} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, bondRule: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Tax rule</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.taxRule} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, taxRule: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">DBE / MBE / WBE rule</label>
                    <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={estimateRequirementDraft.dbeRule} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, dbeRule: event.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Liquidated damages</label>
                  <Input value={estimateRequirementDraft.liquidatedDamagesRule} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, liquidatedDamagesRule: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Trade</label>
                    <Input value={estimateRequirementDraft.trade} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, trade: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Phase</label>
                    <Input value={estimateRequirementDraft.phase} onChange={(event) => setEstimateRequirementDraft((current) => ({ ...current, phase: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Project role</label>
                    <Input value={projectRole || ""} readOnly />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-bold uppercase text-foreground">Source evidence</div>
                  <div className="flex flex-wrap gap-3">
                    {estimateRequirementDraftItem.specSection && <span>Spec: {estimateRequirementDraftItem.specSection}</span>}
                    {estimateRequirementDraftItem.sourcePage && <span>Page: {estimateRequirementDraftItem.sourcePage}</span>}
                    <span>Confidence: {Math.round((estimateRequirementDraftItem.confidence || 0) * 100)}%</span>
                  </div>
                  {estimateRequirementDraftItem.sourceQuote && <p className="mt-2 leading-5">"{estimateRequirementDraftItem.sourceQuote}"</p>}
                </div>
              </div>
              <div className="flex justify-between gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setEstimateRequirementDraftItem(null)}>Cancel</Button>
                <Button type="button" disabled={busy || !estimateRequirementDraft.title.trim()} onClick={handlePublishEstimateRequirementDraft}>
                  {busy ? "Publishing..." : "Publish Estimate Requirement"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {submittalDraftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="border-b border-border p-4">
                <h3 className="text-lg font-bold">Review Submittal Draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">Edit the register item before OpsSlate publishes it to the Submittals module.</p>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Title</label>
                    <Input value={submittalDraft.title} onChange={(event) => setSubmittalDraft((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Priority</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={submittalDraft.priority} onChange={(event) => setSubmittalDraft((current) => ({ ...current, priority: event.target.value }))}>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                  <textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={submittalDraft.description} onChange={(event) => setSubmittalDraft((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Spec section</label>
                    <Input value={submittalDraft.specSection} onChange={(event) => setSubmittalDraft((current) => ({ ...current, specSection: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Trade</label>
                    <Input value={submittalDraft.trade} onChange={(event) => setSubmittalDraft((current) => ({ ...current, trade: event.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Reviewer</label>
                    <Input value={submittalDraft.reviewer} onChange={(event) => setSubmittalDraft((current) => ({ ...current, reviewer: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Due date</label>
                    <Input type="date" value={submittalDraft.dueDate} onChange={(event) => setSubmittalDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Item number</label>
                    <Input value={submittalDraft.itemNumber} onChange={(event) => setSubmittalDraft((current) => ({ ...current, itemNumber: event.target.value }))} />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/10 p-3">
                  <div className="mb-3 text-xs font-bold uppercase text-muted-foreground">Responsible subcontractor</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Assign from subcontractors</label>
                      <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={submittalDraft.responsibleSubcontractorId} onChange={(event) => selectResponsibleSubcontractor(event.target.value)}>
                        <option value="">Select responsible subcontractor...</option>
                        {(subcontractors || []).map((sub) => (
                          <option key={sub._id} value={sub._id}>{sub.name}{sub.trade ? ` - ${sub.trade}` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Company</label>
                      <Input value={submittalDraft.responsibleCompany} onChange={(event) => setSubmittalDraft((current) => ({ ...current, responsibleCompany: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Contact</label>
                      <Input value={submittalDraft.responsibleContact} onChange={(event) => setSubmittalDraft((current) => ({ ...current, responsibleContact: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Email</label>
                      <Input type="email" value={submittalDraft.responsibleEmail} onChange={(event) => setSubmittalDraft((current) => ({ ...current, responsibleEmail: event.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Phone</label>
                      <Input value={submittalDraft.responsiblePhone} onChange={(event) => setSubmittalDraft((current) => ({ ...current, responsiblePhone: event.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Internal notes</label>
                  <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={submittalDraft.notes} onChange={(event) => setSubmittalDraft((current) => ({ ...current, notes: event.target.value }))} />
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-bold uppercase text-foreground">Source evidence</div>
                  <div className="flex flex-wrap gap-3">
                    {submittalDraftItem.specSection && <span>Spec: {submittalDraftItem.specSection}</span>}
                    {submittalDraftItem.sourcePage && <span>Page: {submittalDraftItem.sourcePage}</span>}
                    <span>Confidence: {Math.round((submittalDraftItem.confidence || 0) * 100)}%</span>
                  </div>
                  {submittalDraftItem.sourceQuote && <p className="mt-2 leading-5">"{submittalDraftItem.sourceQuote}"</p>}
                </div>
              </div>
              <div className="flex justify-between gap-3 border-t border-border p-4">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setSubmittalDraftItem(null)}>Cancel</Button>
                <Button type="button" disabled={busy || !submittalDraft.title.trim()} onClick={handlePublishSubmittalDraft}>
                  {busy ? "Publishing..." : "Publish Submittal"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
