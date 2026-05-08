"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import Link from "next/link";

type Recipient = {
  id: string;
  name: string;
  email: string;
  role: string;
  routingOrder: number;
  action: "Sign" | "CC";
};

type SignField = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  recipientId: string;
  page: number;
  label: string;
  required: boolean;
};

type PdfViewportLike = { width: number; height: number };
type PdfPageLike = {
  getViewport: (options: { scale: number }) => PdfViewportLike;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewportLike }) => { promise: Promise<void> };
};
type PdfDocumentLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
};

type SignerPreviewPayload = {
  envelopeName: string;
  subject: string;
  message: string;
  pageCount: number;
  recipients: Recipient[];
  placedFields: SignField[];
};

const SIGNER_PREVIEW_STORAGE_KEY = "opssign-signer-preview";

const templates = [
  { name: "Subcontract Agreement", type: "Template", signers: 2, status: "Ready" },
  { name: "Change Order Approval", type: "Template", signers: 3, status: "Ready" },
  { name: "Client Proposal Acceptance", type: "Template", signers: 2, status: "Ready" },
  { name: "Vendor Purchase Authorization", type: "Template", signers: 2, status: "Draft" },
];

const envelopes = [
  { title: "Town of Angelica — CO #4", recipients: "Owner, PM", sent: "Today", status: "Out for Signature" },
  { title: "Elm Street — Subcontract", recipients: "GC, Electrical Sub", sent: "Yesterday", status: "Viewed" },
  { title: "School Renovation — Proposal", recipients: "Client", sent: "Apr 20", status: "Completed" },
];

const fields = [
  "Signature",
  "Initials",
  "Date Signed",
  "Printed Name",
  "Company",
  "Title",
  "Text Box",
  "Checkbox",
];

function statusTone(status: string) {
  if (status === "Completed") return "bg-green-500/15 text-green-300";
  if (status === "Out for Signature") return "bg-blue-500/15 text-blue-300";
  if (status === "Viewed") return "bg-amber-500/15 text-amber-300";
  if (status === "Ready") return "bg-green-500/15 text-green-300";
  if (status === "Draft") return "bg-secondary text-muted-foreground";
  return "bg-secondary text-muted-foreground";
}

