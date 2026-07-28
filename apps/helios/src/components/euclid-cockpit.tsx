"use client";

import type {
  HeliosEuclidCockpitAlignmentDetail,
  HeliosEuclidCockpitValue,
  HeliosEuclidCockpitWorkspace,
  HeliosEuclidReadinessStatus,
  HeliosEuclidReviewState,
} from "@opsslate/helios-domain";
import {
  HELIOS_EUCLID_REVIEW_VERSION,
  heliosEuclidCorrectableFields,
  type HeliosEuclidReviewAction,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@opsslate/suite-ui/dialog";
import { Input } from "@opsslate/suite-ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@opsslate/suite-ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@opsslate/suite-ui/tabs";
import { Textarea } from "@opsslate/suite-ui/textarea";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Check,
  Clock3,
  CircleDot,
  DraftingCompass,
  FileSearch,
  GitBranch,
  Layers3,
  MapPinned,
  Pencil,
  Ruler,
  ShieldCheck,
  TriangleAlert,
  Waypoints,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { formatTimestamp, humanizeStatus } from "@/lib/format";

function stateClass(value: string) {
  if (["ready", "passed", "accepted", "corrected", "complete"].includes(value)) {
    return "border-success/35 bg-success/10 text-success-foreground";
  }
  if (["blocked", "failed", "conflicted", "rejected", "incomplete"].includes(value)) {
    return "border-danger/40 bg-danger/10 text-danger-foreground";
  }
  if (["review", "proposed", "complete_with_limitations", "partially_accepted"].includes(value)) {
    return "border-warning/40 bg-warning/10 text-warning-foreground";
  }
  return "border-border bg-muted/25 text-muted-foreground";
}

function StateBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={`text-[9px] capitalize ${stateClass(value)}`}>
      {humanizeStatus(value)}
    </Badge>
  );
}

