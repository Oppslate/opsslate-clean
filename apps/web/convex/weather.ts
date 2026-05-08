"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// ── Weather fetcher (Open-Meteo, free, no key) ──
export const fetchForecast = action({
  args: { latitude: v.number(), longitude: v.number() },
  handler: async (_ctx, args) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,weather_code&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=10`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API failed");
    const data = await res.json();
    return data;
  },
});

// ── Weather code to description ──
function weatherCodeToDesc(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain", 67: "Heavy freezing rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers",
    82: "Violent rain showers", 85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
  };
  return map[code] ?? "Unknown";
}

function weatherCodeToIcon(code: number): string {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 67) return "🧊";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "❄️";
  return "⛈️";
}

function buildRecommendation(day: any) {
  const highRisk = day.alerts?.some((a: any) => a.severity === "Critical");
  const mediumRisk = day.alerts?.length > 0;
  const confidence = day.precipProb >= 70 || day.windMax >= 25 ? "high" : day.precipProb >= 40 || day.windMax >= 15 ? "medium" : "moderate";
  const recommendation = highRisk
    ? "Delay weather-sensitive work, protect materials, and review crew/lift plans now."
    : mediumRisk
      ? "Proceed with caution and watch exterior work, deliveries, and exposed materials."
      : "Proceed normally, but keep routine weather watch in place.";
  return { confidence, recommendation };
}

// ── Field work recommendations engine ──
export const analyzeWeather = action({
  args: { latitude: v.number(), longitude: v.number() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=10`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API failed");
    const data = await res.json();
    const daily = data.daily;

    const forecast = [];
    for (let i = 0; i < daily.time.length; i++) {
      const date = daily.time[i];
      const high = daily.temperature_2m_max[i];
      const low = daily.temperature_2m_min[i];
      const precip = daily.precipitation_sum[i];
      const precipProb = daily.precipitation_probability_max[i];
      const windMax = daily.wind_speed_10m_max[i];
      const gustMax = daily.wind_gusts_10m_max[i];
      const code = daily.weather_code[i];

      const alerts: Array<{ type: string; severity: string; message: string; recommendation: string; affectedWork: string[] }> = [];

      // Extreme cold
      if (low <= 20) {
        alerts.push({
          type: "Extreme Cold", severity: "Critical",
          message: `Low of ${low}°F — Risk of frostbite, hypothermia, frozen equipment`,
          recommendation: "Consider crew call-off. If working: mandatory warm-up breaks every 30 min, heated shelters required, no exposed skin policy.",
          affectedWork: ["Concrete Pours", "Masonry", "Painting", "Roofing", "All Exterior Work"],
        });
      } else if (low <= 32) {
        alerts.push({
          type: "Freezing", severity: "Warning",
          message: `Low of ${low}°F — Freezing conditions, ice risk on surfaces`,
          recommendation: "Delay concrete pours until temps rise above 40°F. Pre-treat walking surfaces. Hot water for mortar mix. Insulated blankets for fresh concrete.",
          affectedWork: ["Concrete Pours", "Masonry", "Painting", "Waterproofing"],
        });
      }

      // Extreme heat
      if (high >= 105) {
        alerts.push({
          type: "Extreme Heat", severity: "Critical",
          message: `High of ${high}°F — Heat stroke risk, OSHA heat standard triggered`,
          recommendation: "CREW CALL-OFF recommended for outdoor work 10AM-4PM. If working: mandatory 15-min shade breaks every hour, water every 15 min, buddy system.",
          affectedWork: ["All Exterior Work", "Roofing", "Concrete", "Steel Erection"],
        });
      } else if (high >= 95) {
        alerts.push({
          type: "High Heat", severity: "Warning",
          message: `High of ${high}°F — Heat illness risk elevated`,
          recommendation: "Provide shade structures, electrolyte stations. Schedule heavy work before 10AM. Monitor crew for heat exhaustion signs. Acclimatize new workers.",
          affectedWork: ["Roofing", "Concrete", "Exterior Work"],
        });
      }

      // Wind
      if (gustMax >= 40) {
        alerts.push({
          type: "High Wind", severity: "Critical",
          message: `Wind gusts up to ${gustMax} mph — Crane operations MUST stop`,
          recommendation: "STOP all crane operations. Secure loose materials and tarps. No work above 6 stories. Suspend scaffolding operations.",
          affectedWork: ["Crane Operations", "Steel Erection", "Roofing", "Scaffolding", "Framing"],
        });
      } else if (windMax >= 25) {
        alerts.push({
          type: "Windy", severity: "Warning",
          message: `Sustained winds ${windMax} mph — Elevated fall risk, material handling hazard`,
          recommendation: "Extra tie-downs on materials. Caution with panel/sheet goods lifting. Consider suspending aerial lifts.",
          affectedWork: ["Crane Operations", "Roofing", "Framing"],
        });
      }

      // Heavy rain
      if (precip >= 1.0) {
        alerts.push({
          type: "Heavy Rain", severity: "Critical",
          message: `${precip}" expected — Site flooding risk, excavation cave-in danger`,
          recommendation: "CREW CALL-OFF for exterior and below-grade work. Pump stations on standby. Cover open excavations. Suspend earthwork.",
          affectedWork: ["Excavation", "Foundation", "Concrete Pours", "Earthwork", "Roofing", "Painting"],
        });
      } else if (precip >= 0.25) {
        alerts.push({
          type: "Rain", severity: "Warning",
          message: `${precip}" expected (${precipProb}% probability) — Slippery surfaces, material protection needed`,
          recommendation: "Delay concrete finishing, painting, and waterproofing. Cover stored materials. Ensure drainage paths clear.",
          affectedWork: ["Concrete Finishing", "Painting", "Waterproofing", "Roofing"],
        });
      }

      // Snow
      if (code >= 71 && code <= 77) {
        alerts.push({
          type: "Snow", severity: code >= 75 ? "Critical" : "Warning",
          message: `Snow expected — Reduced visibility, slippery conditions`,
          recommendation: code >= 75
            ? "CREW CALL-OFF recommended. If essential work only: snow removal before access, de-icing all walking surfaces."
            : "Clear snow from work surfaces before starting. Extra caution on ladders/scaffolds. Heated break area required.",
          affectedWork: ["All Exterior Work", "Roofing", "Concrete", "Excavation"],
        });
      }

      // Thunderstorm
      if (code >= 95) {
        alerts.push({
          type: "Thunderstorm", severity: "Critical",
          message: `Thunderstorms with ${code >= 96 ? "hail" : "lightning"} — Lightning strike hazard`,
          recommendation: "EVACUATE elevated positions when lightning within 10 miles. 30-30 rule: if thunder < 30 sec after flash, stop work. Wait 30 min after last strike.",
          affectedWork: ["All Work", "Crane Operations", "Steel Erection", "Roofing"],
        });
      }

      // Good day
      const fieldStatus = alerts.length === 0 ? "green" : alerts.some((a) => a.severity === "Critical") ? "red" : "yellow";

      forecast.push({
        date,
        high: Math.round(high),
        low: Math.round(low),
        precipInches: precip,
        precipProb,
        windMax: Math.round(windMax),
        gustMax: Math.round(gustMax),
        condition: weatherCodeToDesc(code),
        icon: weatherCodeToIcon(code),
        weatherCode: code,
        fieldStatus,
        alerts,
      });
    }

    const consensus = forecast[0] ? buildRecommendation(forecast[0]) : null;
    return { forecast, location: { lat: args.latitude, lon: args.longitude }, consensus };
  },
});