export default function OpsSignPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const sendEmail = useAction(api.sendEmail.send);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("Subcontract Agreement");
  const [envelopeName, setEnvelopeName] = useState("Town of Angelica — Subcontract Execution");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState("Please review and sign");
  const [message, setMessage] = useState("Please review the attached document and sign in the marked locations.");
  const [selectedFieldType, setSelectedFieldType] = useState("Signature");
  const [selectedRecipientId, setSelectedRecipientId] = useState("1");
  const [placedFields, setPlacedFields] = useState<SignField[]>([]);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);
  const [activePreviewPage, setActivePreviewPage] = useState(1);
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentLike | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreenEditorOpen, setIsFullscreenEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"place" | "select">("place");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "savedAs">("idle");
  const [reviewStatus, setReviewStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [copyCount, setCopyCount] = useState(0);
  const [dragState, setDragState] = useState<{ fieldId: string; mode: "move" | "resize"; startX: number; startY: number; originX: number; originY: number; originWidth: number; originHeight: number; } | null>(null);
  const [recipientDraft, setRecipientDraft] = useState({ name: "", email: "", role: "", action: "Sign" as "Sign" | "CC" });
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", name: "Project Owner", email: "owner@example.com", role: "Owner", routingOrder: 1, action: "Sign" },
    { id: "2", name: "Mike Maziarz", email: "mike@example.com", role: "Internal PM", routingOrder: 2, action: "Sign" },
  ]);

  const orderedRecipients = useMemo(
    () => [...recipients].sort((a, b) => a.routingOrder - b.routingOrder),
    [recipients],
  );

  const activeSignerId = useMemo(() => {
    const selectedSigner = orderedRecipients.find((recipient) => recipient.id === selectedRecipientId && recipient.action === "Sign");
    return selectedSigner?.id ?? orderedRecipients.find((recipient) => recipient.action === "Sign")?.id ?? "test";
  }, [orderedRecipients, selectedRecipientId]);

  const signerPreviewHref = `/client/${activeSignerId}`;

  const signerRecipients = useMemo(
    () => orderedRecipients.filter((recipient) => recipient.action === "Sign"),
    [orderedRecipients],
  );

  const reviewChecklist = useMemo(() => ({
    hasEnvelopeName: envelopeName.trim().length > 0,
    hasDocuments: uploadedFiles.length > 0,
    hasSigners: signerRecipients.length > 0,
    hasFields: placedFields.length > 0,
  }), [envelopeName, uploadedFiles.length, signerRecipients.length, placedFields.length]);

  const canSendForReview = Object.values(reviewChecklist).every(Boolean);
  const reviewBlocker = !reviewChecklist.hasEnvelopeName
    ? "Add an envelope name"
    : !reviewChecklist.hasDocuments
      ? "Upload at least one document"
      : !reviewChecklist.hasSigners
        ? "Add at least one signer"
        : !reviewChecklist.hasFields
          ? "Place at least one field"
          : !user?.companyId
            ? "Sign in to send emails"
            : "";

  const signerPreviewPayload = useMemo<SignerPreviewPayload>(() => ({
    envelopeName,
    subject,
    message,
    pageCount: Math.max(pdfPageCount, ...placedFields.map((field) => Number(field.page) || 1), 1),
    recipients: orderedRecipients,
    placedFields,
  }), [envelopeName, subject, message, pdfPageCount, orderedRecipients, placedFields]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIGNER_PREVIEW_STORAGE_KEY, JSON.stringify(signerPreviewPayload));
  }, [signerPreviewPayload]);

  useEffect(() => {
    const pdfFile = uploadedFiles.find((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (!pdfFile) {
      setPdfPreviewUrl(null);
      setPdfDocument(null);
      setPdfPageCount(1);
      setActivePreviewPage(1);
      setCanvasSize({ width: 0, height: 0 });
      return;
    }

    const url = URL.createObjectURL(pdfFile);
    setPdfPreviewUrl(url);

    (async () => {
      try {
        // @ts-expect-error pdfjs-dist mjs build typing mismatch
        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs";
        const buffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        setPdfDocument(pdf);
        setPdfPageCount(pdf.numPages || 1);
        setActivePreviewPage(1);
        setSelectedFieldId(null);
      } catch {
        setPdfDocument(null);
        setPdfPageCount(1);
      }
    })();

    return () => URL.revokeObjectURL(url);
  }, [uploadedFiles]);

  useEffect(() => {
    if (!pdfDocument || !pdfCanvasRef.current || !pdfContainerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const page = await pdfDocument.getPage(activePreviewPage);
        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = Math.max(320, pdfContainerRef.current?.clientWidth || 320);
        const scale = (containerWidth / baseViewport.width) * (zoomLevel / 100);
        const viewport = page.getViewport({ scale });
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        if (!cancelled) {
          setCanvasSize({ width: viewport.width, height: viewport.height });
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch {
        // ignore preview render failure for now
      }
    })();

    const resizeHandler = () => {
      setCanvasSize((prev) => ({ ...prev }));
    };

    window.addEventListener("resize", resizeHandler);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", resizeHandler);
    };
  }, [pdfDocument, activePreviewPage, zoomLevel, isFullscreenEditorOpen]);

  useEffect(() => {
    if (!dragState || !pdfContainerRef.current) return;

    const onPointerMove = (event: PointerEvent) => {
      const rect = pdfContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaX = ((event.clientX - dragState.startX) / rect.width) * 100;
      const deltaY = ((event.clientY - dragState.startY) / rect.height) * 100;

      if (dragState.mode === "move") {
        updateField(dragState.fieldId, {
          x: dragState.originX + deltaX,
          y: dragState.originY + deltaY,
        });
      } else {
        updateField(dragState.fieldId, {
          width: dragState.originWidth + deltaX,
          height: dragState.originHeight + deltaY,
        });
      }
    };

    const onPointerUp = () => setDragState(null);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState]);

  function getDefaultFieldSize(type: string) {
    if (type === "Signature") return { width: 22, height: 2 };
    if (type === "Initials") return { width: 12, height: 2 };
    if (type === "Checkbox") return { width: 8, height: 2 };
    if (type === "Date Signed") return { width: 18, height: 2 };
    return { width: 20, height: 2 };
  }

  function placeFieldAtPosition(x: number, y: number) {
    if (!selectedRecipientId) return;
    const size = getDefaultFieldSize(selectedFieldType);
    setPlacedFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: selectedFieldType,
        x,
        y,
        width: size.width,
        height: size.height,
        recipientId: selectedRecipientId,
        page: activePreviewPage,
        label: selectedFieldType,
        required: true,
      },
    ]);
    setSaveStatus("idle");
  }

  function removeField(id: string) {
    setPlacedFields((prev) => prev.filter((field) => field.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    setSaveStatus("idle");
  }

  function clampFieldBounds(field: SignField, updates: Partial<SignField>) {
    const next = { ...field, ...updates };
    const width = Math.min(60, Math.max(6, next.width));
    const height = Math.min(25, Math.max(2, next.height));
    const x = Math.min(100 - width / 2, Math.max(width / 2, next.x));
    const y = Math.min(100 - height / 2, Math.max(height / 2, next.y));
    return { ...next, width, height, x, y };
  }

  function updateField(id: string, updates: Partial<SignField>) {
    setPlacedFields((prev) => prev.map((field) => field.id === id ? clampFieldBounds(field, updates) : field));
    setSaveStatus("idle");
  }

  function adjustZoom(delta: number) {
    setZoomLevel((current) => Math.max(75, Math.min(200, current + delta)));
  }

  function resetDocumentView() {
    setZoomLevel(100);
    setActivePreviewPage(1);
    if (editorScrollRef.current) {
      editorScrollRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    setSelectedFieldId(null);
  }

  function saveDraft() {
    setSaveStatus("saved");
  }

  async function sendForReview() {
    if (!reviewChecklist.hasEnvelopeName) {
      setReviewStatus("error");
      setReviewFeedback("Envelope name is required before email can send.");
      toast("Envelope name is required", "error");
      return;
    }
    if (!reviewChecklist.hasDocuments) {
      setReviewStatus("error");
      setReviewFeedback("Upload at least one document before sending.");
      toast("Upload at least one document first", "error");
      return;
    }
    if (!reviewChecklist.hasSigners) {
      setReviewStatus("error");
      setReviewFeedback("Add at least one signer before sending.");
      toast("Add at least one signer before sending", "error");
      return;
    }
    if (!reviewChecklist.hasFields) {
      setReviewStatus("error");
      setReviewFeedback("Place at least one sign field before sending.");
      toast("Place at least one sign field before sending", "error");
      return;
    }
    if (!user?.companyId) {
      setReviewStatus("error");
      setReviewFeedback("You need to be signed in to send review emails.");
      toast("You need to be signed in to send review emails", "error");
      return;
    }

    try {
      setReviewStatus("sending");
      setReviewFeedback(`Sending ${signerRecipients.length} review email${signerRecipients.length === 1 ? "" : "s"}...`);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIGNER_PREVIEW_STORAGE_KEY, JSON.stringify(signerPreviewPayload));
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.opsslate.app";

      for (const signer of signerRecipients) {
        const signerLink = `${origin}/client/${signer.id}`;
        const signerFieldCount = placedFields.filter((field) => field.recipientId === signer.id).length;
        const introMessage = message.trim() || "Please review the attached document and complete your assigned signature fields.";
        const emailBody = [
          `Hi ${signer.name},`,
          "",
          introMessage,
          "",
          `Envelope: ${envelopeName}`,
          `Your role: ${signer.role || "Signer"}`,
          `Assigned fields: ${signerFieldCount}`,
          "",
          `Open and review: ${signerLink}`,
          "",
          "This email was sent from OpsSlate Sign.",
        ].join("\n");
        const emailHtml = `
          <div style="background:#f3f6fb;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,0.08);">
              <div style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);color:#ffffff;">
                <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.72;margin-bottom:10px;">Ops Sign</div>
                <h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:700;">Review & Sign Requested</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;opacity:.9;">${envelopeName}</p>
              </div>
              <div style="padding:32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">Hi <strong>${signer.name}</strong>,</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#334155;">${introMessage}</p>
                <div style="border:1px solid #dbe4f0;border-radius:16px;background:#f8fafc;padding:18px 20px;margin-bottom:24px;">
                  <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:180px;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin-bottom:6px;">Envelope</div>
                      <div style="font-size:15px;font-weight:600;color:#0f172a;">${envelopeName}</div>
                    </div>
                    <div style="flex:1;min-width:140px;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin-bottom:6px;">Your Role</div>
                      <div style="font-size:15px;font-weight:600;color:#0f172a;">${signer.role || "Signer"}</div>
                    </div>
                    <div style="flex:1;min-width:120px;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin-bottom:6px;">Assigned Fields</div>
                      <div style="font-size:15px;font-weight:600;color:#0f172a;">${signerFieldCount}</div>
                    </div>
                  </div>
                </div>
                <div style="text-align:center;margin:28px 0 24px;">
                  <a href="${signerLink}" style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 26px;border-radius:12px;box-shadow:0 10px 24px rgba(37,99,235,0.25);">Review & Sign</a>
                </div>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#64748b;">If the button above doesn't work, use this direct link:</p>
                <p style="margin:0 0 24px;word-break:break-all;"><a href="${signerLink}" style="color:#2563eb;text-decoration:none;font-size:13px;line-height:1.7;">${signerLink}</a></p>
                <div style="border-top:1px solid #e5e7eb;padding-top:18px;font-size:12px;line-height:1.7;color:#94a3b8;">
                  Sent from <strong>OpsSlate &lt;notifications@opsslate.app&gt;</strong><br/>
                  Powered by OpsSlate Sign
                </div>
              </div>
            </div>
          </div>
        `;

        await sendEmail({
          companyId: String(user.companyId),
          to: signer.email,
          subject,
          body: emailBody,
          html: emailHtml,
          senderName: "OpsSlate",
        });
      }

      setReviewStatus("sent");
      setReviewFeedback(`Review emails sent to ${signerRecipients.length} signer${signerRecipients.length === 1 ? "" : "s"} from notifications@opsslate.app.`);
      toast(`Sent for review to ${signerRecipients.length} signer${signerRecipients.length === 1 ? "" : "s"}`, "success");
    } catch (error) {
      const message = `Failed to send review email: ${(error as Error).message}`;
      setReviewStatus("error");
      setReviewFeedback(message);
      toast(message, "error");
    }
  }

  async function saveAsCopy() {
    const baseName = envelopeName.replace(/ \(Copy(?: \d+)?\)$/,"" );
    const nextCopyNumber = copyCount + 1;
    const nextName = nextCopyNumber === 1 ? `${baseName} (Copy)` : `${baseName} (Copy ${nextCopyNumber})`;
    setCopyCount(nextCopyNumber);
    setEnvelopeName(nextName);

    try {
      const [{ jsPDF }] = await Promise.all([
        import("jspdf"),
      ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const pdfFile = uploadedFiles.find((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
      if (!pdfFile) throw new Error("No PDF loaded");

      // @ts-expect-error pdfjs-dist mjs build typing mismatch
      const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs";
      const buffer = await pdfFile.arrayBuffer();
      const sourcePdf = await pdfjsLib.getDocument({ data: buffer }).promise;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      const drawableWidth = pageWidth - margin * 2;
      const drawableHeight = pageHeight - margin * 2;

      for (let pageNumber = 1; pageNumber <= sourcePdf.numPages; pageNumber++) {
        if (pageNumber > 1) doc.addPage();

        const page = await sourcePdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const pageImage = canvas.toDataURL("image/png");
        doc.addImage(pageImage, "PNG", margin, margin, drawableWidth, drawableHeight);

        const items = placedFields
          .filter((field) => Number(field.page) === Number(pageNumber))
          .map((field) => ({
            ...field,
            width: Number(field.width),
            height: Number(field.height),
            x: Number(field.x),
            y: Number(field.y),
            page: Number(field.page),
          }));
        items.forEach((field) => {
          const x = margin + (drawableWidth * field.x) / 100 - ((drawableWidth * field.width) / 100) / 2;
          const y = margin + (drawableHeight * field.y) / 100 - ((drawableHeight * field.height) / 100) / 2;
          const w = (drawableWidth * field.width) / 100;
          const h = (drawableHeight * field.height) / 100;
          const textY = y + h - 1;
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.text(field.label || field.type, Math.max(x + 1, margin), textY, { baseline: "bottom", maxWidth: Math.max(w - 2, 10) });
        });
      }

      const pdfBlob = doc.output("blob");
      const safeName = `${nextName.replace(/[^a-z0-9-_ ]/gi, "").trim() || "ops-sign-envelope"}.pdf`;

      try {
        if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
          const handle = await (window as Window & {
            showSaveFilePicker: (options?: {
              suggestedName?: string;
              types?: Array<{ description?: string; accept: Record<string, string[]> }>;
            }) => Promise<{
              createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
            }>;
          }).showSaveFilePicker({
            suggestedName: safeName,
            types: [
              {
                description: "PDF document",
                accept: { "application/pdf": [".pdf"] },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          setSaveStatus("savedAs");
          return;
        }
      } catch {
        // fall back to browser download below
      }

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeName;
      link.click();
      URL.revokeObjectURL(url);
      setSaveStatus("savedAs");
    } catch {
      setSaveStatus("idle");
    }
  }

  const signerCount = orderedRecipients.filter((r) => r.action === "Sign").length;
  const ccCount = orderedRecipients.filter((r) => r.action === "CC").length;

  function addRecipient() {
    if (!recipientDraft.name.trim() || !recipientDraft.email.trim()) return;
    setRecipients((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: recipientDraft.name.trim(),
        email: recipientDraft.email.trim(),
        role: recipientDraft.role.trim() || (recipientDraft.action === "CC" ? "Observer" : "Signer"),
        routingOrder: prev.length + 1,
        action: recipientDraft.action,
      },
    ]);
    setRecipientDraft({ name: "", email: "", role: "", action: "Sign" });
  }

  function removeRecipient(id: string) {
    setRecipients((prev) =>
      prev
        .filter((r) => r.id !== id)
        .map((r, index) => ({ ...r, routingOrder: index + 1 })),
    );
  }

  function updateRouting(id: string, direction: -1 | 1) {
    const next = [...orderedRecipients];
    const index = next.findIndex((r) => r.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setRecipients(next.map((r, i) => ({ ...r, routingOrder: i + 1 })));
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Card className="border-border bg-gradient-to-r from-background to-secondary/20 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardContent className="px-6 py-6 md:px-8 md:py-7 xl:px-10 xl:py-8">
            <div className="space-y-4">
              <div>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block">← Back to Dashboard</Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-500/15 text-blue-300">Ops Sign</Badge>
                      <Badge className="bg-green-500/15 text-green-300">Envelope Builder</Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">DocuSign-style signing inside OpsSlate</h1>
                    <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                      First working pass: upload a document, set recipients, control routing order, and prepare an envelope for signature without leaving OpsSlate.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { void sendForReview(); }} disabled={reviewStatus === "sending" || !!reviewBlocker} title={reviewBlocker || undefined}>{reviewStatus === "sending" ? "Sending…" : "Send for Signature"}</Button>
                    <Button variant="outline">Save Draft</Button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="text-xs text-muted-foreground">Templates</div>
                  <div className="text-2xl font-bold mt-1">{templates.length}</div>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="text-xs text-muted-foreground">Signers</div>
                  <div className="text-2xl font-bold mt-1">{signerCount}</div>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="text-xs text-muted-foreground">CC Recipients</div>
                  <div className="text-2xl font-bold mt-1">{ccCount}</div>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="text-xs text-muted-foreground">Documents Loaded</div>
                  <div className="text-2xl font-bold mt-1">{uploadedFiles.length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>3. Document Editor</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">Zoom, place, inspect, and save fields on a real document canvas.</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={editorMode === "select" ? "default" : "outline"} size="sm" onClick={() => setEditorMode("select")}>Select</Button>
                    <Button variant={editorMode === "place" ? "default" : "outline"} size="sm" onClick={() => setEditorMode("place")}>Place</Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={signerPreviewHref} target="_blank" rel="noreferrer">Open Signer View</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={saveDraft}>Save</Button>
                    <Button variant="outline" size="sm" onClick={saveAsCopy}>Save As</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid xl:grid-cols-[220px_minmax(0,1fr)_240px] gap-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Signer</div>
                      <select
                        value={selectedRecipientId}
                        onChange={(e) => setSelectedRecipientId(e.target.value)}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      >
                        {orderedRecipients.filter((r) => r.action === "Sign").map((recipient) => (
                          <option key={recipient.id} value={recipient.id}>{recipient.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Tools</div>
                      <div className="grid grid-cols-1 gap-2">
                        {fields.map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => {
                              setSelectedFieldType(field);
                              setEditorMode("place");
                            }}
                            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${selectedFieldType === field ? "border-blue-500 bg-blue-500/15 text-blue-200" : "border-border bg-background hover:bg-secondary/40"}`}
                          >
                            {field}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Zoom</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => adjustZoom(-5)}>-</Button>
                        <button type="button" onClick={resetDocumentView} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-center text-sm hover:bg-secondary/40">{zoomLevel}%</button>
                        <Button size="sm" variant="outline" onClick={() => adjustZoom(5)}>+</Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      {saveStatus === "saved" ? "Draft saved." : saveStatus === "savedAs" ? "Saved as a new copy." : "Unsaved edits."}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/60 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border text-xs text-muted-foreground">
                      <span>{pdfPreviewUrl ? "Editor Canvas" : "Awaiting PDF upload"}</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={activePreviewPage <= 1} onClick={() => setActivePreviewPage((p) => Math.max(1, p - 1))}>Prev</Button>
                        <span>Page {activePreviewPage} / {pdfPageCount}</span>
                        <Button size="sm" variant="outline" disabled={activePreviewPage >= pdfPageCount} onClick={() => setActivePreviewPage((p) => Math.min(pdfPageCount, p + 1))}>Next</Button>
                      </div>
                    </div>
                    <div ref={editorScrollRef} className="p-3 overflow-auto max-h-[860px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_45%)]">
                      <div
                        ref={pdfContainerRef}
                        className="relative mx-auto w-fit rounded-xl border border-border bg-[#f8fafc] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                      >
                        <div
                          className={`relative mx-auto rounded-md overflow-hidden bg-white border border-slate-200 ${editorMode === "place" ? "cursor-crosshair" : "cursor-default"}`}
                          style={{ width: canvasSize.width || "100%", height: canvasSize.height || 0 }}
                          onClick={(e) => {
                            if (editorMode !== "place" || !pdfDocument || !selectedRecipientId || !canvasSize.width || !canvasSize.height) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            placeFieldAtPosition(x, y);
                          }}
                        >
                          {pdfPreviewUrl ? (
                            <>
                              <canvas ref={pdfCanvasRef} className="block h-auto max-w-none" />
                              <div className="absolute inset-0">
                                {placedFields.filter((field) => field.page === activePreviewPage).map((field) => {
                                  const recipient = orderedRecipients.find((r) => r.id === field.recipientId);
                                  const selected = selectedFieldId === field.id;
                                  return (
                                    <div
                                      key={field.id}
                                      className={`absolute border text-[10px] font-medium shadow-lg backdrop-blur-sm transition-all ${selected ? "border-orange-400 ring-2 ring-orange-300/60" : "border-blue-400/70"}`}
                                      style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}%`, height: `${field.height}%`, transform: "translate(-50%, -50%)" }}
                                    >
                                      <button
                                        type="button"
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          setSelectedFieldId(field.id);
                                          setEditorMode("select");
                                          setDragState({ fieldId: field.id, mode: "move", startX: e.clientX, startY: e.clientY, originX: field.x, originY: field.y, originWidth: field.width, originHeight: field.height });
                                        }}
                                        className={`flex h-full w-full flex-col items-start justify-center px-2 py-1 text-left ${selected ? "bg-orange-500/95 text-white" : "bg-blue-500/88 text-white"}`}
                                      >
                                        <div>{field.label}</div>
                                      </button>
                                      <button
                                        type="button"
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          setSelectedFieldId(field.id);
                                          setDragState({ fieldId: field.id, mode: "resize", startX: e.clientX, startY: e.clientY, originX: field.x, originY: field.y, originWidth: field.width, originHeight: field.height });
                                        }}
                                        className="absolute bottom-0 right-0 h-3 w-3 bg-white border border-slate-400 rounded-sm translate-x-1/2 translate-y-1/2"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground min-h-[420px]">
                              Upload a PDF to start editing.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Selected Field</div>
                      {selectedFieldId ? (() => {
                        const field = placedFields.find((item) => item.id === selectedFieldId);
                        const recipient = orderedRecipients.find((r) => r.id === field?.recipientId);
                        if (!field) return <div className="text-sm text-muted-foreground">Field not found.</div>;
                        return (
                          <div className="space-y-3">
                            <div className="rounded-lg border border-border bg-background p-3 text-sm">
                              <div className="font-medium">{field.type}</div>
                              <div className="text-xs text-muted-foreground mt-1">{recipient?.name || "Signer"} • Page {field.page}</div>
                            </div>
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Label</label>
                              <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">X</label>
                                <Input type="number" value={field.x.toFixed(1)} onChange={(e) => updateField(field.id, { x: Number(e.target.value) })} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Y</label>
                                <Input type="number" value={field.y.toFixed(1)} onChange={(e) => updateField(field.id, { y: Number(e.target.value) })} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Width</label>
                                <Input type="number" value={field.width.toFixed(1)} onChange={(e) => updateField(field.id, { width: Number(e.target.value) })} className="mt-1" />
                              </div>
                              <div>
                                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Height</label>
                                <Input type="number" value={field.height.toFixed(1)} onChange={(e) => updateField(field.id, { height: Number(e.target.value) })} className="mt-1" />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                              Required field
                            </label>
                            <Button variant="outline" size="sm" onClick={() => removeField(field.id)} className="w-full">Remove Field</Button>
                          </div>
                        );
                      })() : <div className="text-sm text-muted-foreground">Select a field to inspect it.</div>}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {placedFields.length > 0 ? placedFields.map((field) => {
                    const recipient = orderedRecipients.find((r) => r.id === field.recipientId);
                    return (
                      <div key={field.id} className="rounded-lg border border-border bg-secondary/20 px-3 py-2 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <div className="font-medium">{field.type} • {recipient?.name || "Signer"}</div>
                          <div className="text-xs text-muted-foreground">Page {field.page} • X {field.x.toFixed(1)}% • Y {field.y.toFixed(1)}%</div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeField(field.id)}>Remove</Button>
                      </div>
                    );
                  }) : <div className="text-sm text-muted-foreground">No fields placed yet.</div>}
                </div>
              </CardContent>
            </Card>

          <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>1. Envelope Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Envelope Name</label>
                      <Input value={envelopeName} onChange={(e) => setEnvelopeName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Template</label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      >
                        {templates.map((template) => (
                          <option key={template.name} value={template.name}>{template.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium">Document Upload</div>
                        <div className="text-xs text-muted-foreground mt-1">Upload contract PDFs, proposals, change orders, or any signable file.</div>
                      </div>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload Document</Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) setUploadedFiles((prev) => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                    <div className="space-y-2 mt-4">
                      {uploadedFiles.length > 0 ? uploadedFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="rounded-lg border border-border bg-background/60 px-3 py-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{file.name}</div>
                            <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {index === 0 && file.name.toLowerCase().endsWith(".pdf") ? (
                              <>
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={signerPreviewHref} target="_blank" rel="noreferrer">Open Signer View</Link>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setIsFullscreenEditorOpen(true)}>Open Fullscreen Editor</Button>
                              </>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                          No documents loaded yet.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>2. Recipients & Routing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Full name" value={recipientDraft.name} onChange={(e) => setRecipientDraft((prev) => ({ ...prev, name: e.target.value }))} />
                    <Input placeholder="Email address" value={recipientDraft.email} onChange={(e) => setRecipientDraft((prev) => ({ ...prev, email: e.target.value }))} />
                    <Input placeholder="Role / title" value={recipientDraft.role} onChange={(e) => setRecipientDraft((prev) => ({ ...prev, role: e.target.value }))} />
                    <select
                      value={recipientDraft.action}
                      onChange={(e) => setRecipientDraft((prev) => ({ ...prev, action: e.target.value as "Sign" | "CC" }))}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    >
                      <option value="Sign">Needs to Sign</option>
                      <option value="CC">Receives Copy</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={addRecipient}>Add Recipient</Button>
                  </div>

                  <div className="space-y-3">
                    {orderedRecipients.map((recipient, index) => (
                      <div key={recipient.id} className="rounded-xl border border-border bg-secondary/20 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">Step {index + 1}</Badge>
                            <Badge className={recipient.action === "Sign" ? "bg-blue-500/15 text-blue-300" : "bg-secondary text-muted-foreground"}>{recipient.action}</Badge>
                            <span className="font-medium">{recipient.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{recipient.email} • {recipient.role || "No role set"}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => updateRouting(recipient.id, -1)} disabled={index === 0}>↑</Button>
                          <Button size="sm" variant="outline" onClick={() => updateRouting(recipient.id, 1)} disabled={index === orderedRecipients.length - 1}>↓</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeRecipient(recipient.id)}>Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>4. Send Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email Subject</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-h-[140px] resize-y"
                    />
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Ready Check</div>
                    <div className="flex items-center justify-between text-sm"><span>Envelope Name</span><Badge variant="secondary">{reviewChecklist.hasEnvelopeName ? "Ready" : "Missing"}</Badge></div>
                    <div className="flex items-center justify-between text-sm"><span>Documents</span><Badge variant="secondary">{reviewChecklist.hasDocuments ? `${uploadedFiles.length} loaded` : "Missing"}</Badge></div>
                    <div className="flex items-center justify-between text-sm"><span>Signers</span><Badge variant="secondary">{reviewChecklist.hasSigners ? `${signerRecipients.length} ready` : "Missing"}</Badge></div>
                    <div className="flex items-center justify-between text-sm"><span>Fields</span><Badge variant="secondary">{reviewChecklist.hasFields ? `${placedFields.length} placed` : "Missing"}</Badge></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="flex-1 min-w-[180px]" disabled={(!canSendForReview && reviewStatus !== "sent") || reviewStatus === "sending"} onClick={() => { void sendForReview(); }} title={reviewBlocker || undefined}>
                      {reviewStatus === "sending" ? "Sending…" : reviewStatus === "sent" ? "Sent for Review" : "Send for Review"}
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={signerPreviewHref} target="_blank" rel="noreferrer">Preview Signer Link</Link>
                    </Button>
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-4 space-y-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Review Status</div>
                    <div className="text-sm text-muted-foreground">
                      {reviewStatus === "sent"
                        ? `Review emails sent from notifications@opsslate.app. Latest signer preview: ${signerPreviewHref}`
                        : reviewStatus === "sending"
                          ? "Sending review emails now…"
                          : reviewStatus === "error"
                            ? "The send action hit a blocker. See details below."
                            : canSendForReview
                              ? "Everything required is in place. You can send this package for review now."
                              : "Complete the missing items above to activate send for review."}
                    </div>
                    {reviewFeedback ? (
                      <div className={`rounded-lg px-3 py-2 text-sm ${reviewStatus === "error" ? "bg-red-500/10 text-red-300 border border-red-500/20" : reviewStatus === "sent" ? "bg-green-500/10 text-green-300 border border-green-500/20" : "bg-secondary/50 text-muted-foreground border border-border"}`}>
                        {reviewFeedback}
                      </div>
                    ) : null}
                    {reviewBlocker && reviewStatus !== "sent" ? (
                      <div className="text-xs text-amber-300">Blocked: {reviewBlocker}</div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Field Types</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {fields.map((field) => <Badge key={field} variant="secondary">{field}</Badge>)}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {isFullscreenEditorOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 md:p-6">
            <div className="flex h-full flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">Fullscreen Document Editor</div>
                  <div className="text-xs text-muted-foreground">Zoom in, place fields, and save without the cramped sidebar layout.</div>
                  <div className="text-xs text-blue-300 mt-1">{envelopeName}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => adjustZoom(-5)}>-</Button>
                  <button type="button" onClick={resetDocumentView} className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm hover:bg-secondary/50">{zoomLevel}%</button>
                  <Button variant="outline" size="sm" onClick={() => adjustZoom(5)}>+</Button>
                  <Button variant="outline" size="sm" onClick={saveDraft}>Save</Button>
                  <Button variant="outline" size="sm" onClick={saveAsCopy}>Save As</Button>
                  <Button size="sm" onClick={() => setIsFullscreenEditorOpen(false)}>Close</Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_40%)]">
                <div className="mx-auto flex w-full max-w-[1800px] gap-4">
                  <div className="w-[110px] shrink-0 rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pages</div>
                    <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-auto pr-1">
                      {Array.from({ length: pdfPageCount }, (_, i) => i + 1).map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setActivePreviewPage(pageNumber)}
                          className={`w-full rounded-lg border px-2 py-3 text-xs text-left transition ${activePreviewPage === pageNumber ? "border-blue-500 bg-blue-500/15 text-blue-200" : "border-border bg-background hover:bg-secondary/40"}`}
                        >
                          <div className="font-medium">Page {pageNumber}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">{placedFields.filter((field) => field.page === pageNumber).length} field(s)</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-[220px] shrink-0 rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      {saveStatus === "saved" ? "Draft saved." : saveStatus === "savedAs" ? "Saved as a new copy." : "Unsaved edits."}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Field Tools</div>
                    {fields.map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => {
                          setSelectedFieldType(field);
                          setEditorMode("place");
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${selectedFieldType === field ? "border-blue-500 bg-blue-500/15 text-blue-200" : "border-border bg-background hover:bg-secondary/40"}`}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-border bg-background/60 overflow-auto">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border text-xs text-muted-foreground">
                      <span>{pdfPreviewUrl ? "Fullscreen Canvas" : "Awaiting PDF upload"}</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={activePreviewPage <= 1} onClick={() => setActivePreviewPage((p) => Math.max(1, p - 1))}>Prev</Button>
                        <span>Page {activePreviewPage} / {pdfPageCount}</span>
                        <Button size="sm" variant="outline" disabled={activePreviewPage >= pdfPageCount} onClick={() => setActivePreviewPage((p) => Math.min(pdfPageCount, p + 1))}>Next</Button>
                      </div>
                    </div>
                    <div ref={editorScrollRef} className="p-4 overflow-auto max-h-[calc(100vh-180px)]">
                      <div
                        ref={pdfContainerRef}
                        className="relative mx-auto w-fit rounded-xl border border-border bg-[#f8fafc] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                      >
                        <div
                          className={`relative mx-auto rounded-md overflow-hidden bg-white border border-slate-200 ${editorMode === "place" ? "cursor-crosshair" : "cursor-default"}`}
                          style={{ width: canvasSize.width || "100%", height: canvasSize.height || 0 }}
                          onClick={(e) => {
                            if (editorMode !== "place" || !pdfDocument || !selectedRecipientId || !canvasSize.width || !canvasSize.height) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            placeFieldAtPosition(x, y);
                          }}
                        >
                          {pdfPreviewUrl ? (
                            <>
                              <canvas ref={pdfCanvasRef} className="block h-auto max-w-none" />
                              <div className="absolute inset-0">
                                {placedFields.filter((field) => field.page === activePreviewPage).map((field) => {
                                  const recipient = orderedRecipients.find((r) => r.id === field.recipientId);
                                  const selected = selectedFieldId === field.id;
                                  return (
                                    <div
                                      key={field.id}
                                      className={`absolute border text-[10px] font-medium shadow-lg backdrop-blur-sm transition-all ${selected ? "border-orange-400 ring-2 ring-orange-300/60" : "border-blue-400/70"}`}
                                      style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}%`, height: `${field.height}%`, transform: "translate(-50%, -50%)" }}
                                    >
                                      <button
                                        type="button"
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          setSelectedFieldId(field.id);
                                          setEditorMode("select");
                                          setDragState({ fieldId: field.id, mode: "move", startX: e.clientX, startY: e.clientY, originX: field.x, originY: field.y, originWidth: field.width, originHeight: field.height });
                                        }}
                                        className={`flex h-full w-full flex-col items-start justify-center px-2 py-1 text-left ${selected ? "bg-orange-500/95 text-white" : "bg-blue-500/88 text-white"}`}
                                      >
                                        <div>{field.label}</div>
                                      </button>
                                      <button
                                        type="button"
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          setSelectedFieldId(field.id);
                                          setDragState({ fieldId: field.id, mode: "resize", startX: e.clientX, startY: e.clientY, originX: field.x, originY: field.y, originWidth: field.width, originHeight: field.height });
                                        }}
                                        className="absolute bottom-0 right-0 h-3 w-3 bg-white border border-slate-400 rounded-sm translate-x-1/2 translate-y-1/2"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground min-h-[420px]">
                              Upload a PDF to start editing.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-[260px] shrink-0 rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Selected Field</div>
                    {selectedFieldId ? (() => {
                      const field = placedFields.find((item) => item.id === selectedFieldId);
                      const recipient = orderedRecipients.find((r) => r.id === field?.recipientId);
                      if (!field) return <div className="text-sm text-muted-foreground">Field not found.</div>;
                      return (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-border bg-background p-3 text-sm">
                            <div className="font-medium">{field.type}</div>
                            <div className="text-xs text-muted-foreground mt-1">{recipient?.name || "Signer"} • Page {field.page}</div>
                          </div>
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Label</label>
                            <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="mt-1" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">X</label>
                              <Input type="number" value={field.x.toFixed(1)} onChange={(e) => updateField(field.id, { x: Number(e.target.value) })} className="mt-1" />
                            </div>
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Y</label>
                              <Input type="number" value={field.y.toFixed(1)} onChange={(e) => updateField(field.id, { y: Number(e.target.value) })} className="mt-1" />
                            </div>
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Width</label>
                              <Input type="number" value={field.width.toFixed(1)} onChange={(e) => updateField(field.id, { width: Number(e.target.value) })} className="mt-1" />
                            </div>
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Height</label>
                              <Input type="number" value={field.height.toFixed(1)} onChange={(e) => updateField(field.id, { height: Number(e.target.value) })} className="mt-1" />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                            Required field
                          </label>
                          <Button variant="outline" size="sm" onClick={() => removeField(field.id)} className="w-full">Remove Field</Button>
                        </div>
                      );
                    })() : <div className="text-sm text-muted-foreground">Select a field to inspect it.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Signature Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div key={template.name} className="rounded-xl border border-border bg-secondary/20 p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{template.type} • {template.signers} signer{template.signers === 1 ? "" : "s"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusTone(template.status)}>{template.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setSelectedTemplate(template.name)}>Use</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Recent Envelopes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {envelopes.map((envelope) => (
                <div key={envelope.title} className="rounded-xl border border-border bg-secondary/20 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-medium">{envelope.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{envelope.recipients} • Sent {envelope.sent}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusTone(envelope.status)}>{envelope.status}</Badge>
                    <Button size="sm" variant="outline">Open</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
