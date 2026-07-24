"use client";

import type {
  HeliosIntelligenceCategory,
  HeliosProjectIntelligence,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@opsslate/suite-ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@opsslate/suite-ui/tabs";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  AlertTriangle,
  Bot,
  FileSearch,
  Info,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatTimestamp } from "@/lib/format";
import { StatusBadge } from "./status-badge";

const categoryLabels: Record<HeliosIntelligenceCategory, string> = {
  project_metadata: "Project metadata",
  contract_requirements: "Contract requirements",
  required_forms: "Required forms",
  addenda: "Addenda",
  drawing_index: "Drawing index",
  specification_sections: "Specification sections",
  bid_items: "Bid items",
  allowances: "Allowances",
  alternates: "Alternates",
  unit_price_items: "Unit-price items",
  known_risks: "Known risks",
  missing_information: "Missing information",
  required_subcontractors: "Required subcontractors",
  required_suppliers: "Required suppliers",
};

function confidenceLabel(value: number) {
  if (value >= 85) return "High confidence";
  if (value >= 65) return "Medium confidence";
  return "Low confidence";
}

function CitationList({
  evidenceIds,
  intelligence,
}: {
  evidenceIds: string[];
  intelligence: HeliosProjectIntelligence;
}) {
  const evidenceById = new Map(
    intelligence.evidence.map((evidence) => [evidence.id, evidence]),
  );
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {evidenceIds.map((evidenceId) => {
        const evidence = evidenceById.get(evidenceId);
        if (!evidence) return null;
        const page = evidence.pageNumber
          ? `PDF page ${evidence.pageNumber}`
          : "Page not identified";
        return (
          <Badge
            key={evidenceId}
            variant="outline"
            title={`${evidence.documentName} · ${page} · ${evidence.excerpt}`}
            className="max-w-full border-orange-500/30 text-orange-200"
          >
            <FileSearch aria-hidden="true" />
            <span className="truncate">
              {evidence.documentName} · {page}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}

export function ProjectIntelligencePanel({
  projectId,
  status,
  intelligence,
}: {
  projectId: string;
  status: string;
  intelligence?: HeliosProjectIntelligence;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [retrying, setRetrying] = useState(false);

  async function retryProject() {
    setRetrying(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/intelligence/retry`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Project intelligence retry failed.");
      }
      toast("Project intelligence was queued again.", "success");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Retry failed.",
        "error",
      );
    } finally {
      setRetrying(false);
    }
  }

  if (!intelligence) {
    const processing = ["queued", "processing"].includes(status);
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-4 text-orange-300" aria-hidden="true" />
                Project intelligence
              </CardTitle>
              <CardDescription>
                Evidence-backed project understanding from the registered bid
                documents.
              </CardDescription>
            </div>
            <StatusBadge value={status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            {processing ? (
              <>
                <div
                  className="mb-3 size-8 animate-spin rounded-full border-2 border-muted border-t-orange-400"
                  aria-hidden="true"
                />
                <p className="font-medium">Reading project documents</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Helios is building cited project intelligence. This page
                  refreshes while processing continues.
                </p>
              </>
            ) : status === "failed" ? (
              <>
                <AlertTriangle
                  className="mb-3 size-9 text-red-300"
                  aria-hidden="true"
                />
                <p className="font-medium">Project synthesis needs attention</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Document evidence remains protected and can be synthesized
                  again.
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  disabled={retrying}
                  onClick={() => void retryProject()}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {retrying ? "Retrying…" : "Retry synthesis"}
                </Button>
              </>
            ) : (
              <>
                <FileSearch
                  className="mb-3 size-9 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="font-medium">Intelligence will appear here</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Add the bid documents to begin evidence-backed analysis.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const grouped = new Map<
    HeliosIntelligenceCategory,
    HeliosProjectIntelligence["findings"]
  >();
  for (const finding of intelligence.findings) {
    const existing = grouped.get(finding.category) || [];
    grouped.set(finding.category, [...existing, finding]);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-orange-500/35 text-orange-200"
              >
                <Bot aria-hidden="true" />
                AI-generated
              </Badge>
              <Badge variant="secondary">
                {confidenceLabel(intelligence.confidence)} ·{" "}
                {intelligence.confidence}%
              </Badge>
            </div>
            <CardTitle>Project intelligence</CardTitle>
            <CardDescription>
              Generated {formatTimestamp(intelligence.generatedAt)} · Human
              review required before downstream use.
            </CardDescription>
          </div>
          <StatusBadge value={status} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="max-w-full overflow-x-auto" variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="findings">
              Findings ({intelligence.findings.length})
            </TabsTrigger>
            <TabsTrigger value="evidence">
              Evidence ({intelligence.evidence.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-4">
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-orange-300"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm leading-6">{intelligence.summary}</p>
                  <CitationList
                    evidenceIds={intelligence.summaryEvidenceIds}
                    intelligence={intelligence}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Project type", intelligence.projectType],
                ["Funding source", intelligence.fundingSource],
              ].map(([label, item]) => {
                const value = item as HeliosProjectIntelligence["projectType"];
                return (
                  <div
                    key={label as string}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {label as string}
                    </div>
                    <div className="mt-1 font-medium">
                      {value.value || "Not established"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {value.confidence}% confidence
                    </div>
                    {value.evidenceIds.length > 0 && (
                      <CitationList
                        evidenceIds={value.evidenceIds}
                        intelligence={intelligence}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="findings" className="pt-4">
            {intelligence.findings.length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                No evidence-backed findings were returned.
              </div>
            ) : (
              <div className="space-y-5">
                {Array.from(grouped.entries()).map(([category, findings]) => (
                  <section key={category}>
                    <h3 className="mb-2 text-sm font-semibold">
                      {categoryLabels[category]}
                    </h3>
                    <div className="space-y-2">
                      {findings.map((finding) => (
                        <article
                          key={finding.id}
                          className="rounded-lg border border-border p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              {finding.severity === "critical" ||
                              finding.severity === "warning" ? (
                                <AlertTriangle
                                  className={`mt-0.5 size-4 shrink-0 ${
                                    finding.severity === "critical"
                                      ? "text-red-300"
                                      : "text-amber-300"
                                  }`}
                                  aria-hidden="true"
                                />
                              ) : (
                                <Info
                                  className="mt-0.5 size-4 shrink-0 text-blue-300"
                                  aria-hidden="true"
                                />
                              )}
                              <div>
                                <h4 className="text-sm font-medium">
                                  {finding.title}
                                </h4>
                                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                  {finding.detail}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {finding.confidence}%
                            </Badge>
                          </div>
                          <CitationList
                            evidenceIds={finding.evidenceIds}
                            intelligence={intelligence}
                          />
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="evidence" className="pt-4">
            <div className="space-y-2">
              {intelligence.evidence.map((evidence) => (
                <article
                  key={evidence.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">
                      {evidence.documentName}
                    </div>
                    <Badge variant="outline">
                      {evidence.pageNumber
                        ? `PDF page ${evidence.pageNumber}`
                        : "Page not identified"}
                    </Badge>
                  </div>
                  {evidence.locator && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {evidence.locator}
                    </div>
                  )}
                  <blockquote className="mt-2 border-l-2 border-orange-500/40 pl-3 text-sm leading-5 text-muted-foreground">
                    “{evidence.excerpt}”
                  </blockquote>
                </article>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
