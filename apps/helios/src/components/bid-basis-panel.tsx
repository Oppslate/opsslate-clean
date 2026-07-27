"use client";

import {
  HELIOS_BID_BASIS_CATEGORIES,
  HELIOS_BID_BASIS_PROFILES,
  bidBasisCategoryLabel,
  bidBasisProfileLabel,
  type HeliosBidBasisCategory,
  type HeliosBidBasisProfile,
  type HeliosBidBasisProfileType,
  type HeliosBidBasisReviewInput,
  type HeliosDocumentSummary,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@opsslate/suite-ui/dialog";
import { Input } from "@opsslate/suite-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@opsslate/suite-ui/select";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Pencil,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function label(value: string) {
  return value.replaceAll("_", " ");
}

function stateVariant(state: string) {
  if (["received", "ready", "available", "estimate_ready"].includes(state)) return "secondary" as const;
  if (["expected_missing", "limited", "estimate_ready_with_limitations"].includes(state)) return "outline" as const;
  if (["unavailable", "no_usable_scope_basis"].includes(state)) return "destructive" as const;
  return "outline" as const;
}

function CapabilityIcon({ state }: { state: string }) {
  if (state === "available") return <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />;
  if (state === "limited") return <AlertTriangle className="size-4 text-amber-400" aria-hidden="true" />;
  return <XCircle className="size-4 text-rose-400" aria-hidden="true" />;
}

export function BidBasisPanel({
  projectId,
  bidBasis,
  documents,
}: {
  projectId: string;
  bidBasis: HeliosBidBasisProfile;
  documents: HeliosDocumentSummary[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState<string>();
  const [profile, setProfile] = useState<HeliosBidBasisProfileType>(bidBasis.profile);
  const [profileReason, setProfileReason] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [documentCategory, setDocumentCategory] = useState<HeliosBidBasisCategory>("plans");
  const [documentReason, setDocumentReason] = useState("");
  const keyCategories = bidBasis.categories.filter((category) =>
    ["plans", "specifications", "written_scope", "owner_bid_schedule", "proposal_bid_forms"].includes(category.category),
  );
  const activeDocumentIds = useMemo(
    () => new Set(bidBasis.categories.flatMap((category) => category.documentIds)),
    [bidBasis.categories],
  );
  const activeDocuments = documents.filter((document) => activeDocumentIds.has(document.id));

  async function save(input: HeliosBidBasisReviewInput, success: string) {
    setSaving(input.action + (input.category || input.documentId || ""));
    try {
      const response = await fetch(`/api/projects/${projectId}/bid-basis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Bid-basis decision could not be saved.");
      toast(success, "success");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Bid-basis decision could not be saved.", "error");
    } finally {
      setSaving(undefined);
    }
  }

  const canProceed = bidBasis.workspaceState !== "no_usable_scope_basis";
  return (
    <>
      <Card className="border-orange-500/25 bg-card/80 py-0">
        <CardContent className="p-4">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="size-5 text-orange-300" aria-hidden="true" />
                <h2 className="font-semibold">Bid basis · Revision {bidBasis.packageRevision}</h2>
                <Badge variant="outline">{bidBasisProfileLabel(bidBasis.profile)}</Badge>
                <Badge variant={stateVariant(bidBasis.workspaceState)} className="capitalize">
                  {label(bidBasis.workspaceState)}
                </Badge>
                <Badge variant="secondary" className="capitalize">{bidBasis.classificationStatus}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {keyCategories.map((category) => (
                  <span key={category.category} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/45 px-2.5 py-1 text-xs">
                    <span className="font-medium">{bidBasisCategoryLabel(category.category)}</span>
                    <Badge variant={stateVariant(category.state)} className="h-5 capitalize">{label(category.state)}</Badge>
                    {category.fileCount > 0 && <span className="text-muted-foreground">{category.fileCount}</span>}
                  </span>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                {bidBasis.capabilities.map((capability) => (
                  <div key={capability.capability} className="flex min-w-0 items-start gap-2 rounded-md border border-border/80 bg-background/35 p-2.5">
                    <CapabilityIcon state={capability.state} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold capitalize">{label(capability.capability)}</div>
                      <div className="mt-0.5 text-[11px] capitalize text-muted-foreground">{capability.state}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" onClick={() => setReviewOpen(true)}>
                <Pencil aria-hidden="true" />Review basis
              </Button>
              {!bidBasis.proceededAt ? (
                <Button
                  disabled={!canProceed || saving === "proceed"}
                  onClick={() => void save({ action: "proceed" }, "Available bid basis confirmed. Estimate access is open for this revision.")}
                >
                  <ArrowRight aria-hidden="true" />Proceed with available basis
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/projects/${projectId}/estimate`}>
                    Open estimate workspace<ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
          {!canProceed && (
            <div className="mt-3 rounded-md border border-rose-500/35 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
              No usable scope basis is registered. Add plans, specifications, or a written scope; unrelated forms alone cannot establish bid scope.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review bid basis</DialogTitle>
            <DialogDescription>
              Confirm what was actually issued. Missing categories limit only dependent capabilities and never fabricate quantities.
            </DialogDescription>
          </DialogHeader>

          <section className="rounded-lg border border-border p-4">
            <h3 className="font-semibold">Profile correction</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(220px,0.5fr)_1fr_auto] md:items-end">
              <Select value={profile} onValueChange={(value) => setProfile(value as HeliosBidBasisProfileType)}>
                <SelectTrigger aria-label="Bid-basis profile"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HELIOS_BID_BASIS_PROFILES.map((value) => (
                    <SelectItem key={value} value={value}>{bidBasisProfileLabel(value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={profileReason} onChange={(event) => setProfileReason(event.target.value)} placeholder="Why is the inferred profile incorrect?" />
              <Button
                variant="outline"
                disabled={!profileReason.trim() || saving === "correct_profile"}
                onClick={() => void save({ action: "correct_profile", profile, reason: profileReason }, "Bid-basis profile corrected.")}
              >Save correction</Button>
            </div>
          </section>

          <section className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-semibold">Issued-document categories</h3>
              <p className="mt-1 text-xs text-muted-foreground">Use one-click decisions when a category was not issued or does not apply.</p>
            </div>
            <div className="divide-y divide-border">
              {bidBasis.categories.map((category) => (
                <div key={category.category} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(180px,0.5fr)_minmax(220px,1fr)_auto] lg:items-center">
                  <div>
                    <div className="font-medium">{bidBasisCategoryLabel(category.category)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {category.fileCount} source{category.fileCount === 1 ? "" : "s"} · {category.indexedPageCount ? `indexed through PDF page ${category.indexedPageCount}` : "page count not established"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={stateVariant(category.state)} className="capitalize">{label(category.state)}</Badge>
                    <Badge variant="outline" className="capitalize">{label(category.processingState)}</Badge>
                    {category.exceptions.map((exception) => <span key={exception} className="text-xs text-amber-200">{exception}</span>)}
                  </div>
                  <div className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
                    {category.fileCount === 0 && category.state !== "not_issued" && (
                      <Button size="sm" variant="outline" disabled={Boolean(saving)} onClick={() => void save({ action: "set_category_state", category: category.category, state: "not_issued", reason: "Estimator confirmed this category was not issued for the current revision." }, `${bidBasisCategoryLabel(category.category)} marked not issued.`)}>Not issued</Button>
                    )}
                    {category.fileCount === 0 && category.state !== "not_applicable" && (
                      <Button size="sm" variant="ghost" disabled={Boolean(saving)} onClick={() => void save({ action: "set_category_state", category: category.category, state: "not_applicable", reason: "Estimator confirmed this category does not apply to the current bid basis." }, `${bidBasisCategoryLabel(category.category)} marked not applicable.`)}>N/A</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {activeDocuments.length > 0 && (
            <section className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2"><FileSearch className="size-4 text-orange-300" aria-hidden="true" /><h3 className="font-semibold">Correct a document classification</h3></div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Select value={documentId} onValueChange={setDocumentId}>
                  <SelectTrigger aria-label="Document"><SelectValue placeholder="Select document" /></SelectTrigger>
                  <SelectContent>{activeDocuments.map((document) => <SelectItem key={document.id} value={document.id}>{document.relativePath || document.fileName}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={documentCategory} onValueChange={(value) => setDocumentCategory(value as HeliosBidBasisCategory)}>
                  <SelectTrigger aria-label="Document category"><SelectValue /></SelectTrigger>
                  <SelectContent>{HELIOS_BID_BASIS_CATEGORIES.filter((category) => category !== "written_scope").map((category) => <SelectItem key={category} value={category}>{bidBasisCategoryLabel(category)}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="md:col-span-2" value={documentReason} onChange={(event) => setDocumentReason(event.target.value)} placeholder="Reason for reclassification" />
              </div>
              <Button className="mt-3" variant="outline" disabled={!documentId || !documentReason.trim() || saving === `classify_document${documentId}`} onClick={() => void save({ action: "classify_document", documentId, category: documentCategory, reason: documentReason }, "Document classification corrected.")}>Save document classification</Button>
            </section>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
