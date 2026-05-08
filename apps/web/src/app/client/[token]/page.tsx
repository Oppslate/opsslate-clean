"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type SignerField = {
  id: string;
  type: string;
  label: string;
  page: number;
  required: boolean;
  recipientId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  signedValue?: string;
  signedImage?: string;
  completedAt?: string;
};

type PreviewRecipient = {
  id: string;
  name: string;
  email: string;
  role: string;
  routingOrder: number;
  action: "Sign" | "CC";
};

type SignerPreviewPayload = {
  envelopeName: string;
  subject: string;
  message: string;
  pageCount: number;
  recipients: PreviewRecipient[];
  placedFields: Array<{
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
  }>;
};

const SIGNER_PREVIEW_STORAGE_KEY = "opssign-signer-preview";

const signatureStyles = [
  "Michael A. Johnson",
  "M. Johnson",
  "Michael Johnson",
  "M.A. Johnson",
];

function deriveInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const legalAgreements = [
  {
    id: "esign",
    title: "Electronic Signature Consent",
    body: "You agree that your electronic signature is the legal equivalent of your handwritten signature and that it is enforceable for this agreement.",
  },
  {
    id: "records",
    title: "Electronic Records Disclosure",
    body: "You consent to receive, review, and retain this agreement and related records electronically rather than in paper form.",
  },
  {
    id: "business",
    title: "Consent To Conduct Business Electronically",
    body: "You agree to transact and communicate electronically for this document package, including notices, acknowledgments, and signature events.",
  },
  {
    id: "authority",
    title: "Authority & Intent To Sign",
    body: "You confirm that you are the intended recipient, have authority to sign where applicable, and are signing with intent to be bound.",
  },
];

const baseAuditEvents = [
  { time: "Apr 23, 2026 • 3:34 PM", event: "Envelope opened", meta: "IP 71.198.xx.xx" },
  { time: "Apr 23, 2026 • 3:35 PM", event: "Signer session started", meta: "Recipient authentication scaffold passed" },
];

const fallbackRecipients: PreviewRecipient[] = [
  { id: "test", name: "Project Owner", email: "owner@example.com", role: "Owner", routingOrder: 1, action: "Sign" },
];

const fallbackSignerFields: SignerField[] = [
  { id: "sig-1", type: "Signature", label: "Owner Signature", page: 1, required: true, recipientId: "test", x: 32, y: 68, width: 26, height: 8 },
  { id: "date-1", type: "Date Signed", label: "Date Signed", page: 1, required: true, recipientId: "test", x: 70, y: 68, width: 20, height: 8 },
  { id: "init-1", type: "Initials", label: "Owner Initials", page: 2, required: false, recipientId: "test", x: 24, y: 24, width: 16, height: 8 },
];

