"use client";

import type {
  HeliosEstimateWorkspace,
  HeliosProjectDetail,
  HeliosTakeoffWorkspace,
} from "@opsslate/helios-domain";
import type { HeliosPrincipal } from "@/lib/helios-principal";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Bot, ChevronDown, DraftingCompass } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { HeliosShell } from "./helios-shell";
import { EstimateCockpit2 } from "./estimate-cockpit-2";
import { ProjectDocumentControl } from "./project-document-control";
import { ProjectIntelligenceCockpit } from "./project-intelligence-cockpit";
import { ProjectIntelligencePanel } from "./project-intelligence-panel";
import { BidBasisPanel } from "./bid-basis-panel";
import { PlanIntelligencePanel } from "./plan-intelligence-panel";
import { QuantityIntelligencePanel } from "./quantity-intelligence-panel";

export function ProjectIntake({
  detail,
  principal,
  workspace,
  takeoff,
}: {
  detail: HeliosProjectDetail;
  principal: HeliosPrincipal;
  workspace: HeliosEstimateWorkspace | null;
  takeoff: HeliosTakeoffWorkspace | null;
}) {
  const router = useRouter();
  const { project } = detail;
  const processing =
    ["queued", "processing"].includes(project.intelligenceStatus) ||
    detail.packages.some((bidPackage) =>
      ["ready_for_analysis", "processing"].includes(bidPackage.status),
    ) ||
    detail.documents.some((document) =>
      [
        "ready_for_intelligence",
        "queued",
        "uploading_to_openai",
        "analyzing",
      ].includes(document.status),
    ) || Boolean(detail.planSet && ["queued", "processing"].includes(detail.planSet.status)) ||
    Boolean(takeoff?.geometry && ["queued", "processing"].includes(takeoff.geometry.status));

  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => router.refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [processing, router]);

  return (
    <HeliosShell
      principal={principal}
      topActions={
        <div className="flex items-center gap-2">
          {!workspace && <Badge variant="secondary">Foundation 3D.1</Badge>}
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects/${project.id}/civil-geometry`}><DraftingCompass aria-hidden="true" />Civil Geometry</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects/${project.id}/ask`}><Bot aria-hidden="true" />Ask Helios</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {detail.bidBasis && (
          <>
            <BidBasisPanel
              projectId={project.id}
              bidBasis={detail.bidBasis}
              documents={detail.documents}
            />
            <PlanIntelligencePanel
              projectId={project.id}
              bidBasis={detail.bidBasis}
              planSet={detail.planSet}
            />
            <QuantityIntelligencePanel
              projectId={project.id}
              planSet={detail.planSet}
              workspace={takeoff}
            />
          </>
        )}
        {detail.intelligence && workspace ? (
          <EstimateCockpit2
            project={project}
            status={project.intelligenceStatus}
            intelligence={detail.intelligence}
            workspace={workspace}
            latestError={detail.latestIntelligenceError}
          />
        ) : detail.intelligence ? (
          <ProjectIntelligenceCockpit
            project={project}
            status={project.intelligenceStatus}
            intelligence={detail.intelligence}
            latestError={detail.latestIntelligenceError}
          />
        ) : (
          <div className="space-y-5">
            <header>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-bold leading-9">
                  {project.name}
                </h1>
                <Badge variant="outline">{project.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Add and finalize the bid package to build the evidence cockpit.
              </p>
            </header>
            <ProjectDocumentControl detail={detail} />
            <ProjectIntelligencePanel
              projectId={project.id}
              status={project.intelligenceStatus}
              intelligence={detail.intelligence}
              latestError={detail.latestIntelligenceError}
            />
          </div>
        )}

        {detail.intelligence && (
          <details className="group overflow-hidden rounded-xl border border-border bg-card/45">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span>Bid package and project document control</span>
              <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                {detail.documents.length} documents
                <ChevronDown
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <div className="border-t border-border p-4">
              <ProjectDocumentControl detail={detail} />
            </div>
          </details>
        )}
      </div>
    </HeliosShell>
  );
}
