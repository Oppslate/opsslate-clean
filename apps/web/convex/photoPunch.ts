"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const analyzePhoto = action({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    location: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const a = (await import("./_generated/api")).api as any;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // Get signed URL and convert to base64
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found in storage");

    const fileRes = await fetch(fileUrl);
    const buffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are OpsSlate's AI Punch List Inspector. You analyze construction site photos to identify defects, incomplete work, and quality issues.

For EVERY defect you find, create a punch list item. Be thorough — inspect:
- Drywall: cracks, nail pops, seam tape issues, holes, unfinished corners
- Paint: drips, missed spots, wrong color, uneven coverage, roller marks
- Fixtures: missing, crooked, damaged, wrong type, not connected
- Flooring: scratches, gaps, lippage, uneven, damaged tiles
- Trim/Molding: gaps, nail holes unfilled, misaligned, missing
- Doors/Windows: alignment, hardware missing, scratches, seals
- Electrical: missing covers, crooked outlets, exposed wiring
- Plumbing: leaks, missing trim rings, unfinished caulking
- Ceiling: stains, cracks, unfinished patches, sagging
- General: debris, damage, incomplete work, code violations

Return JSON (no markdown):
{
  "defectsFound": true/false,
  "defectCount": <number>,
  "overallCondition": "Good|Fair|Poor|Critical",
  "items": [
    {
      "title": "<short defect title, max 60 chars>",
      "description": "<detailed description of the defect>",
      "trade": "<responsible trade: Drywall|Paint|Electrical|Plumbing|Flooring|Trim|HVAC|Framing|General>",
      "severity": "Critical|Major|Minor|Cosmetic",
      "priority": "High|Medium|Low",
      "estimatedFix": "<estimated repair description>"
    }
  ],
  "summary": "<2-3 sentence summary of the photo analysis>"
}

Be specific about locations within the photo (e.g., "upper left corner", "above the door frame", "south wall near outlet"). If the photo shows good quality work with no defects, say so.`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            { type: "text", text: `Analyze this photo from location: "${args.location}". Identify ALL defects, incomplete work, and quality issues. Be thorough.` },
          ],
        }],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${await response.text()}`);
    const result = await response.json();
    const aiText = result.content[0]?.text ?? "";

    let parsed;
    try {
      const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/) || [null, aiText];
      parsed = JSON.parse(jsonMatch[1] || aiText);
    } catch {
      return { defectsFound: false, defectCount: 0, items: [], summary: "Could not analyze photo.", overallCondition: "Unknown" };
    }

    // Auto-create punch list items
    const photoUrl = fileUrl;
    let created = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const item of (parsed.items || [])) {
      try {
        await ctx.runMutation(a.punchList.create, {
          companyId: args.companyId,
          projectId: args.projectId,
          title: item.title || "Photo defect",
          description: `${item.description || ""}\n\nEstimated fix: ${item.estimatedFix || "N/A"}\n\n📸 Auto-detected by AI Photo Analysis`,
          location: args.location,
          trade: item.trade || "General",
          priority: item.priority || "Medium",
          photos: [photoUrl],
          createdBy: `${args.userName} (AI Photo)`,
          notes: `Severity: ${item.severity || "Minor"} | Detected: ${today}`,
        });
        created++;
      } catch (e) {
        console.error("Failed to create punch item:", e);
      }
    }

    return {
      ...parsed,
      createdCount: created,
    };
  },
});
