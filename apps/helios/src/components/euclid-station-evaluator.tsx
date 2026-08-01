"use client";

import type { HeliosEuclidAlignmentPosition, HeliosEuclidCockpitAlignmentDetail } from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Calculator, LoaderCircle, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";

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

function coordinate(value: number | undefined) {
  return value === undefined ? "Not established" : value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function EuclidStationEvaluator({ projectId, detail }: { projectId: string; detail: HeliosEuclidCockpitAlignmentDetail }) {
  const [station, setStation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HeliosEuclidAlignmentPosition>();

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayedStation = parseDisplayedStation(station);
    if (displayedStation === undefined) {
      setError("Enter a station such as 145+25.00.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/euclid/stations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alignmentId: detail.summary.id, displayedStation }),
      });
      const payload = await response.json() as { data?: HeliosEuclidAlignmentPosition; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Station could not be evaluated.");
      setResult(payload.data);
    } catch (reason) {
      setResult(undefined);
      setError(reason instanceof Error ? reason.message : "Station could not be evaluated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Alignment position evaluator" className="border-b border-border bg-orange-500/[.035] px-3 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-[180px] lg:w-[29%]">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-orange-300"><Calculator className="size-3.5" aria-hidden="true" />3D station check</div>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Compute this alignment&apos;s coordinates and all controlled profile elevations.</p>
        </div>
        <form onSubmit={evaluate} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <label htmlFor="euclid-station" className="sr-only">Displayed station</label>
            <Input id="euclid-station" value={station} onChange={(event) => setStation(event.target.value)} placeholder="Station 145+25.00" inputMode="decimal" autoComplete="off" />
          </div>
          <Button type="submit" size="sm" disabled={pending || !station.trim()}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <MapPin aria-hidden="true" />}{pending ? "Computing" : "Compute position"}</Button>
        </form>
      </div>
      {error && <p role="alert" className="mt-2 text-[10px] text-danger-foreground">{error}</p>}
      {result && (
        <div className="mt-3 rounded-lg border border-border bg-background/45 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-mono text-xs font-semibold">Station {result.printedStation}</div><Badge variant="outline" className={result.status === "verified" ? "border-success/35 bg-success/10 text-success-foreground" : result.status === "unavailable" ? "border-danger/40 bg-danger/10 text-danger-foreground" : "border-warning/40 bg-warning/10 text-warning-foreground"}>{humanizeStatus(result.status)}</Badge></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label="Northing" value={coordinate(result.horizontal?.northing)} /><Metric label="Easting" value={coordinate(result.horizontal?.easting)} /><Metric label="Tangent azimuth" value={result.horizontal ? `${coordinate(result.horizontal.azimuthDegrees)}°` : "Not established"} /></div>
          {result.profiles.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{result.profiles.map((profile) => <div key={profile.profileId} className="rounded-md border border-border bg-card/35 px-2.5 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{humanizeStatus(profile.profileRole)}</div><div className="mt-0.5 font-mono text-xs font-semibold">Elev. {coordinate(profile.elevation)}{profile.gradePercent !== undefined ? ` · ${profile.gradePercent.toFixed(3)}%` : ""}</div><div className="mt-0.5 truncate text-[9px] text-muted-foreground">{profile.profileName} · {humanizeStatus(profile.controlType)}</div></div>)}</div>}
          {result.limitations.length > 0 && <p className="mt-2 text-[9px] leading-4 text-warning-foreground">{result.limitations.join(" ")}</p>}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-0.5 font-mono text-xs font-semibold">{value}</div></div>;
}
