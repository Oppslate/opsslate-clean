
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

interface ForecastDay {
  date: string; high: number; low: number; precipInches: number; precipProb: number;
  windMax: number; gustMax: number; condition: string; icon: string; weatherCode: number;
  fieldStatus: string;
  alerts: Array<{ type: string; severity: string; message: string; recommendation: string; affectedWork: string[] }>;
}

function statusBg(status: string) {
  if (status === "red") return "bg-red-500/10 border-red-500/40";
  if (status === "yellow") return "bg-yellow-500/10 border-yellow-500/40";
  return "bg-green-500/10 border-green-500/40";
}

function statusLabel(status: string) {
  if (status === "red") return { text: "🔴 STOP / CALL OFF", color: "text-red-400" };
  if (status === "yellow") return { text: "🟡 CAUTION", color: "text-yellow-400" };
  return { text: "🟢 ALL CLEAR", color: "text-green-400" };
}

function dayName(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (dateStr === today.toISOString().slice(0, 10)) return "Today";
  if (dateStr === tomorrow.toISOString().slice(0, 10)) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function WeatherContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const analyzeWeather = useAction(api.weather.analyzeWeather as any);
  const sendCallOff = useAction(api.weather.sendCrewCallOff as any);
  const { toast } = useToast();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<{lat: string; lon: string; display: string}[]>([]);

  const updateProject = useMutation(api.projects.update);
  const selectedProj = (projects ?? []).find((p) => p._id === selectedProject);

  const geocodeAddress = async (address: string) => {
    setGeocoding(true);
    setGeocodeResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`, {
        headers: { "User-Agent": "OpsSlate/1.0" }
      });
      const data = await res.json();
      if (data.length === 0) {
        toast("No results found. Try a more specific address.", "error");
      } else {
        setGeocodeResults(data.map((r: any) => ({ lat: r.lat, lon: r.lon, display: r.display_name })));
      }
    } catch (e) {
      toast("Geocoding failed: " + (e as Error).message, "error");
    }
    setGeocoding(false);
  };

  const selectGeoResult = async (lat: string, lon: string) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    setManualLat(lat);
    setManualLon(lon);
    setGeocodeResults([]);
    // Auto-save to project if selected
    if (selectedProject) {
      try {
        await updateProject({ id: selectedProject as Id<"projects">, latitude: latNum, longitude: lonNum });
        toast("📍 Coordinates saved to project!", "success");
      } catch (e) { /* ignore if update fails */ }
    }
    // Auto-fetch weather
    fetchWeather(latNum, lonNum);
  };

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const result = await analyzeWeather({ latitude: lat, longitude: lon }) as any;
      setForecast(result.forecast);
      // Auto-expand first day with alerts
      const alertDay = result.forecast.find((d: ForecastDay) => d.alerts.length > 0);
      if (alertDay) setExpandedDay(alertDay.date);
    } catch (e) {
      toast("Failed to fetch weather: " + (e as Error).message, "error");
    }
    setLoading(false);
  };

  const handleFetchProject = () => {
    if (selectedProj?.latitude && selectedProj?.longitude) {
      fetchWeather(selectedProj.latitude, selectedProj.longitude);
    } else if (manualLat && manualLon) {
      fetchWeather(Number(manualLat), Number(manualLon));
    } else {
      toast("Project needs coordinates. Enter latitude/longitude below.", "error");
    }
  };

  const handleCallOff = async (day: ForecastDay, alert: ForecastDay["alerts"][0]) => {
    if (!selectedProject) return;
    setSending(day.date + alert.type);
    try {
      const result = await sendCallOff({
        projectId: selectedProject as Id<"projects">,
        date: day.date,
        reason: alert.message,
        recommendation: alert.recommendation,
        affectedWork: alert.affectedWork,
      }) as any;
      toast(`Crew call-off emails sent to ${result.sent} crew member(s)`, "success");
    } catch (e) {
      toast("Error: " + (e as Error).message, "error");
    }
    setSending(null);
  };

  // Count alerts
  const totalAlerts = forecast?.reduce((s, d) => s + d.alerts.length, 0) ?? 0;
  const criticalDays = forecast?.filter((d) => d.fieldStatus === "red").length ?? 0;
  const clearDays = forecast?.filter((d) => d.fieldStatus === "green").length ?? 0;

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">⛅ Weather Intelligence</h1>
          <p className="text-muted-foreground text-sm">10-day forecast with field work recommendations and crew notifications</p>
        </div>
      </div>

      {/* Project selector */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold block mb-1">Select Project</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setForecast(null); }}>
                <option value="">Choose a project...</option>
                {(projects ?? []).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.latitude ? `(${p.latitude}, ${p.longitude})` : "(no coordinates)"}
                  </option>
                ))}
              </select>
            </div>
            {selectedProj && !selectedProj.latitude && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Latitude</label>
                  <Input className="w-32" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="42.8864" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Longitude</label>
                  <Input className="w-32" value={manualLon} onChange={(e) => setManualLon(e.target.value)} placeholder="-78.8784" />
                </div>
              </>
            )}
            <Button onClick={handleFetchProject} disabled={loading || !selectedProject}>
              {loading ? "Loading..." : "🔍 Get Forecast"}
            </Button>
          </div>
          {selectedProj && !selectedProj.latitude && (
            <div className="mt-3 bg-secondary/30 rounded-lg p-3">
              <label className="text-sm font-semibold block mb-2">📍 Look Up Coordinates by Address</label>
              <div className="flex gap-2 mb-2">
                <Input
                  className="flex-1"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  placeholder="Enter project address... e.g. 123 Main St, Buffalo, NY"
                  onKeyDown={(e) => { if (e.key === "Enter" && addressSearch.trim()) geocodeAddress(addressSearch); }}
                />
                <Button variant="outline" disabled={geocoding || !addressSearch.trim()} onClick={() => geocodeAddress(addressSearch)}>
                  {geocoding ? "Searching..." : "🔍 Look Up"}
                </Button>
              </div>
              {selectedProj.address && !addressSearch && (
                <Button size="sm" variant="outline" className="mb-2" onClick={() => { setAddressSearch(selectedProj.address!); geocodeAddress(selectedProj.address!); }}>
                  📍 Use Project Address: {selectedProj.address}
                </Button>
              )}
              {geocodeResults.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-1">Select a result to set coordinates:</p>
                  {geocodeResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2 rounded-lg bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border transition-colors text-sm"
                      onClick={() => selectGeoResult(r.lat, r.lon)}
                    >
                      <div className="font-medium">{r.display.split(",").slice(0, 3).join(",")}</div>
                      <div className="text-xs text-muted-foreground">📍 {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lon).toFixed(4)}</div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Coordinates will be saved to the project automatically.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary stats */}
      {forecast && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{forecast.length}</div>
              <div className="text-xs text-muted-foreground">Day Forecast</div>
            </CardContent>
          </Card>
          <Card className={`border-border ${criticalDays > 0 ? "bg-red-500/10 border-red-500/30" : "bg-card"}`}>
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${criticalDays > 0 ? "text-red-400" : ""}`}>{criticalDays}</div>
              <div className="text-xs text-muted-foreground">🔴 Call-Off Days</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">{totalAlerts}</div>
              <div className="text-xs text-muted-foreground">Weather Alerts</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{clearDays}</div>
              <div className="text-xs text-muted-foreground">🟢 Clear Days</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast cards */}
      {forecast && (
        <div className="space-y-3">
          {forecast.map((day) => {
            const isExpanded = expandedDay === day.date;
            const sl = statusLabel(day.fieldStatus);
            return (
              <Card key={day.date} className={`border ${statusBg(day.fieldStatus)}`}>
                <div
                  className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{day.icon}</div>
                      <div>
                        <div className="font-bold">{dayName(day.date)}</div>
                        <div className="text-xs text-muted-foreground">{day.condition}</div>
                      </div>
                      <div className="text-center px-4">
                        <div className="text-lg font-bold">{day.high}°</div>
                        <div className="text-xs text-muted-foreground">{day.low}°</div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <div className={day.precipInches >= 0.25 ? "text-blue-400 font-semibold" : ""}>{day.precipInches}"</div>
                          <div className="text-xs text-muted-foreground">Rain</div>
                        </div>
                        <div className="text-center">
                          <div className={day.precipProb >= 60 ? "text-blue-400 font-semibold" : ""}>{day.precipProb}%</div>
                          <div className="text-xs text-muted-foreground">Prob</div>
                        </div>
                        <div className="text-center">
                          <div className={day.windMax >= 25 ? "text-orange-400 font-semibold" : ""}>{day.windMax}</div>
                          <div className="text-xs text-muted-foreground">Wind</div>
                        </div>
                        <div className="text-center">
                          <div className={day.gustMax >= 40 ? "text-red-400 font-semibold" : ""}>{day.gustMax}</div>
                          <div className="text-xs text-muted-foreground">Gusts</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm ${sl.color}`}>{sl.text}</span>
                      {day.alerts.length > 0 && <Badge variant="destructive">{String(day.alerts.length)} alerts</Badge>}
                      <span className="text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && day.alerts.length > 0 && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-4">
                    {day.alerts.map((alert, i) => (
                      <div key={i} className={`rounded-lg p-4 border ${alert.severity === "Critical" ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={alert.severity === "Critical" ? "destructive" : "default"}>{alert.severity}</Badge>
                              <span className="font-bold text-sm">{alert.type}</span>
                            </div>
                            <p className="text-sm mb-2">{alert.message}</p>
                            <div className="bg-black/20 rounded-lg p-3 mb-2">
                              <h5 className="text-xs font-bold text-primary mb-1">📋 RECOMMENDATION</h5>
                              <p className="text-sm">{alert.recommendation}</p>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-primary mb-1">AFFECTED WORK</h5>
                              <div className="flex flex-wrap gap-1">
                                {alert.affectedWork.map((w) => (
                                  <Badge key={w} variant="outline" className="text-xs">{w}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col gap-2">
                            {alert.severity === "Critical" && (
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
                                disabled={sending === day.date + alert.type}
                                onClick={() => handleCallOff(day, alert)}
                              >
                                {sending === day.date + alert.type ? "Sending..." : "📧 Send Crew Call-Off"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && day.alerts.length === 0 && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                      <div className="text-2xl mb-2">✅</div>
                      <div className="font-bold text-green-400">ALL CLEAR — Good conditions for field work</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {day.high}°F high, {day.precipProb}% chance of rain, winds {day.windMax} mph.
                        All trades can proceed as scheduled.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {!forecast && !loading && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">⛅</div>
            <h3 className="text-lg font-bold mb-2">Weather Intelligence</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Select a project above and click "Get Forecast" to see a 10-day weather analysis with field work recommendations,
              safety alerts, and one-click crew call-off emails.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function WeatherPage() {
  return <AppShell><WeatherContent /></AppShell>;
}
