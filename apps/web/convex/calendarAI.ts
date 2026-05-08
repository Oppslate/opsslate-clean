"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const weekPlanner = action({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // Get all calendar events
    const events = await ctx.runQuery(a.calendar.events, { companyId: args.companyId });

    // Get weather data
    let weatherInfo = "";
    try {
      const weatherRes = await ctx.runAction(a.weather.bulkProjectWeather, { companyId: args.companyId });
      if (weatherRes?.forecasts) {
        for (const f of weatherRes.forecasts) {
          weatherInfo += `\n${f.projectNames.join(", ")}:\n`;
          for (const d of f.days.slice(0, 7)) {
            weatherInfo += `  ${d.date}: ${d.condition}, ${d.high}°/${d.low}°F, Precip ${d.precipProb}%${d.status === "red" ? " ⚠️ BAD WEATHER" : d.status === "yellow" ? " ⚠️ CAUTION" : ""}\n`;
          }
        }
      }
    } catch { weatherInfo = "Weather data unavailable"; }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // Filter to this week's events
    const weekEvents = events.filter((e: any) => e.date >= todayStr && e.date <= weekEnd);
    // Overdue items
    const overdueEvents = events.filter((e: any) => e.date < todayStr && e.priority === "high");

    const prompt = `You are an AI construction project coordinator. Analyze this week's schedule and provide smart, actionable recommendations.

TODAY: ${today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

THIS WEEK'S EVENTS (${weekEvents.length}):
${weekEvents.map((e: any) => `${e.date} | ${e.title} | ${e.project} | ${e.detail || ""} ${e.priority === "high" ? "⚠️ HIGH PRIORITY" : ""}`).join("\n") || "No events scheduled"}

OVERDUE ITEMS (${overdueEvents.length}):
${overdueEvents.map((e: any) => `${e.date} | ${e.title} | ${e.project}`).join("\n") || "None"}

WEATHER FORECAST:
${weatherInfo || "Not available"}

Provide a smart weekly plan with these sections:

## 🎯 TODAY'S PRIORITIES
List the top 3-5 things that need attention TODAY. Be specific. Include times if relevant.

## ⚠️ OVERDUE / URGENT
Any overdue items or things that are about to miss deadlines. Be direct — these need immediate action.

## 📅 THIS WEEK'S PLAN
Day-by-day breakdown (Mon through Fri) of what's happening, what to prepare for, and potential conflicts.

## ⛅ WEATHER ALERTS
Flag any outdoor work that conflicts with bad weather days. Suggest rescheduling if needed.

## 🔄 CONFLICTS & RISKS
- Multiple events at different sites on the same day (can you be at both?)
- Resource conflicts (equipment, crew, inspections)
- Anything that could cause a delay if not handled now

## 💡 RECOMMENDATIONS
3-5 specific actions to take this week to stay ahead. Think like a superintendent who never drops the ball.

Be concise, direct, and practical. Use construction language. Don't repeat data — add INSIGHT.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    return { plan: result.content[0]?.text ?? "Failed to generate plan" };
  },
});
