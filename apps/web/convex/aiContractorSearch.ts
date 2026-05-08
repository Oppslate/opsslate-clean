"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const searchContractors = action({
  args: {
    location: v.string(),
    trade: v.string(),
    scope: v.optional(v.string()),
    count: v.number(),
    projectName: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const prompt = `You are a construction project management AI assistant. A PM needs to find qualified subcontractors or suppliers for a construction project.

**Project:** ${args.projectName || "Construction Project"}
**Location:** ${args.location}
**Trade/Service Needed:** ${args.trade}
**Scope of Work:** ${args.scope || args.trade}
**Number of recommendations needed:** ${args.count}

Search your knowledge for REAL companies that operate in or near this area and can perform this type of work. Prioritize:
1. Companies actually located in/near the specified area
2. Established businesses with good reputations
3. Companies specializing in the requested trade
4. Proper licensing and insurance (note if typically required for this trade in this state)

For each company, provide:
- Company name (real company if you know one, otherwise realistic placeholder with "[Verify]" tag)
- Contact person (if known, otherwise "Request Contact")
- Phone (if known, otherwise "Request")
- Email (if known, otherwise derive from company name pattern)
- Address (city/state at minimum)
- Rating (1-5 based on reputation/size/reliability — 5 = top tier, industry leader; 4 = excellent regional; 3 = solid local; 2 = newer/smaller; 1 = limited info)
- Specialty (what they're best known for within this trade)
- Why recommended (1-2 sentences on why they'd be good for this scope)
- Website (if known)
- Estimated company size (Small <20, Medium 20-100, Large 100+)
- Years in business (if known, otherwise estimate)
- Service radius (local, regional, national)
- Estimated distance from project location in miles (distanceMiles — integer, best estimate based on company address vs project location)

Also provide:
- "searchTips": 3-5 practical tips for finding more contractors in this area for this trade
- "licensingNotes": what licenses/certifications are typically required for this trade in this state
- "budgetRange": typical cost range for this type of work in this area (per unit if applicable)
- "redFlags": 3-5 red flags to watch for when hiring this type of contractor

Return ONLY valid JSON in this exact format:
{
  "contractors": [
    {
      "name": "Company Name",
      "contactName": "John Doe",
      "phone": "555-555-5555",
      "email": "info@company.com",
      "address": "City, State",
      "website": "www.company.com",
      "rating": 4,
      "specialty": "Commercial electrical systems",
      "trade": "${args.trade}",
      "whyRecommended": "Reason this company is a good fit",
      "companySize": "Medium",
      "yearsInBusiness": 15,
      "serviceRadius": "regional",
      "verified": false,
      "distanceMiles": 25
    }
  ],
  "searchTips": ["tip1", "tip2"],
  "licensingNotes": "notes about licensing requirements",
  "budgetRange": "typical cost info",
  "redFlags": ["flag1", "flag2"]
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI search failed: ${err}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Ensure we only return requested count
      if (parsed.contractors) {
        parsed.contractors = parsed.contractors.slice(0, args.count);
      }
      return parsed;
    } catch {
      throw new Error("Failed to parse contractor data");
    }
  },
});