export default function ClientSigningPage() {
  const params = useParams<{ token: string }>();
  const signerToken = typeof params?.token === "string" ? params.token : "test";

  const previewContext = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        envelopeName: "Town of Angelica — Subcontract Execution",
        message: "Please review the document and complete your assigned fields.",
        pageCount: 2,
        recipient: fallbackRecipients[0],
        fields: fallbackSignerFields,
      };
    }

    try {
      const rawPayload = window.localStorage.getItem(SIGNER_PREVIEW_STORAGE_KEY);
      if (!rawPayload) throw new Error("Missing preview payload");
      const payload = JSON.parse(rawPayload) as SignerPreviewPayload;
      const signers = (payload.recipients ?? [])
        .filter((item) => item.action === "Sign")
        .sort((a, b) => a.routingOrder - b.routingOrder);
      const matchedRecipient = signers.find((item) => item.id === signerToken) ?? signers[0] ?? fallbackRecipients[0];
      const mappedFields = (payload.placedFields ?? [])
        .filter((field) => field.recipientId === matchedRecipient.id)
        .map((field) => ({ ...field }));

      return {
        envelopeName: payload.envelopeName || "Town of Angelica — Subcontract Execution",
        message: payload.message || "Please review the document and complete your assigned fields.",
        pageCount: Math.max(payload.pageCount || 1, ...mappedFields.map((field) => Number(field.page) || 1), 1),
        recipient: matchedRecipient,
        fields: mappedFields.length ? mappedFields : fallbackSignerFields.map((field) => ({ ...field, recipientId: matchedRecipient.id })),
      };
    } catch {
      return {
        envelopeName: "Town of Angelica — Subcontract Execution",
        message: "Please review the document and complete your assigned fields.",
        pageCount: 2,
        recipient: fallbackRecipients[0],
        fields: fallbackSignerFields,
      };
    }
  }, [signerToken]);

  const [agreementChecks, setAgreementChecks] = useState<Record<string, boolean>>({});
  const [fullNameInput, setFullNameInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [declined, setDeclined] = useState(false);
  const [finishedLater, setFinishedLater] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [adoptMode, setAdoptMode] = useState<"style" | "type" | "draw" | "upload">("style");
  const [selectedStyle, setSelectedStyle] = useState(signatureStyles[0]);
  const [typedSignature, setTypedSignature] = useState("Michael A. Johnson");
  const [drawnSignature, setDrawnSignature] = useState("");
  const [uploadedSignatureName, setUploadedSignatureName] = useState("");
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [fieldStates, setFieldStates] = useState<Record<string, Pick<SignerField, "signedValue" | "signedImage" | "completedAt">>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const adoptSectionRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);

  const recipient = previewContext.recipient;
  const envelopeName = previewContext.envelopeName;
  const envelopeMessage = previewContext.message;
  const pageCount = previewContext.pageCount;
  const fullName = fullNameInput || recipient.name || "Michael A. Johnson";
  const title = titleInput || recipient.role || "Signer";

  const signerFields = useMemo(
    () => previewContext.fields.map((field) => ({ ...field, ...(fieldStates[field.id] ?? {}) })),
    [fieldStates, previewContext.fields],
  );

  const adoptedSignature = useMemo(() => {
    if (adoptMode === "style") return selectedStyle;
    if (adoptMode === "type") return typedSignature.trim();
    if (adoptMode === "draw") return hasDrawnSignature ? (drawnSignature.trim() || "Drawn signature captured") : "";
    return uploadedSignatureName || "Uploaded signature file";
  }, [adoptMode, selectedStyle, typedSignature, drawnSignature, uploadedSignatureName, hasDrawnSignature]);

  const activeField = signerFields.find((field) => field.id === activeFieldId) ?? signerFields[0] ?? null;
  const signerPages = useMemo(
    () => Array.from({ length: Math.max(pageCount, ...signerFields.map((field) => Number(field.page) || 1), 1) }, (_, index) => index + 1),
    [pageCount, signerFields],
  );
  const isDateField = (field: SignerField) => field.type === "Date Signed";
  const isInitialsField = (field: SignerField) => field.type === "Initials";
  const isSignatureField = (field: SignerField) => field.type === "Signature";
  const requiredSignerFields = signerFields.filter((field) => field.required);
  const requiredFieldsComplete = requiredSignerFields.every((field) => {
    if (field.type === "Date Signed") return !!field.signedValue;
    return !!field.signedValue || !!field.signedImage;
  });

  const allAgreementsAccepted = legalAgreements.every((item) => agreementChecks[item.id]);
  const completionItems = [
    { label: "All legal agreements accepted", complete: allAgreementsAccepted },
    { label: "Signer full name provided", complete: fullName.trim().length > 1 },
    { label: "Signer title provided", complete: title.trim().length > 1 },
    { label: "Required sign fields completed", complete: requiredFieldsComplete },
  ];
  const readyToSubmit = completionItems.every((item) => item.complete) && !declined;

  const resetSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#f8fafc";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
  };

  useEffect(() => {
    if (adoptMode !== "draw") return;
    requestAnimationFrame(() => {
      resetSignatureCanvas();
      setHasDrawnSignature(false);
      setDrawnSignature("");
    });
  }, [adoptMode]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getCanvasPoint(event);
    if (!canvas || !context || !point) return;
    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const drawSignatureStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const context = signatureCanvasRef.current?.getContext("2d");
    const point = getCanvasPoint(event);
    if (!context || !point) return;
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasDrawnSignature(true);
    setDrawnSignature(signatureCanvasRef.current?.toDataURL("image/png") || "");
  };

  const stopDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (event && signatureCanvasRef.current?.hasPointerCapture(event.pointerId)) {
      signatureCanvasRef.current.releasePointerCapture(event.pointerId);
    }
    if (hasDrawnSignature) {
      setDrawnSignature(signatureCanvasRef.current?.toDataURL("image/png") || "");
    }
  };

  const clearDrawnSignature = () => {
    resetSignatureCanvas();
    setHasDrawnSignature(false);
    setDrawnSignature("");
  };

  const focusFieldForSigning = (fieldId: string, preferredMode?: "style" | "type" | "draw" | "upload") => {
    setActiveFieldId(fieldId);
    if (preferredMode) setAdoptMode(preferredMode);
    requestAnimationFrame(() => {
      adoptSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const applySelectedSignatureToField = () => {
    if (!activeField) return;

    const timestamp = new Date().toLocaleString();
    const nextFieldState = (() => {
      if (isDateField(activeField)) {
        return { signedValue: new Date().toLocaleDateString(), completedAt: timestamp };
      }
      if (isInitialsField(activeField)) {
        return { signedValue: deriveInitials(fullName), completedAt: timestamp };
      }
      if (activeField.type === "Printed Name") {
        return { signedValue: fullName.trim(), completedAt: timestamp };
      }
      if (activeField.type === "Title") {
        return { signedValue: title.trim(), completedAt: timestamp };
      }
      if (activeField.type === "Checkbox") {
        return { signedValue: "Checked", completedAt: timestamp };
      }
      if (activeField.type === "Text Box") {
        return { signedValue: typedSignature.trim() || fullName.trim(), completedAt: timestamp };
      }

      return {
        signedValue: adoptMode === "draw" ? fullName.trim() || "Signer" : adoptedSignature,
        signedImage: isSignatureField(activeField) && adoptMode === "draw" ? drawnSignature : undefined,
        completedAt: timestamp,
      };
    })();

    setFieldStates((prev) => ({ ...prev, [activeField.id]: nextFieldState }));

    const currentIndex = signerFields.findIndex((field) => field.id === activeField.id);
    const nextPendingField = signerFields.slice(currentIndex + 1).find((field) => field.required && !field.signedValue && !field.signedImage)
      ?? signerFields.find((field) => field.required && !field.signedValue && !field.signedImage && field.id !== activeField.id)
      ?? null;

    if (nextPendingField) {
      setActiveFieldId(nextPendingField.id);
      if (isDateField(nextPendingField)) {
        requestAnimationFrame(() => applyDateField(nextPendingField.id));
      }
    }
  };

  const applyDateField = (fieldId: string) => {
    const timestamp = new Date().toLocaleString();
    setFieldStates((prev) => ({
      ...prev,
      [fieldId]: { signedValue: new Date().toLocaleDateString(), completedAt: timestamp },
    }));
  };

  const auditEvents = [
    ...baseAuditEvents,
    ...(allAgreementsAccepted ? [{ time: "Apr 23, 2026 • 3:51 PM", event: "Legal agreements accepted", meta: "All required disclosures acknowledged" }] : []),
    ...signerFields
      .filter((field) => field.completedAt)
      .map((field) => ({
        time: field.completedAt!,
        event: `${field.label} completed`,
        meta: isDateField(field) ? `Applied ${field.signedValue}` : `${field.type} value captured for ${recipient.name}`,
      })),
    ...(submitted ? [{ time: new Date().toLocaleString(), event: "Signature submitted", meta: "IP + timestamp + signer intent captured in scaffold state" }] : []),
    ...(finishedLater ? [{ time: new Date().toLocaleString(), event: "Signer chose finish later", meta: "Signing session paused" }] : []),
    ...(declined ? [{ time: new Date().toLocaleString(), event: "Envelope declined", meta: "Signer declined before completion" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-border bg-gradient-to-r from-background to-secondary/20">
          <CardContent className="px-6 py-6 md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/ops-sign">← Back to Ops Sign</Link>
                  </Button>
                  <Badge className="bg-blue-500/15 text-blue-300">Ops Sign</Badge>
                  <Badge className="bg-green-500/15 text-green-300">Signer View</Badge>
                  <Badge className="bg-violet-500/15 text-violet-300">{recipient.name}</Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{envelopeName}</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                  {envelopeMessage}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setDeclined(true); setSubmitted(false); }}>Decline</Button>
                <Button variant="outline" onClick={() => setFinishedLater(true)}>Finish Later</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>1. Legal Agreements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground leading-6">
                  You must accept each disclosure below before signing. This is the legal consent block for electronic signature, records delivery, intent to sign, and authority acknowledgment.
                </div>
                <div className="space-y-3">
                  {legalAgreements.map((item) => (
                    <label key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-4">
                      <input
                        type="checkbox"
                        checked={!!agreementChecks[item.id]}
                        onChange={(e) => setAgreementChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 leading-5">{item.body}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>2. Signer Identity</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full legal name</label>
                  <Input value={fullName} onChange={(e) => setFullNameInput(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Title / capacity</label>
                  <Input value={title} onChange={(e) => setTitleInput(e.target.value)} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>3. Sign Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground leading-6">
                  These are the real fields assigned to {recipient.name}. Click any field on the page preview to complete it.
                </div>
                {signerFields.length > 0 ? signerPages.map((pageNumber) => {
                  const pageFields = signerFields.filter((field) => Number(field.page) === pageNumber);
                  return (
                    <div key={pageNumber} className="rounded-2xl border border-border bg-white p-5 text-slate-900 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Page {pageNumber}</div>
                          <div className="text-lg font-semibold">{envelopeName}</div>
                        </div>
                        <Badge className="bg-slate-100 text-slate-700">{pageFields.length} field{pageFields.length === 1 ? "" : "s"}</Badge>
                      </div>
                      <div className="py-5">
                        <div className="relative h-[560px] rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-inner">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 border-b border-dashed border-slate-200" />
                          {pageFields.length > 0 ? pageFields.map((field) => {
                            const isSelected = field.id === activeFieldId;
                            const isComplete = !!field.signedValue || !!field.signedImage;
                            return (
                              <button
                                key={field.id}
                                type="button"
                                onClick={() => focusFieldForSigning(field.id, field.type === "Date Signed" ? undefined : field.type === "Initials" ? "type" : "style")}
                                className={`absolute overflow-hidden rounded-md border text-left shadow-sm transition ${isSelected ? "border-blue-500 ring-2 ring-blue-300/60" : "border-slate-300"}`}
                                style={{
                                  left: `${field.x}%`,
                                  top: `${field.y}%`,
                                  width: `${field.width}%`,
                                  height: `${Math.max(field.height, 5)}%`,
                                  transform: "translate(-50%, -50%)",
                                }}
                              >
                                <div className={`flex h-full w-full flex-col justify-between px-2 py-1 ${isSelected ? "bg-blue-50" : "bg-white/95"}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{field.label}</span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${isComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{isComplete ? "Done" : "Pending"}</span>
                                  </div>
                                  <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm italic text-slate-900">
                                    {field.signedValue || (field.signedImage ? "Signature applied" : field.type)}
                                  </div>
                                </div>
                              </button>
                            );
                          }) : (
                            <div className="flex h-full items-center justify-center text-sm text-slate-400">
                              No signer fields placed on this page.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    No signer fields were found for this recipient yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <div ref={adoptSectionRef}>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>4. Adopt Your Signature</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                  {activeField
                    ? isDateField(activeField)
                      ? `The active field is ${activeField.label}. Click apply below to stamp today's date.`
                      : isSignatureField(activeField)
                        ? `The active field is ${activeField.label}. Select the signature the signer wants, then apply it to this field.`
                        : isInitialsField(activeField)
                          ? `The active field is ${activeField.label}. We'll derive initials from the signer name when you apply it.`
                          : `The active field is ${activeField.label}. Review the signer details, then apply the value to this field.`
                    : "Select a sign field to continue."}
                </div>
                <div className="grid sm:grid-cols-4 gap-2">
                  {(["style", "type", "draw", "upload"] as const).map((mode) => (
                    <Button key={mode} variant={adoptMode === mode ? "default" : "outline"} onClick={() => setAdoptMode(mode)}>
                      {mode === "style" ? "Choose Style" : mode === "type" ? "Type" : mode === "draw" ? "Draw" : "Upload"}
                    </Button>
                  ))}
                </div>

                {adoptMode === "style" && (
                  <div className="grid md:grid-cols-2 gap-3">
                    {signatureStyles.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setSelectedStyle(style)}
                        className={`rounded-xl border p-4 text-left transition ${selectedStyle === style ? "border-blue-500 bg-blue-500/10" : "border-border bg-background/60"}`}
                      >
                        <div className="text-2xl italic">{style}</div>
                      </button>
                    ))}
                  </div>
                )}

                {adoptMode === "type" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Type your legal signature</label>
                    <Input value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="mt-1" />
                  </div>
                )}

                {adoptMode === "draw" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Draw signature</label>
                    <div className="mt-1 rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
                      <canvas
                        ref={signatureCanvasRef}
                        width={760}
                        height={220}
                        className="w-full rounded-lg border border-border bg-slate-950 touch-none"
                        onPointerDown={startDrawing}
                        onPointerMove={drawSignatureStroke}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">Use your mouse or finger to sign. Clear if you want to start over.</div>
                        <Button type="button" variant="outline" size="sm" onClick={clearDrawnSignature}>Clear</Button>
                      </div>
                    </div>
                  </div>
                )}

                {adoptMode === "upload" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Upload signature image</label>
                    <Input value={uploadedSignatureName} onChange={(e) => setUploadedSignatureName(e.target.value)} className="mt-1" placeholder="signature.png" />
                    <div className="text-xs text-muted-foreground mt-2">Upload handler scaffold is in place; real file binding is next.</div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Adopted Signature</div>
                  {adoptMode === "draw" && drawnSignature ? (
                    <img src={drawnSignature} alt="Drawn signature preview" className="max-h-24 w-auto" />
                  ) : (
                    <div className="text-2xl italic">{adoptedSignature || "No signature adopted yet"}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      if (isDateField(activeField!)) {
                        applyDateField(activeField!.id);
                        return;
                      }
                      applySelectedSignatureToField();
                    }}
                    disabled={!activeField || ((isSignatureField(activeField) || activeField.type === "Text Box") && !adoptedSignature)}
                  >
                    {activeField ? (isDateField(activeField) ? "Apply Date Field" : `Apply To ${activeField.label}`) : "Apply To Selected Field"}
                  </Button>
                  {activeField && !isDateField(activeField) ? (
                    <div className="text-sm text-muted-foreground self-center">
                      {isSignatureField(activeField)
                        ? "The signer chooses a style here, then explicitly applies it to the selected field."
                        : "Applying will fill this field using the signer details currently shown above."}
                    </div>
                  ) : null}
                </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>5. Completion Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completionItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm">
                    <span>{item.label}</span>
                    <Badge variant="secondary">{item.complete ? "Done" : "Pending"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>6. Signature Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Legal agreements</span>
                    <Badge variant="secondary">{allAgreementsAccepted ? "Accepted" : "Missing"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Signer identity</span>
                    <Badge variant="secondary">{fullName.trim() && title.trim() ? "Ready" : "Missing"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Required sign fields</span>
                    <Badge variant="secondary">{requiredFieldsComplete ? "Ready" : "Missing"}</Badge>
                  </div>
                </div>
                <Button className="w-full" disabled={!readyToSubmit || submitted} onClick={() => { setSubmitted(true); setDeclined(false); setFinishedLater(false); }}>
                  {submitted ? "Signature Submitted" : "Agree & Submit Signature"}
                </Button>
                {declined ? <div className="text-sm text-red-300">Signer marked this envelope as declined.</div> : null}
                {finishedLater ? <div className="text-sm text-amber-300">Signing session saved for later continuation.</div> : null}
                {submitted ? (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
                    Signature action recorded with legal-consent completion, selected signer fields, and audit event scaffold.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>7. Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {auditEvents.map((event) => (
                  <div key={`${event.time}-${event.event}`} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="font-medium text-sm">{event.event}</div>
                    <div className="text-xs text-muted-foreground mt-1">{event.time}</div>
                    <div className="text-xs text-muted-foreground mt-1">{event.meta}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
