"use client";

import type { HeliosEuclidCockpitAlignmentDetail, HeliosEuclidSurfaceAssemblyResult } from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Layers3, LoaderCircle, Network, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { humanizeStatus } from "@/lib/format";

function statusClass(status: string) {
  if (status === "verified") return "border-success/35 bg-success/10 text-success-foreground";
  if (status === "preliminary") return "border-warning/40 bg-warning/10 text-warning-foreground";
  return "border-danger/40 bg-danger/10 text-danger-foreground";
}

function station(value: number | undefined) {
  if (value === undefined) return "Not established";
  const major = Math.floor(value / 100);
  const minor = value - major * 100;
  return `${major}+${minor.toFixed(2).padStart(5, "0")}`;
}

export function EuclidSurfaceAssembler({ projectId, detail }: { projectId: string; detail: HeliosEuclidCockpitAlignmentDetail }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HeliosEuclidSurfaceAssemblyResult>();

  async function assemble() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/euclid/surfaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alignmentId: detail.summary.id }),
      });
      const payload = await response.json() as { data?: HeliosEuclidSurfaceAssemblyResult; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Governed surfaces could not be assembled.");
      setResult(payload.data);
    } catch (reason) {
      setResult(undefined);
      setError(reason instanceof Error ? reason.message : "Governed surfaces could not be assembled.");
    } finally {
      setPending(false);
    }
  }

  if (!result) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-border bg-background/25 px-5 text-center">
        <Network className="mb-3 size-10 text-orange-300" aria-hidden="true" />
        <h3 className="text-base font-semibold">Governed surface assembly</h3>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">Build longitudinal existing, proposed, subgrade, and excavation-limit surfaces from the current canonical alignment, profile, section, and material controls.</p>
        <p className="mt-2 max-w-2xl text-[10px] leading-4 text-muted-foreground">Helios identifies missing or incompatible station bands instead of bridging them. This review does not create estimate quantities.</p>
        <Button type="button" className="mt-4" onClick={assemble} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
          {pending ? "Assembling surfaces" : "Assemble surfaces"}
        </Button>
        {error && <p role="alert" className="mt-3 text-xs text-danger-foreground">{error}</p>}
      </section>
    );
  }

  const visibleGaps = result.surfaces.flatMap((surface) => surface.gaps).slice(0, 8);
  const totalGaps = result.surfaces.reduce((sum, surface) => sum + surface.gaps.length, 0);

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border bg-background/25 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Governed surface assembly</h3>
              <Badge variant="outline" className={`text-[9px] ${statusClass(result.status)}`}>{humanizeStatus(result.status)}</Badge>
              <Badge variant="outline" className={`text-[9px] ${result.canCompareSurfaces ? "border-success/35 bg-success/10 text-success-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground"}`}>{result.canCompareSurfaces ? "Comparison ready" : "Comparison not ready"}</Badge>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{result.sampling.sectionCount} governed station slices · {result.sampling.effectiveInterval.toLocaleString()} {result.horizontalUnit} maximum regular interval</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={assemble} disabled={pending}>{pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}Reassemble</Button>
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-2">
        {result.surfaces.map((surface) => (
          <article key={surface.surface} className="rounded-lg border border-border bg-background/25 p-3">
            <div className="flex items-start justify-between gap-2">
              <div><h4 className="text-xs font-semibold capitalize">{humanizeStatus(surface.surface)} surface</h4><p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{station(surface.stationStart)} – {station(surface.stationEnd)}</p></div>
              <Badge variant="outline" className={`text-[9px] ${statusClass(surface.status)}`}>{humanizeStatus(surface.status)}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-[9px]">
              <div><dt className="text-muted-foreground">Sections</dt><dd className="mt-0.5 font-mono text-xs font-semibold">{surface.sectionCount}</dd></div>
              <div><dt className="text-muted-foreground">Points</dt><dd className="mt-0.5 font-mono text-xs font-semibold">{surface.pointCount}</dd></div>
              <div><dt className="text-muted-foreground">Panels</dt><dd className="mt-0.5 font-mono text-xs font-semibold">{surface.panelCount}</dd></div>
              <div><dt className="text-muted-foreground">Gaps</dt><dd className={`mt-0.5 font-mono text-xs font-semibold ${surface.gaps.length ? "text-warning-foreground" : "text-success-foreground"}`}>{surface.gaps.length}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      {(totalGaps > 0 || result.unresolvedControls.length > 0) && (
        <section className="rounded-xl border border-warning/35 bg-warning/8 p-3">
          <div className="flex items-center gap-2"><TriangleAlert className="size-4 text-warning-foreground" aria-hidden="true" /><h3 className="text-xs font-semibold">Engineering controls requiring review</h3></div>
          {visibleGaps.length > 0 && <div className="mt-3 space-y-1.5">{visibleGaps.map((gap) => <div key={gap.id} className="rounded-md border border-border bg-background/30 px-2.5 py-2 text-[10px]"><div className="font-semibold capitalize">{humanizeStatus(gap.surface)} · {gap.printedStationStart} – {gap.printedStationEnd}</div><div className="mt-0.5 text-muted-foreground">{gap.message}</div></div>)}</div>}
          {totalGaps > visibleGaps.length && <p className="mt-2 text-[10px] text-muted-foreground">{totalGaps - visibleGaps.length} additional gaps are retained in the governed result.</p>}
          {result.unresolvedControls.length > 0 && <ul className="mt-3 space-y-1 border-l-2 border-warning/40 pl-2 text-[10px] leading-4 text-muted-foreground">{result.unresolvedControls.slice(0, 8).map((control) => <li key={control}>{control}</li>)}</ul>}
        </section>
      )}

      <section className="rounded-lg border border-border bg-muted/10 p-3 text-[10px] leading-4 text-muted-foreground">
        <div className="font-semibold text-foreground">Engineering boundary</div>
        <ul className="mt-1 space-y-1">{result.limitations.map((limitation) => <li key={limitation}>• {limitation}</li>)}</ul>
        <div className="mt-2 font-mono text-[9px]">Solver {result.solver} · Fingerprint {result.fingerprint}</div>
      </section>
    </div>
  );
}