export const analyzeWeatherMultiSource = action({
  args: { latitude: v.number(), longitude: v.number() },
  handler: async (_ctx, args) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=1`;
    const openMeteoRaw = await fetch(url).then((r) => r.ok ? r.json() : null).catch(() => null);
    const daily = openMeteoRaw?.daily;
    const primary = daily ? {
      date: daily.time[0],
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      precipProb: daily.precipitation_probability_max[0],
      windMax: Math.round(daily.wind_speed_10m_max[0]),
      condition: weatherCodeToDesc(daily.weather_code[0]),
      icon: weatherCodeToIcon(daily.weather_code[0]),
      fieldStatus: daily.precipitation_probability_max[0] >= 70 || daily.wind_speed_10m_max[0] >= 30 ? "red" : daily.precipitation_probability_max[0] >= 40 || daily.wind_speed_10m_max[0] >= 20 ? "yellow" : "green",
    } : null;
    if (!primary) return { sources: [], recommendation: null };

    const nwsPoint = await fetch(`https://api.weather.gov/points/${args.latitude},${args.longitude}`, { headers: { "User-Agent": "OpsSlate/1.0" } }).then((r) => r.ok ? r.json() : null).catch(() => null);
    const forecastUrl = nwsPoint?.properties?.forecast;
    const hourlyUrl = nwsPoint?.properties?.forecastHourly;
    const alertsUrl = `https://api.weather.gov/alerts/active?point=${args.latitude},${args.longitude}`;
    const nwsForecast = forecastUrl ? await fetch(forecastUrl, { headers: { "User-Agent": "OpsSlate/1.0" } }).then((r) => r.ok ? r.json() : null).catch(() => null) : null;
    const nwsHourly = hourlyUrl ? await fetch(hourlyUrl, { headers: { "User-Agent": "OpsSlate/1.0" } }).then((r) => r.ok ? r.json() : null).catch(() => null) : null;
    const nwsAlerts = await fetch(alertsUrl, { headers: { "User-Agent": "OpsSlate/1.0" } }).then((r) => r.ok ? r.json() : null).catch(() => null);

    const localSignal = {
      source: "Local Radar Proxy",
      summary: primary.precipProb >= 60 ? "Radar-style signal supports wet conditions today" : primary.windMax >= 25 ? "Radar clear but wind remains operational concern" : "No strong radar-style disruption signal",
      precipProb: primary.precipProb,
      windMax: primary.windMax,
    };

    const nwsPeriod = nwsForecast?.properties?.periods?.[0];
    const nwsHourlyPeriod = nwsHourly?.properties?.periods?.[0];
    const activeAlerts = (nwsAlerts?.features || []).map((f: any) => ({ event: f.properties?.event, headline: f.properties?.headline }));
    const sources = [
      { source: "Open-Meteo", summary: `${primary.icon} ${primary.condition}`, precipProb: primary.precipProb, windMax: primary.windMax, tempHigh: primary.high },
      { source: "National Weather Service", summary: nwsPeriod ? `${nwsPeriod.shortForecast || nwsPeriod.detailedForecast}` : "NWS unavailable", precipProb: nwsPeriod?.probabilityOfPrecipitation?.value ?? nwsHourlyPeriod?.probabilityOfPrecipitation?.value ?? null, windMax: nwsPeriod?.windSpeed ?? null, tempHigh: nwsPeriod?.temperature ?? null },
      localSignal,
    ];

    const precipValues = sources.map((s: any) => typeof s.precipProb === "number" ? s.precipProb : null).filter((v: any) => v !== null);
    const avgPrecip = precipValues.length ? Math.round(precipValues.reduce((a: number, b: number) => a + b, 0) / precipValues.length) : (primary?.precipProb ?? 0);
    const windValues = [primary?.windMax ?? 0, typeof localSignal.windMax === "number" ? localSignal.windMax : null].filter((v: any) => v !== null) as number[];
    const avgWind = windValues.length ? Math.round(windValues.reduce((a: number, b: number) => a + b, 0) / windValues.length) : (primary?.windMax ?? 0);
    const confidence = activeAlerts.length > 0 || avgPrecip >= 70 || avgWind >= 25 ? "high" : avgPrecip >= 40 || avgWind >= 15 ? "medium" : "moderate";
    const recommendation = activeAlerts.length > 0 || primary.fieldStatus === "red"
      ? "Delay weather-sensitive work and brief the field team early."
      : primary.fieldStatus === "yellow"
        ? "Proceed with caution, monitor radar and NWS updates, and protect exposed work."
        : "Proceed normally, with routine PM weather watch.";

    return {
      primary,
      sources,
      activeAlerts,
      consensus: {
        precipProb: avgPrecip,
        windMax: avgWind,
        confidence,
        recommendation,
        summary: activeAlerts.length > 0 ? `${activeAlerts.length} active NWS alert(s) affecting this project area.` : `Consensus supports ${avgPrecip >= 50 ? "a wet" : avgWind >= 20 ? "a windy" : "a manageable"} operating day.`,
      },
    };
  },
});

