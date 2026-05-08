"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const analyzePhoto = action({
  args: { storageId: v.string(), projectId: v.id("projects"), projectName: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // Get the photo URL
    const url = await ctx.storage.getUrl(args.storageId as any);
    if (!url) throw new Error("Photo not found");

    // Download and convert to base64
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/jpeg";

    const prompt = `You are an expert construction site analyst. Analyze this jobsite photo and provide a structured assessment.

PROJECT: ${args.projectName}

Provide your analysis in this EXACT JSON format:
{
  "trades_visible": ["list of trades/work types visible (e.g. framing, electrical, concrete, plumbing, steel, roofing, drywall, painting, etc.)"],
  "work_description": "Brief description of work being performed or visible progress",
  "estimated_progress": "Estimate of completion stage (e.g. 'Foundation 80%', 'Framing started', 'Rough-in complete')",
  "safety_observations": ["list of safety items noticed — both good and bad (PPE, housekeeping, fall protection, signage, etc.)"],
  "safety_score": 8,
  "location_tag": "Where on the building/site (e.g. 'South elevation', 'Interior 2nd floor', 'Foundation east wall', 'Exterior parking area')",
  "weather_conditions": "Visible weather conditions if apparent",
  "materials_visible": ["list of materials/equipment visible on site"],
  "concerns": ["any quality or safety concerns worth noting"],
  "summary": "One-sentence summary suitable for a daily log entry"
}

Be specific and practical. Think like a superintendent doing a site walk. If you can't determine something from the photo, use "Not visible" or "Unable to determine". Return ONLY valid JSON.`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: contentType, data: base64 } },
            { type: "text", text: prompt }
          ]
        }]
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI error: ${await aiResponse.text()}`);
    const result = await aiResponse.json();
    const text = result.content[0]?.text ?? "{}";

    // Parse JSON from response
    let analysis: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = { summary: text, work_description: text };
    }

    return analysis;
  },
});
