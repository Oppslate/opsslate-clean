"use client";

import type { HeliosEuclidCockpitAlignmentDetail, HeliosEuclidCrossSectionResult, HeliosEuclidStationOffsetPosition } from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Calculator, Layers3, LoaderCircle, MapPin } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { humanizeStatus } from "@/lib/format";

function parseDisplayedStation(input: string) {
  const normalized = input.trim().replace(/,/g, "");
  const station = normalized.match(/^(-?)(\d+)\s*\+\s*(\d+(?:\.\d+)?)$/);
  if (station) {
    const value = Number(station[2]) * 100 + Number(station[3]);
    return station[1] === "-" ? -value : value;
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function optionalNumber(input: string) {
  if (!input.trim()) return undefined;
  const value = Number(input.replace(/,/g, ""));
  return Number.isFinite(value) ? value : Number.NaN;
}

function coordinate(value: number | undefined) {
  return value === undefined ? "Not established" : value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function EuclidStationEvaluator({ projectId, detail }: { projectId: string; detail: HeliosEuclidCockpitAlignmentDetail }) {
  const [station, setStation] = useState("");
  const [offset, setOffset] = useState("0");
  const [pointElevation, setPointElevation] = useState("");
  const [verticalOffset, setVerticalOffset] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HeliosEuclidStationOffsetPosition>();
  const [sectionPending, setSectionPending] = useState(false);
  const [sectionResult, setSectionResult] = useState<HeliosEuclidCrossSectionResult>();

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayedStation = parseDisplayedStation(station);
    if (displayedStation === undefined) {
      setError("Enter a station such as 145+25.00.");
      return;
    }
    const parsedOffset = optionalNumber(offset);
    const parsedPointElevation = optionalNumber(pointElevation);
    const parsedVerticalOffset = optionalNumber(verticalOffset);
    if (parsedOffset === undefined || Number.isNaN(parsedOffset)) {
      setError("Enter a finite offset. Use positive for right and negative for left.");
      return;
    }
    if (Number.isNaN(parsedPointElevation) || Number.isNaN(parsedVerticalOffset)) {
      setError("Optional elevation values must be finite numbers.");
      return;
    }
    if (parsedPointElevation !== undefined && parsedVerticalOffset !== undefined) {
      setError("Use either point elevation or vertical delta, not both.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/euclid/station-offsets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alignmentId: detail.summary.id,
          displayedStation,
          offset: parsedOffset,
          pointElevation: parsedPointElevation,
          verticalOffset: parsedVerticalOffset,
        }),
      });
      const payload = await response.json() as { data?: HeliosEuclidStationOffsetPosition; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Station-offset point could not be evaluated.");
      setResult(payload.data);
    } catch (reason) {
      setResult(undefined);
      setError(reason instanceof Error ? reason.message : "Station-offset point could not be evaluated.");
    } finally {
      setPending(false);
    }
  }

  async function buildSection() {
    const displayedStation = parseDisplayedStation(station);
    if (displayedStation === undefined) {
      setError("Enter a station such as 145+25.00.");
      return;
    }
    setSectionPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/euclid/cross-sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alignmentId: detail.summary.id,
          displayedStation,
          profileRole: "proposed_finished_grade",
        }),
      });
      const payload = await response.json() as { data?: HeliosEuclidCrossSectionResult; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Cross section could not be built.");
      setSectionResult(payload.data);
    } catch (reason) {
      setSectionResult(undefined);
      setError(reason instanceof Error ? reason.message : "Cross section could not be built.");
    } finally {
      setSectionPending(false);
    }
  }

  return (
    <section aria-label="Alignment station-offset evaluator" className="border-b border-border bg-orange-500/[.035] px-3 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-[180px] lg:w-[24%]">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-orange-300"><Calculator className="size-3.5" aria-hidden="true" />3D station-offset check</div>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Compute a point normal to the alignment. Positive offsets are right; negative offsets are left.</p>
        </div>
        <form onSubmit={evaluate} className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_.7fr_.8fr_.8fr_auto]">
          <Field id="euclid-station" label="Station"><Input id="euclid-station" value={station} onChange={(event) => setStation(event.target.value)} placeholder="145+25.00" inputMode="decimal" autoComplete="off" /></Field>
          <Field id="euclid-offset" label="Offset (+R / −L)"><Input id="euclid-offset" value={offset} onChange={(event) => setOffset(event.target.value)} placeholder="0.00" inputMode="decimal" autoComplete="off" /></Field>
          <Field id="euclid-point-elevation" label="Point elev. (optional)"><Input id="euclid-point-elevation" value={pointElevation} onChange={(event) => setPointElevation(event.target.value)} placeholder="Explicit" inputMode="decimal" autoComplete="off" /></Field>
          <Field id="euclid-vertical-offset" label="Vertical Δ (optional)"><Input id="euclid-vertical-offset" value={verticalOffset} onChange={(event) => setVerticalOffset(event.target.value)} placeholder="From profile" inputMode="decimal" autoComplete="off" /></Field>
          <div className="flex self-end gap-2 xl:flex-col 2xl:flex-row">
            <Button type="submit" size="sm" disabled={pending || sectionPending || !station.trim()}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <MapPin aria-hidden="true" />}{pending ? "Computing" : "Compute 3D point"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={buildSection} disabled={pending || sectionPending || !station.trim()}>{sectionPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Layers3 aria-hidden="true" />}{sectionPending ? "Building" : "Build section"}</Button>
          </div>
        </form>
      </div>
      {error && <p role="alert" className="mt-2 text-[10px] text-danger-foreground">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg border border-border bg-background/45 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-mono text-xs font-semibold">Station {result.printedStation} · {Math.abs(result.offset).toLocaleString()} {result.side}</div><Badge variant="outline" className={result.status === "verified" ? "border-success/35 bg-success/10 text-success-foreground" : result.status === "unavailable" ? "border-danger/40 bg-danger/10 text-danger-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground"}>{humanizeStatus(result.status)}</Badge></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Northing" value={coordinate(result.horizontal?.northing)} /><Metric label="Easting" value={coordinate(result.horizontal?.easting)} /><Metric label="Point elevation" value={coordinate(result.elevation?.elevation)} /><Metric label="Tangent azimuth" value={result.horizontal ? `${coordinate(result.horizontal.azimuthDegrees)}°` : "Not established"} /></div>
          {result.referenceProfiles.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{result.referenceProfiles.map((profile) => <div key={profile.profileId} className="rounded-md border border-border bg-card/35 px-2.5 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Reference · {humanizeStatus(profile.profileRole)}</div><div className="mt-0.5 font-mono text-xs font-semibold">Centerline elev. {coordinate(profile.elevation)}{profile.gradePercent !== undefined ? ` · ${profile.gradePercent.toFixed(3)}%` : ""}</div><div className="mt-0.5 truncate text-[9px] text-muted-foreground">{profile.profileName} · {humanizeStatus(profile.controlType)}</div></div>)}</div>}
          {result.limitations.length > 0 && <p className="mt-2 text-[9px] leading-4 text-warning-foreground">{result.limitations.join(" ")}</p>}
        </div>
      )}
      {sectionResult && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background/45">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <div>
              <div className="font-mono text-xs font-semibold">Roadway section at {sectionResult.printedStation}</div>
              <div className="mt-0.5 text-[9px] text-muted-foreground">{sectionResult.controllingTemplate ? `${sectionResult.controllingTemplate.name} · ${sectionResult.controllingTemplate.stationStart}–${sectionResult.controllingTemplate.stationEnd}` : "No controlling typical section"}</div>
            </div>
            <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[9px]">{sectionResult.points.length} points</Badge><Badge variant="outline" className={sectionResult.status === "verified" ? "border-success/35 bg-success/10 text-success-foreground" : sectionResult.status === "unavailable" ? "border-danger/40 bg-danger/10 text-danger-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground"}>{humanizeStatus(sectionResult.status)}</Badge></div>
          </div>
          {sectionResult.points.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-[10px]"><thead className="bg-muted/20 text-muted-foreground"><tr><th className="px-3 py-2">Control</th><th className="px-3 py-2 text-right">Offset</th><th className="px-3 py-2 text-right">Northing</th><th className="px-3 py-2 text-right">Easting</th><th className="px-3 py-2 text-right">Elevation</th><th className="px-3 py-2">Surface</th></tr></thead><tbody className="divide-y divide-border">{sectionResult.points.map((point) => <tr key={point.id}><td className="px-3 py-2"><div className="font-semibold">{humanizeStatus(point.role)}</div><div className="text-[9px] text-muted-foreground">{humanizeStatus(point.origin)}</div></td><td className="px-3 py-2 text-right font-mono">{point.offset.toFixed(3)}</td><td className="px-3 py-2 text-right font-mono">{coordinate(point.northing)}</td><td className="px-3 py-2 text-right font-mono">{coordinate(point.easting)}</td><td className="px-3 py-2 text-right font-mono">{coordinate(point.elevation)}</td><td className="px-3 py-2 capitalize">{humanizeStatus(point.surface)}</td></tr>)}</tbody></table></div>}
          <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">
            <Metric label="Surface readiness" value={sectionResult.canBuildSurface ? "3D section established" : "More governed points required"} />
            <Metric label="Material controls" value={`${sectionResult.materialBands.length} active layer${sectionResult.materialBands.length === 1 ? "" : "s"}`} />
          </div>
          {sectionResult.unresolvedControls.length > 0 && <ul className="border-t border-warning/25 bg-warning/5 px-3 py-2 text-[9px] leading-4 text-warning-foreground">{sectionResult.unresolvedControls.map((control) => <li key={control}>• {control}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="min-w-0"><label htmlFor={id} className="mb-1 block text-[9px] uppercase tracking-wider text-muted-foreground">{label}</label>{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-0.5 font-mono text-xs font-semibold">{value}</div></div>;
}