// ── Crew call-off email ──
export const sendCrewCallOff = action({
  args: {
    projectId: v.id("projects"),
    date: v.string(),
    reason: v.string(),
    recommendation: v.string(),
    affectedWork: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const { Resend } = await import("resend");
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(resendKey);

    // Get project info
    const projects = await ctx.runQuery(a.projects.list, { companyId: args.projectId }); // we'll get it another way
    // Get crew for this project
    const crew = await ctx.runQuery(a.crew.listByCompany, { companyId: args.projectId });

    // Actually, let's get crew by iterating - we need the project name too
    // Simplified: get all crew, filter by projectId
    let crewList: any[] = [];
    let projectName = "Project";
    try {
      // Try to get project directly
      const proj = await ctx.runQuery(a.projects.getById, { id: args.projectId });
      if (proj) {
        projectName = proj.name;
        const allCrew = await ctx.runQuery(a.crew.listByCompany, { companyId: proj.companyId });
        crewList = (allCrew ?? []).filter((c: any) => c.projectId === args.projectId && c.email);
      }
    } catch (e) {
      console.error("Error fetching crew:", e);
    }

    let sent = 0;
    for (const member of crewList) {
      try {
        await resend.emails.send({
          from: "OpsSlate Weather <notifications@opsslate.app>",
          to: member.email,
          subject: `⚠️ Weather Alert: ${args.reason} — ${projectName} (${args.date})`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; padding: 24px; border-radius: 12px;">
              <div style="background: #dc2626; color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">⚠️ WEATHER ALERT</h1>
                <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${projectName} — ${args.date}</p>
              </div>

              <div style="background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h2 style="margin: 0 0 8px; font-size: 16px; color: #fbbf24;">${args.reason}</h2>
                <p style="margin: 0; font-size: 14px; line-height: 1.6;">${args.recommendation}</p>
              </div>

              <div style="margin-bottom: 16px;">
                <h3 style="font-size: 14px; color: #f87171; margin: 0 0 8px;">Affected Work:</h3>
                ${args.affectedWork.map((w) => `<span style="display: inline-block; background: #dc2626; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; margin: 2px 4px 2px 0;">${w}</span>`).join("")}
              </div>

              <div style="background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px;">
                  Hi ${member.firstName}, due to hazardous weather conditions, <strong>outdoor work may be suspended</strong> for your safety.
                  Please confirm receipt with your supervisor and await further instructions.
                </p>
              </div>

              <div style="text-align: center; margin-top: 16px;">
                <a href="https://www.opsslate.app/weather" style="display: inline-block; background: #3b82f6; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Full Forecast</a>
              </div>

              <p style="font-size: 11px; color: #555; margin-top: 20px; text-align: center;">OpsSlate Weather Intelligence — Keeping crews safe.</p>
            </div>
          `,
        });
        sent++;
      } catch (e) {
        console.error("Failed to email:", member.email, e);
      }
    }
    return { sent, crewCount: crewList.length };
  },
});

// ── Bulk weather for calendar ──
export const bulkProjectWeather = action({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const projects = await ctx.runQuery(a.projects.list, { companyId: args.companyId });
    const withCoords = (projects ?? []).filter((p: any) => p.latitude && p.longitude);
    if (withCoords.length === 0) return { forecasts: [] };

    // Deduplicate nearby coords (within 0.1 degree ≈ 7 miles)
    const seen: { lat: number; lon: number; projectIds: string[]; projectNames: string[] }[] = [];
    for (const p of withCoords) {
      const existing = seen.find(s => Math.abs(s.lat - p.latitude) < 0.1 && Math.abs(s.lon - p.longitude) < 0.1);
      if (existing) {
        existing.projectIds.push(p._id);
        existing.projectNames.push(p.name);
      } else {
        seen.push({ lat: p.latitude, lon: p.longitude, projectIds: [p._id], projectNames: [p.name] });
      }
    }

    const forecasts: any[] = [];
    for (const loc of seen) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=10`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const daily = data.daily;

        const days: any[] = [];
        for (let i = 0; i < daily.time.length; i++) {
          const high = Math.round(daily.temperature_2m_max[i]);
          const low = Math.round(daily.temperature_2m_min[i]);
          const precip = daily.precipitation_sum[i];
          const precipProb = daily.precipitation_probability_max[i];
          const windMax = Math.round(daily.wind_speed_10m_max[i]);
          const gustMax = Math.round(daily.wind_gusts_10m_max[i]);
          const code = daily.weather_code[i];

          let status = "green";
          const recs: string[] = [];
          if (low <= 20) { status = "red"; recs.push(`Extreme cold ${low}°F — consider call-off`); }
          else if (low <= 32) { status = status === "red" ? "red" : "yellow"; recs.push(`Freezing ${low}°F — delay concrete pours`); }
          if (high >= 105) { status = "red"; recs.push(`Extreme heat ${high}°F — call-off outdoor 10AM-4PM`); }
          else if (high >= 95) { status = status === "red" ? "red" : "yellow"; recs.push(`Heat ${high}°F — schedule heavy work before 10AM`); }
          if (gustMax >= 40) { status = "red"; recs.push(`Gusts ${gustMax}mph — stop crane ops`); }
          else if (windMax >= 25) { status = status === "red" ? "red" : "yellow"; recs.push(`Wind ${windMax}mph — caution with lifts`); }
          if (precip >= 1.0) { status = "red"; recs.push(`${precip}" rain — call-off exterior work`); }
          else if (precip >= 0.25) { status = status === "red" ? "red" : "yellow"; recs.push(`${precip}" rain (${precipProb}%) — delay finishing`); }
          if (code >= 95) { status = "red"; recs.push("Thunderstorm — evacuate elevated positions"); }
          if (code >= 71 && code <= 77) { status = code >= 75 ? "red" : (status === "red" ? "red" : "yellow"); recs.push("Snow — clear surfaces before work"); }

          days.push({
            date: daily.time[i],
            high, low, precip, precipProb, windMax, gustMax,
            icon: weatherCodeToIcon(code),
            condition: weatherCodeToDesc(code),
            status,
            recommendations: recs,
          });
        }

        forecasts.push({
          projectIds: loc.projectIds,
          projectNames: loc.projectNames,
          days,
        });
      } catch (e) {
        console.error("Weather fetch failed for", loc.lat, loc.lon, e);
      }
    }

    return { forecasts };
  },
});

// ── Auto-geocode project address ──
export const geocodeAndSave = action({
  args: { projectId: v.id("projects"), address: v.string() },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(args.address)}&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "OpsSlate/1.0" } });
    if (!res.ok) return { success: false, error: "Geocoding API failed" };
    const data = await res.json();
    if (data.length === 0) return { success: false, error: "Address not found" };
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    await ctx.runMutation(a.projects.update, { id: args.projectId, latitude: lat, longitude: lon });
    return { success: true, latitude: lat, longitude: lon, display: data[0].display_name };
  },
});

