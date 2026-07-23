"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@opsslate/suite-ui/card";

interface BarChartProps {
  title: string;
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  format?: (v: number) => string;
}

export function BarChart({ title, data, maxValue, format }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const fmt = format ?? ((v) => `$${v.toLocaleString()}`);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 truncate text-right">{d.label}</span>
              <div className="flex-1 h-6 bg-secondary/50 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                  style={{
                    width: `${Math.max(2, (d.value / max) * 100)}%`,
                    backgroundColor: d.color ?? "#4ea8ff",
                  }}
                >
                  <span className="text-[10px] font-medium text-white whitespace-nowrap">
                    {fmt(d.value)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DonutChartProps {
  title: string;
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ title, segments, centerLabel, centerValue }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;

  // Build conic gradient
  const gradientParts: string[] = [];
  for (const seg of segments) {
    const start = (cumulative / total) * 360;
    cumulative += seg.value;
    const end = (cumulative / total) * 360;
    gradientParts.push(`${seg.color} ${start}deg ${end}deg`);
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="relative w-28 h-28 flex-shrink-0">
          <div
            className="w-full h-full rounded-full"
            style={{ background: total > 0 ? `conic-gradient(${gradientParts.join(", ")})` : "#1c2a3a" }}
          />
          <div className="absolute inset-3 bg-card rounded-full flex flex-col items-center justify-center">
            <span className="text-lg font-bold">{centerValue ?? total}</span>
            <span className="text-[10px] text-muted-foreground">{centerLabel ?? "total"}</span>
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground truncate">{s.label}</span>
              <span className="ml-auto font-medium">{s.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

export function MiniTrend({ label, value, change, positive }: MiniStatProps) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
            {positive ? "↑" : "↓"} {change}
          </span>
        )}
      </div>
    </div>
  );
}