function number(value: number | undefined, digits = 2) {
  if (value === undefined) return "Not established";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function engineeringValue<T extends number | string>(
  row: HeliosEuclidCockpitValue<T> | undefined,
  suffix = "",
) {
  if (!row) return "Not established";
  if (row.printedValue) return row.printedValue;
  return `${typeof row.value === "number" ? number(row.value, 4) : row.value}${suffix}`;
}

function readinessIcon(status: HeliosEuclidReadinessStatus) {
  if (status === "ready") return <CheckCircle2 className="size-4 text-success-foreground" aria-hidden="true" />;
  if (status === "blocked") return <TriangleAlert className="size-4 text-danger-foreground" aria-hidden="true" />;
  if (status === "review") return <AlertTriangle className="size-4 text-warning-foreground" aria-hidden="true" />;
  return <CircleDot className="size-4 text-muted-foreground" aria-hidden="true" />;
}

function ReviewState({ value }: { value: HeliosEuclidReviewState }) {
  return <StateBadge value={value} />;
}

function EmptyWorkspace({ workspace }: { workspace: HeliosEuclidCockpitWorkspace }) {
  const failed = workspace.availability === "failed";
  return (
    <div className="space-y-4">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="outline" className="mb-2 border-orange-500/35 text-orange-300">
            <DraftingCompass aria-hidden="true" /> Euclid Model
          </Badge>
          <h1 className="text-3xl font-bold leading-9">{workspace.project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Civil Geometry cockpit</p>
        </div>
        <Button asChild variant="outline"><Link href={`/projects/${workspace.project.id}`}><ArrowLeft aria-hidden="true" />Project cockpit</Link></Button>
      </header>
      <section className={`flex min-h-[460px] flex-col items-center justify-center rounded-xl border bg-card/55 px-6 text-center ${failed ? "border-danger/45" : "border-border"}`}>
        {failed ? <TriangleAlert className="mb-4 size-12 text-danger-foreground" aria-hidden="true" /> : <DraftingCompass className="mb-4 size-12 text-orange-300" aria-hidden="true" />}
        <h2 className="text-xl font-semibold">{failed ? "Euclid model needs attention" : "Engineering model is not ready yet"}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{workspace.message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild><Link href={`/projects/${workspace.project.id}`}>Review project processing</Link></Button>
          <Button asChild variant="outline"><Link href={`/projects/${workspace.project.id}/ask`}>Ask Helios</Link></Button>
        </div>
      </section>
    </div>
  );
}

function AlignmentList({ workspace }: { workspace: HeliosEuclidCockpitWorkspace }) {
  return (
    <aside aria-label="Euclid alignments" className="flex min-h-0 flex-col border-b border-border xl:border-b-0 xl:border-r">
      <div className="shrink-0 border-b border-border px-3 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-info-foreground">Alignment inventory</div>
        <div className="mt-1 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{workspace.alignments.length} alignments</h2><Badge variant="outline" className="text-[9px]">Revision {workspace.model?.packageRevision}</Badge></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {workspace.alignments.map((alignment) => {
            const selected = workspace.selectedAlignment?.summary.id === alignment.id;
            return (
              <Link
                key={alignment.id}
                href={`/projects/${workspace.project.id}/civil-geometry?alignment=${encodeURIComponent(alignment.id)}`}
                aria-current={selected ? "page" : undefined}
                className={`block rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-orange-500/60 bg-orange-500/8" : "border-border bg-background/35 hover:bg-muted/25"}`}
              >
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-semibold">{alignment.name}</div><div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{humanizeStatus(alignment.type)}</div></div><StateBadge value={alignment.horizontalStatus} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div><div className="text-muted-foreground">Station range</div><div className="mt-0.5 font-mono text-foreground">{alignment.startStation} – {alignment.endStation}</div></div><div><div className="text-muted-foreground">Controls</div><div className="mt-0.5 font-mono text-foreground">{alignment.controlPointCount} points · {alignment.horizontalElementCount} elements</div></div></div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5"><StateBadge value={alignment.reviewState} /><StateBadge value={alignment.completeness} />{alignment.issueCount > 0 && <Badge variant="outline" className="border-warning/40 bg-warning/10 text-[9px] text-warning-foreground">{alignment.issueCount} issues</Badge>}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function HorizontalControl({ detail }: { detail: HeliosEuclidCockpitAlignmentDetail }) {
  return (
    <div className="space-y-4">
      <section>
        <SectionHeader title="Coordinate control" count={detail.controlPoints.length} />
        {detail.controlPoints.length ? <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[690px] text-left text-[10px]"><thead className="bg-muted/25 text-muted-foreground"><tr><th className="px-3 py-2">Point</th><th className="px-3 py-2">Station</th><th className="px-3 py-2 text-right">Northing</th><th className="px-3 py-2 text-right">Easting</th><th className="px-3 py-2 text-right">Elevation</th><th className="px-3 py-2">State</th></tr></thead><tbody className="divide-y divide-border">{detail.controlPoints.map((row) => <tr key={row.id} className="bg-background/25"><td className="px-3 py-2"><div className="font-semibold text-foreground">{row.name}</div><div className="uppercase text-muted-foreground">{humanizeStatus(row.pointType)}</div></td><td className="px-3 py-2 font-mono">{row.station}</td><td className="px-3 py-2 text-right font-mono">{engineeringValue(row.northing)}</td><td className="px-3 py-2 text-right font-mono">{engineeringValue(row.easting)}</td><td className="px-3 py-2 text-right font-mono">{engineeringValue(row.elevation)}</td><td className="px-3 py-2"><ReviewState value={row.reviewState} /></td></tr>)}</tbody></table></div> : <InlineEmpty text="No coordinate control points are stored for this alignment." />}
      </section>
      <section>
        <SectionHeader title="Horizontal element chain" count={detail.horizontalElements.length} />
        {detail.horizontalElements.length ? <div className="space-y-2">{detail.horizontalElements.map((row) => <article key={row.id} className="grid gap-3 rounded-lg border border-border bg-background/25 p-3 text-[10px] sm:grid-cols-[44px_minmax(0,1fr)_repeat(3,minmax(90px,.45fr))_auto] sm:items-center"><div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/20 font-mono text-muted-foreground">{row.sequence}</div><div><div className="font-semibold text-foreground">{humanizeStatus(row.elementType)}</div><div className="mt-0.5 font-mono text-muted-foreground">{row.startStation} → {row.endStation}</div></div><Metric label="Length" value={engineeringValue(row.length)} /><Metric label="Bearing / rotation" value={row.bearing ? engineeringValue(row.bearing) : row.rotation ? humanizeStatus(row.rotation) : "—"} /><Metric label="Radius / delta" value={row.radius ? `${engineeringValue(row.radius)} / ${engineeringValue(row.deltaDegrees)}°` : "—"} /><ReviewState value={row.reviewState} /></article>)}</div> : <InlineEmpty text="No horizontal elements are stored for this alignment." />}
      </section>
      {detail.stationEquations.length > 0 && <section><SectionHeader title="Station equations" count={detail.stationEquations.length} /><div className="space-y-2">{detail.stationEquations.map((row) => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/25 p-3 text-xs"><div><div className="font-mono font-semibold">{row.printedEquation}</div><div className="mt-1 text-[10px] text-muted-foreground">Continuous chainage {number(row.physicalChainage.value)}</div></div><ReviewState value={row.reviewState} /></article>)}</div></section>}
    </div>
  );
}

function VerticalControl({ detail }: { detail: HeliosEuclidCockpitAlignmentDetail }) {
  if (!detail.profiles.length) return <InlineEmpty text="No vertical profile is stored for this alignment." />;
  return <div className="space-y-4">{detail.profiles.map((profile) => <section key={profile.id} className="overflow-hidden rounded-lg border border-border bg-background/20"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3"><div><div className="text-sm font-semibold">{profile.name}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{humanizeStatus(profile.role)} · {profile.startStation} – {profile.endStation}{profile.verticalDatum ? ` · ${profile.verticalDatum}` : ""}</div></div><div className="flex gap-1.5"><ReviewState value={profile.reviewState} /><StateBadge value={profile.completeness} /></div></header><div className="grid gap-4 p-3 lg:grid-cols-2"><div><SectionHeader title="Profile elevations" count={profile.points.length} />{profile.points.length ? <div className="space-y-1.5">{profile.points.map((point) => <div key={point.id} className="grid grid-cols-[minmax(0,1fr)_90px_120px] items-center gap-2 rounded-md border border-border bg-card/35 px-2.5 py-2 text-[10px]"><div className="font-semibold capitalize">{humanizeStatus(point.pointType)}</div><div className="text-right font-mono text-muted-foreground">{point.station}</div><div className="text-right font-mono">{engineeringValue(point.elevation)}</div></div>)}</div> : <InlineEmpty text="No profile points." />}</div><div className="space-y-4"><div><SectionHeader title="Tangents" count={profile.tangents.length} />{profile.tangents.length ? <div className="space-y-1.5">{profile.tangents.map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/35 px-2.5 py-2 text-[10px]"><span>Tangent {row.sequence}</span><span className="font-mono font-semibold">{engineeringValue(row.gradePercent, "%")}</span></div>)}</div> : <InlineEmpty text="No vertical tangents." />}</div><div><SectionHeader title="Vertical curves" count={profile.curves.length} />{profile.curves.length ? <div className="space-y-1.5">{profile.curves.map((row) => <div key={row.id} className="rounded-md border border-border bg-card/35 p-2.5 text-[10px]"><div className="flex items-center justify-between gap-2"><span className="font-semibold capitalize">{humanizeStatus(row.curveType)} curve {row.sequence}</span><ReviewState value={row.reviewState} /></div><div className="mt-2 grid grid-cols-3 gap-2"><Metric label="Length" value={engineeringValue(row.length)} /><Metric label="Grades" value={`${engineeringValue(row.incomingGradePercent, "%")} → ${engineeringValue(row.outgoingGradePercent, "%")}`} /><Metric label="K" value={engineeringValue(row.kValue)} /></div></div>)}</div> : <InlineEmpty text="No vertical curves." />}</div></div></div></section>)}</div>;
}

function SectionsAndMaterials({ detail }: { detail: HeliosEuclidCockpitAlignmentDetail }) {
  return <div className="space-y-4"><section><SectionHeader title="Typical sections" count={detail.typicalSections.length} />{detail.typicalSections.length ? <div className="grid gap-2 lg:grid-cols-2">{detail.typicalSections.map((row) => <article key={row.id} className="rounded-lg border border-border bg-background/25 p-3 text-[10px]"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-semibold">{row.name}</div><div className="mt-0.5 font-mono text-muted-foreground">{row.stationStart.printedStation} – {row.stationEnd.printedStation}</div></div><ReviewState value={row.reviewState} /></div><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Left lane / slope" value={`${row.laneWidthLeft ? engineeringValue({ ...row.laneWidthLeft, provenanceIds: row.laneWidthLeft.provenanceIds }) : "—"} / ${row.crossSlopeLeftPercent ? engineeringValue({ ...row.crossSlopeLeftPercent, provenanceIds: row.crossSlopeLeftPercent.provenanceIds }, "%") : "—"}`} /><Metric label="Right lane / slope" value={`${row.laneWidthRight ? engineeringValue({ ...row.laneWidthRight, provenanceIds: row.laneWidthRight.provenanceIds }) : "—"} / ${row.crossSlopeRightPercent ? engineeringValue({ ...row.crossSlopeRightPercent, provenanceIds: row.crossSlopeRightPercent.provenanceIds }, "%") : "—"}`} /></div></article>)}</div> : <InlineEmpty text="No typical section controls are stored." />}</section><section><SectionHeader title="Cross-section coverage" count={detail.crossSectionPointCount} /><div className="grid gap-2 sm:grid-cols-2"><SummaryTile label="Station slices" value={detail.crossSectionStationCount} /><SummaryTile label="Stored section points" value={detail.crossSectionPointCount} /></div></section><section><SectionHeader title="Material layers" count={detail.materialLayers.length} />{detail.materialLayers.length ? <div className="space-y-2">{detail.materialLayers.map((row) => <article key={row.id} className="grid gap-3 rounded-lg border border-border bg-background/25 p-3 text-[10px] sm:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(90px,.45fr))_auto] sm:items-center"><div><div className="text-xs font-semibold">{row.name}</div><div className="mt-0.5 font-mono text-muted-foreground">{row.stationStart.printedStation} – {row.stationEnd.printedStation}</div></div><Metric label="Left offset" value={row.offsetLeft ? engineeringValue({ ...row.offsetLeft, provenanceIds: row.offsetLeft.provenanceIds }) : "—"} /><Metric label="Right offset" value={row.offsetRight ? engineeringValue({ ...row.offsetRight, provenanceIds: row.offsetRight.provenanceIds }) : "—"} /><Metric label="Thickness" value={`${engineeringValue({ ...row.thickness, provenanceIds: row.thickness.provenanceIds })} ${humanizeStatus(row.thicknessUnit)}`} /><ReviewState value={row.reviewState} /></article>)}</div> : <InlineEmpty text="No material layer controls are stored." />}</section></div>;
}

function StructuresAndInverts({ detail }: { detail: HeliosEuclidCockpitAlignmentDetail }) {
  return <div className="space-y-4"><section><SectionHeader title="Structures" count={detail.structures.length} />{detail.structures.length ? <div className="grid gap-2 lg:grid-cols-2">{detail.structures.map((row) => <article key={row.id} className="rounded-lg border border-border bg-background/25 p-3 text-[10px]"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-semibold">{row.printedName}</div><div className="mt-0.5 uppercase tracking-wider text-muted-foreground">{humanizeStatus(row.structureType)}</div></div><ReviewState value={row.reviewState} /></div><div className="mt-3 grid grid-cols-2 gap-2"><Metric label="Station" value={row.station?.printedStation || "Not established"} /><Metric label="Offset" value={row.offset ? `${number(row.offset.value)} ${humanizeStatus(detail.spatialReference?.horizontalUnit || "unknown")}` : "Not established"} /><Metric label="Dimensions" value={[row.length?.value, row.width?.value, row.height?.value].filter((candidate) => candidate !== undefined).map((candidate) => number(candidate)).join(" × ") || "Not established"} /><Metric label="Skew" value={row.skewDegrees ? `${number(row.skewDegrees.value)}°` : "Not established"} /></div></article>)}</div> : <InlineEmpty text="No structures are attached to this alignment." />}</section><section><SectionHeader title="Inverts and drainage controls" count={detail.inverts.length} />{detail.inverts.length ? <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[620px] text-left text-[10px]"><thead className="bg-muted/25 text-muted-foreground"><tr><th className="px-3 py-2">Station</th><th className="px-3 py-2 text-right">Offset</th><th className="px-3 py-2 text-right">Invert</th><th className="px-3 py-2">Pipe</th><th className="px-3 py-2 text-right">Slope</th><th className="px-3 py-2">State</th></tr></thead><tbody className="divide-y divide-border">{detail.inverts.map((row) => <tr key={row.id}><td className="px-3 py-2 font-mono">{row.station.printedStation}</td><td className="px-3 py-2 text-right font-mono">{row.offset ? number(row.offset.value) : "—"}</td><td className="px-3 py-2 text-right font-mono">{number(row.invertElevation.value)}</td><td className="px-3 py-2">{row.pipeSize?.value || "Size not set"}{row.pipeMaterial?.value ? ` · ${row.pipeMaterial.value}` : ""}</td><td className="px-3 py-2 text-right font-mono">{row.pipeSlopePercent ? `${number(row.pipeSlopePercent.value)}%` : "—"}</td><td className="px-3 py-2"><ReviewState value={row.reviewState} /></td></tr>)}</tbody></table></div> : <InlineEmpty text="No invert controls are stored for this alignment." />}</section></div>;
}

function EngineeringWorkspace({ detail }: { detail: HeliosEuclidCockpitAlignmentDetail }) {
  return <main className="flex min-h-0 flex-col"><header className="shrink-0 border-b border-border px-3 py-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-info-foreground">Selected engineering basis</div><h2 className="mt-1 text-base font-semibold">{detail.summary.name}</h2><div className="mt-1 text-[10px] text-muted-foreground">{detail.summary.startStation} – {detail.summary.endStation} · Sheets {detail.summary.sourceSheetNumbers.join(", ") || "not established"}</div></div><div className="flex flex-wrap gap-1.5"><StateBadge value={detail.summary.horizontalStatus} /><StateBadge value={detail.summary.profileStatus} /><StateBadge value={detail.summary.corridorStatus} /></div></div></header><Tabs defaultValue="horizontal" className="flex min-h-0 flex-1 flex-col gap-0"><TabsList className="h-auto w-full shrink-0 justify-start overflow-x-auto rounded-none border-b border-border bg-muted/10 px-2 py-1"><TabsTrigger value="horizontal" className="px-2 text-[10px]"><Waypoints aria-hidden="true" />Horizontal</TabsTrigger><TabsTrigger value="vertical" className="px-2 text-[10px]"><GitBranch aria-hidden="true" />Vertical</TabsTrigger><TabsTrigger value="sections" className="px-2 text-[10px]"><Layers3 aria-hidden="true" />Sections</TabsTrigger><TabsTrigger value="structures" className="px-2 text-[10px]"><MapPinned aria-hidden="true" />Structures</TabsTrigger></TabsList><TabsContent value="horizontal" className="min-h-0 flex-1 overflow-y-auto p-3"><HorizontalControl detail={detail} /></TabsContent><TabsContent value="vertical" className="min-h-0 flex-1 overflow-y-auto p-3"><VerticalControl detail={detail} /></TabsContent><TabsContent value="sections" className="min-h-0 flex-1 overflow-y-auto p-3"><SectionsAndMaterials detail={detail} /></TabsContent><TabsContent value="structures" className="min-h-0 flex-1 overflow-y-auto p-3"><StructuresAndInverts detail={detail} /></TabsContent></Tabs></main>;
}

function IntelligenceRail({ projectId, detail }: { projectId: string; detail: HeliosEuclidCockpitAlignmentDetail }) {
  return <aside aria-label="Euclid readiness and evidence" className="flex min-h-0 flex-col border-t border-border xl:border-l xl:border-t-0"><Tabs defaultValue="readiness" className="flex min-h-0 flex-1 flex-col gap-0"><TabsList className="h-auto w-full shrink-0 justify-start rounded-none border-b border-border bg-muted/10 px-2 py-1"><TabsTrigger value="readiness" className="px-2 text-[10px]"><ShieldCheck aria-hidden="true" />Readiness</TabsTrigger><TabsTrigger value="evidence" className="px-2 text-[10px]"><FileSearch aria-hidden="true" />Evidence</TabsTrigger><TabsTrigger value="issues" className="px-2 text-[10px]"><TriangleAlert aria-hidden="true" />Issues</TabsTrigger></TabsList><TabsContent value="readiness" className="min-h-0 flex-1 overflow-y-auto p-3"><div className="space-y-2">{detail.readiness.length ? detail.readiness.map((row) => <article key={row.id} className="rounded-lg border border-border bg-background/30 p-3"><div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2">{readinessIcon(row.status)}<h3 className="truncate text-xs font-semibold capitalize">{humanizeStatus(row.capability)}</h3></div><StateBadge value={row.status} /></div><p className="mt-2 text-[10px] leading-4 text-muted-foreground">{row.method}</p>{row.reasons.length > 0 && <ul className="mt-2 space-y-1 border-l-2 border-border pl-2 text-[10px] leading-4 text-muted-foreground">{row.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}<div className="mt-2 text-[9px] text-muted-foreground">{row.inputEntityIds.length} controlling records · {row.provenanceIds.length} citations</div></article>) : <InlineEmpty text="Quantity readiness is waiting for the integrated engineering graph." />}</div></TabsContent><TabsContent value="evidence" className="min-h-0 flex-1 overflow-y-auto p-3"><div className="space-y-2">{detail.evidence.length ? detail.evidence.map((row) => <article key={row.id} className="rounded-lg border border-border bg-background/30 p-3 text-[10px]"><div className="flex items-start justify-between gap-2"><div><div className="font-semibold text-foreground">{row.sheetNumber ? `Sheet ${row.sheetNumber}` : `PDF page ${row.physicalPageNumber}`}</div><div className="mt-0.5 text-muted-foreground">{row.locator}</div></div><Badge variant="outline" className="text-[9px]">{row.confidence}%</Badge></div><div className="mt-2 text-[9px] uppercase tracking-wider text-info-foreground">{humanizeStatus(row.authority)}</div>{row.documentId && <Button asChild size="sm" variant="outline" className="mt-3"><Link href={`/projects/${projectId}/documents/${row.documentId}/content#page=${row.physicalPageNumber}`} target="_blank"><ArrowUpRight aria-hidden="true" />Open source</Link></Button>}</article>) : <InlineEmpty text="No source citations are attached to this alignment." />}</div></TabsContent><TabsContent value="issues" className="min-h-0 flex-1 overflow-y-auto p-3"><div className="space-y-2">{detail.issues.map((row) => <article key={row.id} className={`rounded-lg border p-3 ${row.severity === "blocking" ? "border-danger/40 bg-danger/8" : row.severity === "warning" ? "border-warning/40 bg-warning/8" : "border-border bg-background/30"}`}><div className="flex items-center justify-between gap-2"><Badge variant="outline" className={`text-[9px] ${stateClass(row.severity === "blocking" ? "blocked" : row.severity === "warning" ? "review" : "not_available")}`}>{row.severity}</Badge><span className="text-[9px] capitalize text-muted-foreground">{humanizeStatus(row.status)}</span></div><h3 className="mt-2 text-xs font-semibold">{humanizeStatus(row.code)}</h3><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{row.message}</p></article>)}{detail.checks.filter((row) => row.status !== "pass").map((row) => <article key={row.id} className={`rounded-lg border p-3 ${row.status === "block" ? "border-danger/40 bg-danger/8" : "border-warning/40 bg-warning/8"}`}><div className="flex items-center justify-between gap-2"><Badge variant="outline" className={`text-[9px] ${stateClass(row.status === "block" ? "blocked" : "review")}`}>{row.status}</Badge><span className="text-[9px] text-muted-foreground">Engineering check</span></div><h3 className="mt-2 text-xs font-semibold">{humanizeStatus(row.code)}</h3><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{row.message}</p></article>)}{detail.issues.length === 0 && detail.checks.every((row) => row.status === "pass") && <InlineEmpty text="No open issues or non-passing checks affect this alignment." />}</div></TabsContent></Tabs></aside>;
}

function correctionValueType(field: string) {
  return /name|printed|bearing|rotation|unit|material|size|direction|datum/i.test(field) ? "string" as const : "number" as const;
}

function EntityReviewControls({ workspace, target }: {
  workspace: HeliosEuclidCockpitWorkspace;
  target: HeliosEuclidCockpitAlignmentDetail["reviewTargets"][number];
}) {
  const router = useRouter();
  const fields = heliosEuclidCorrectableFields(target.entityType);
  const [open, setOpen] = useState(false);
  const [field, setField] = useState(fields[0] || "");
  const [correctionValue, setCorrectionValue] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const current = workspace.review.currentDecisions.find((row) => row.targetEntityType === target.entityType && row.targetEntityId === target.entityId);
  const targetFingerprint = workspace.review.targetFingerprints[`${target.entityType}:${target.entityId}`];

  async function submit(action: HeliosEuclidReviewAction) {
    if (!workspace.model || !targetFingerprint) return;
    setPending(true);
    setError("");
    try {
      const valueType = correctionValueType(field);
      const response = await fetch(`/api/projects/${workspace.project.id}/euclid/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: HELIOS_EUCLID_REVIEW_VERSION,
          requestId: crypto.randomUUID(),
          action,
          euclidModelId: workspace.model.id,
          modelFingerprint: workspace.model.modelFingerprint,
          sourceFingerprint: workspace.model.sourceFingerprint,
          targetEntityType: target.entityType,
          targetEntityId: target.entityId,
          targetFingerprint,
          reason: reason || undefined,
          changes: action === "correct" ? [{ field, valueType, ...(valueType === "number" ? { numberValue: Number(correctionValue) } : { stringValue: correctionValue }) }] : undefined,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Review decision could not be saved.");
      setOpen(false);
      setReason("");
      setCorrectionValue("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review decision could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <div className="flex shrink-0 items-center gap-1.5">
      {current && <StateBadge value={current.action === "accept" ? "accepted" : current.action === "correct" ? "corrected" : current.action === "reject" ? "rejected" : "review"} />}
      <Button size="sm" variant={current?.action === "accept" ? "outline" : "default"} className="h-7 px-2 text-[10px]" disabled={pending || current?.action === "accept" || !targetFingerprint} onClick={() => submit("accept")}>
        <Check aria-hidden="true" />{current?.action === "accept" ? "Accepted" : "Accept"}
      </Button>
      <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={pending || !targetFingerprint} onClick={() => setOpen(true)}><Pencil aria-hidden="true" />Review</Button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Review {target.label}</DialogTitle><DialogDescription>{target.context}. The source geometry stays immutable; this records a governed estimator decision.</DialogDescription></DialogHeader>
        {current && <div className="rounded-lg border border-border bg-muted/15 p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-semibold">Current decision</span><StateBadge value={current.action} /></div><div className="mt-1 text-muted-foreground">{current.reviewerName} · {formatTimestamp(current.createdAt)}</div>{current.reason && <p className="mt-2 text-muted-foreground">{current.reason}</p>}</div>}
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold" htmlFor={`review-field-${target.entityId}`}>Field to correct</label><Select value={field} onValueChange={setField}><SelectTrigger id={`review-field-${target.entityId}`}><SelectValue placeholder="Select field" /></SelectTrigger><SelectContent>{fields.map((value) => <SelectItem key={value} value={value}>{humanizeStatus(value.replaceAll(".", " "))}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="mb-1 block text-xs font-semibold" htmlFor={`review-value-${target.entityId}`}>Corrected value</label><Input id={`review-value-${target.entityId}`} value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} inputMode={correctionValueType(field) === "number" ? "decimal" : "text"} placeholder="Enter the verified value" /></div>
          <div><label className="mb-1 block text-xs font-semibold" htmlFor={`review-reason-${target.entityId}`}>Reason and source check</label><Textarea id={`review-reason-${target.entityId}`} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={2_000} placeholder="State what was checked and why this decision is required." /></div>
          {error && <p role="alert" className="text-xs text-danger-foreground">{error}</p>}
        </div>
        <DialogFooter className="flex-wrap sm:justify-between">
          <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={pending || !reason.trim()} onClick={() => submit("defer")}><Clock3 aria-hidden="true" />Defer</Button><Button type="button" size="sm" variant="destructive" disabled={pending || !reason.trim()} onClick={() => submit("reject")}><XCircle aria-hidden="true" />Reject</Button></div>
          <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" size="sm" disabled={pending || !reason.trim() || !field || !correctionValue.trim()} onClick={() => submit("correct")}><Pencil aria-hidden="true" />Record correction</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function GovernedIntelligenceRail({ projectId, detail, workspace }: { projectId: string; detail: HeliosEuclidCockpitAlignmentDetail; workspace: HeliosEuclidCockpitWorkspace }) {
  return <div className="flex min-h-0 flex-col border-t border-border xl:border-t-0">
    <section aria-label="Governed Euclid review" className="max-h-[46%] shrink-0 overflow-y-auto border-b border-border p-3">
      <div className="mb-3 rounded-lg border border-orange-500/25 bg-orange-500/5 p-3"><div className="text-xs font-semibold">Governed estimator review</div><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Accept trusted controls in one click. Corrections, deferrals, and rejections require a reason and remain separate from the immutable source model.</p><div className="mt-2 flex flex-wrap gap-1.5"><Badge variant="outline">{workspace.review.accepted} accepted</Badge><Badge variant="outline">{workspace.review.corrected} corrected</Badge><Badge variant="outline">{workspace.review.deferred} deferred</Badge><Badge variant="outline">{workspace.review.rejected} rejected</Badge></div></div>
      <div className="space-y-2">{detail.reviewTargets.map((target) => <article key={`${target.entityType}:${target.entityId}`} className="rounded-lg border border-border bg-background/30 p-3"><div className="min-w-0"><div className="text-[9px] uppercase tracking-wider text-info-foreground">{humanizeStatus(target.entityType)}</div><h3 className="mt-0.5 truncate text-xs font-semibold">{target.label}</h3><p className="mt-1 truncate text-[10px] text-muted-foreground">{target.context}</p></div><div className="mt-2"><EntityReviewControls workspace={workspace} target={target} /></div></article>)}</div>
    </section>
    <IntelligenceRail projectId={projectId} detail={detail} />
  </div>;
}

function SectionHeader({ title, count }: { title: string; count: number }) { return <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-[10px] font-semibold uppercase tracking-[.14em] text-info-foreground">{title}</h3><Badge variant="outline" className="text-[9px]">{count}</Badge></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-0.5 break-words font-mono text-[10px] font-semibold text-foreground">{value}</div></div>; }
function SummaryTile({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-border bg-background/25 p-3"><div className="text-2xl font-semibold">{value.toLocaleString()}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>; }
function InlineEmpty({ text }: { text: string }) { return <div className="rounded-lg border border-dashed border-border p-5 text-center text-[10px] text-muted-foreground">{text}</div>; }

export function EuclidCockpit({ workspace }: { workspace: HeliosEuclidCockpitWorkspace }) {
  if (!workspace.selectedAlignment || workspace.availability === "failed") return <EmptyWorkspace workspace={workspace} />;
  const { selectedAlignment } = workspace;
  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-orange-500/30 bg-card/55">
        <div className="flex flex-col justify-between gap-4 px-4 py-3 lg:flex-row lg:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-orange-500/35 text-orange-300"><DraftingCompass aria-hidden="true" />Euclid Model</Badge><StateBadge value={workspace.solution?.status || workspace.availability} /><Badge variant="outline">Governed review</Badge></div><h1 className="mt-2 truncate text-2xl font-bold leading-8">{workspace.project.name}</h1><p className="mt-0.5 text-xs text-muted-foreground">{workspace.project.projectNumber || "No project number"}{workspace.project.location ? ` · ${workspace.project.location}` : ""}</p></div>
          <div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href={`/projects/${workspace.project.id}`}><ArrowLeft aria-hidden="true" />Project cockpit</Link></Button><Button asChild size="sm" variant="outline"><Link href={`/projects/${workspace.project.id}/ask`}>Ask Helios</Link></Button></div>
        </div>
        <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-5"><HeaderMetric icon={<Waypoints />} label="Alignments" value={workspace.alignments.length} /><HeaderMetric icon={<GitBranch />} label="Graph" value={`${workspace.solution?.nodeCount || 0} nodes · ${workspace.solution?.edgeCount || 0} edges`} /><HeaderMetric icon={<CheckCircle2 />} label="Quantity ready" value={workspace.solution?.readyCount || 0} /><HeaderMetric icon={<AlertTriangle />} label="Review / blocked" value={`${workspace.solution?.reviewCount || 0} / ${workspace.solution?.blockedCount || 0}`} /><HeaderMetric icon={<Ruler />} label="Last validated" value={workspace.solution?.completedAt ? formatTimestamp(workspace.solution.completedAt) : workspace.model?.updatedAt ? formatTimestamp(workspace.model.updatedAt) : "Pending"} /></div>
      </header>
      <section className="grid min-h-0 overflow-hidden rounded-xl border border-border bg-card/45 xl:h-[calc(100vh-290px)] xl:min-h-[610px] xl:grid-cols-[280px_minmax(0,1.55fr)_minmax(300px,.8fr)]">
        <AlignmentList workspace={workspace} />
        <EngineeringWorkspace detail={selectedAlignment} />
        <GovernedIntelligenceRail projectId={workspace.project.id} detail={selectedAlignment} workspace={workspace} />
      </section>
      <footer className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-card/45 px-4 py-3 text-[10px] text-muted-foreground sm:flex-row sm:items-center"><span>Review decisions are append-only overlays. Helios does not change source geometry or publish estimate quantities.</span><span className="shrink-0 font-mono">Model revision {workspace.model?.packageRevision} · Stage 4G</span></footer>
    </div>
  );
}

function HeaderMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) { return <div className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:border-l sm:first:border-l-0 lg:border-t-0"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20 text-info-foreground">{icon}</span><div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground">{label}</div><div className="mt-0.5 truncate text-xs font-semibold text-foreground">{value}</div></div></div>; }