export const refreshActiveProjectWeather = action({
  args: {},
  handler: async (ctx) => {
    const apiMod = (await import("./_generated/api")).api as any;
    const internalMod = (await import("./_generated/api")).internal as any;
    const companies = await ctx.runQuery(apiMod.companies.list, {} as any).catch(() => []);
    let refreshed = 0;
    let alertsCreated = 0;

    for (const company of companies ?? []) {
      const projects = await ctx.runQuery(apiMod.projects.list, { companyId: company._id });
      for (const project of (projects ?? []).filter((p: any) => p.status === "Active" || p.status === "In Progress" || p.status === "On Hold")) {
        try {
          let lat = project.latitude;
          let lon = project.longitude;
          if ((!lat || !lon) && (project.address || project.city || project.state)) {
            const addr = [project.address, project.city, project.state, project.zip].filter(Boolean).join(", ");
            const geo = await ctx.runAction(apiMod.weather.geocodeAndSave, { projectId: project._id, address: addr }).catch(() => null);
            lat = geo?.latitude;
            lon = geo?.longitude;
          }
          if (!lat || !lon) continue;
          const result = await ctx.runAction(apiMod.weather.analyzeWeatherMultiSource, { latitude: lat, longitude: lon });
          const today = result?.primary;
          refreshed++;
          const existing = await ctx.runQuery(apiMod.weatherAlerts.latestByProject, { projectId: project._id });
          const latestForecastChange = (existing || []).find((a: any) => a.alertType === "Forecast Change");
          const summary = result?.consensus ? `${result.consensus.summary} Recommendation: ${result.consensus.recommendation}` : "";
          if (summary && (!latestForecastChange || latestForecastChange.message !== summary)) {
            await ctx.runMutation(internalMod.weatherAlerts.createIfMissing, {
              companyId: company._id,
              projectId: project._id,
              date: today?.date || new Date().toISOString().slice(0, 10),
              alertType: "Forecast Change",
              severity: result?.consensus?.confidence === "high" ? "Warning" : "Info",
              message: summary,
              recommendation: result?.consensus?.recommendation || "Review the latest forecast.",
              affectedWork: today?.fieldStatus === "red" ? ["Exterior Work", "Deliveries", "Lifts"] : ["Monitor Conditions"],
            });
            alertsCreated++;
            const recipients = await ctx.runQuery(apiMod.contacts.list, { projectId: project._id }).catch(() => []);
            const emails = (recipients || []).filter((c: any) => c.email).map((c: any) => c.email).slice(0, 10);
            if (emails.length) {
              await ctx.runAction(apiMod.sendEmail.send, {
                companyId: String(company._id),
                to: emails.join(", "),
                subject: `${project.name} — Forecast Change Alert`,
                body: `Project: ${project.name}\nDate: ${today?.date || new Date().toLocaleDateString()}\n\nForecast update:\n${summary}\n\nRecommendation:\n${result?.consensus?.recommendation || "Review the forecast and adjust plans as needed."}`,
                projectId: String(project._id),
                senderName: "OpsSlate Weather Alerts",
              }).catch(() => {});
            }
          }
          if (!today?.alerts?.length) continue;
          for (const alert of today.alerts) {
            await ctx.runMutation(internalMod.weatherAlerts.createIfMissing, {
              companyId: company._id,
              projectId: project._id,
              date: today.date,
              alertType: alert.type,
              severity: alert.severity,
              message: alert.message,
              recommendation: alert.recommendation,
              affectedWork: alert.affectedWork,
            });
            alertsCreated++;
          }
        } catch (e) {
          console.error("weather refresh failed", project?._id, e);
        }
      }
    }

    return { refreshed, alertsCreated };
  },
});

// Weather alerts CRUD is in weatherAlerts.ts (non-node)
