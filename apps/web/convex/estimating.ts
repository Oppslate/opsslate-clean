import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ===== COST ITEMS =====
export const listCostItems = query({
  args: { companyId: v.id("companies"), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db.query("costItems").withIndex("by_category", q => q.eq("companyId", args.companyId).eq("category", args.category as string)).collect();
    }
    return await ctx.db.query("costItems").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createCostItem = mutation({
  args: { companyId: v.id("companies"), name: v.string(), category: v.string(), unit: v.optional(v.string()), unitCost: v.number(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("costItems", args);
  },
});

export const updateCostItem = mutation({
  args: { id: v.id("costItems"), name: v.optional(v.string()), category: v.optional(v.string()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(id, cleaned);
  },
});

export const deleteCostItem = mutation({
  args: { id: v.id("costItems") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== ESTIMATES =====
export const listEstimates = query({
  args: { companyId: v.id("companies"), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db.query("estimates").withIndex("by_status", q => q.eq("companyId", args.companyId).eq("status", args.status as string)).collect();
    }
    return await ctx.db.query("estimates").withIndex("by_company", q => q.eq("companyId", args.companyId)).order("desc").collect();
  },
});

export const getEstimate = query({
  args: { id: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createEstimate = mutation({
  args: {
    companyId: v.id("companies"), name: v.string(), client: v.optional(v.string()), location: v.optional(v.string()),
    bidDate: v.optional(v.string()), status: v.string(), bidType: v.optional(v.string()), description: v.optional(v.string()),
    overhead: v.optional(v.number()), profit: v.optional(v.number()), bond: v.optional(v.number()), tax: v.optional(v.number()),
    notes: v.optional(v.string()), projectNumber: v.optional(v.string()), federalAid: v.optional(v.string()),
    dbeGoal: v.optional(v.number()), contractDays: v.optional(v.number()), liquidatedDamages: v.optional(v.number()),
    preBidMeeting: v.optional(v.string()), prevailingWage: v.optional(v.string()), bidBondRequired: v.optional(v.string()),
    bidMethod: v.optional(v.string()), buildingType: v.optional(v.string()), squareFootage: v.optional(v.number()),
    floors: v.optional(v.number()), architect: v.optional(v.string()), addendaCount: v.optional(v.number()), alternates: v.optional(v.string()), trusses: v.optional(v.number()), ends: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("estimates", args);
  },
});

export const updateEstimate = mutation({
  args: {
    id: v.id("estimates"), name: v.optional(v.string()), client: v.optional(v.string()), location: v.optional(v.string()),
    bidDate: v.optional(v.string()), status: v.optional(v.string()), bidType: v.optional(v.string()), description: v.optional(v.string()),
    overhead: v.optional(v.number()), profit: v.optional(v.number()), bond: v.optional(v.number()), tax: v.optional(v.number()),
    notes: v.optional(v.string()), projectNumber: v.optional(v.string()), federalAid: v.optional(v.string()),
    dbeGoal: v.optional(v.number()), contractDays: v.optional(v.number()), liquidatedDamages: v.optional(v.number()),
    preBidMeeting: v.optional(v.string()), prevailingWage: v.optional(v.string()), bidBondRequired: v.optional(v.string()),
    bidMethod: v.optional(v.string()), buildingType: v.optional(v.string()), squareFootage: v.optional(v.number()),
    floors: v.optional(v.number()), architect: v.optional(v.string()), addendaCount: v.optional(v.number()), alternates: v.optional(v.string()), trusses: v.optional(v.number()), ends: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(id, cleaned);
  },
});

export const deleteEstimate = mutation({
  args: { id: v.id("estimates") },
  handler: async (ctx, args) => {
    // Delete related items
    const items = await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const item of items) await ctx.db.delete(item._id);
    const rfqs = await ctx.db.query("estimateRfqs").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const rfq of rfqs) await ctx.db.delete(rfq._id);
    const engs = await ctx.db.query("engineerEstimates").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const eng of engs) await ctx.db.delete(eng._id);
    await ctx.db.delete(args.id);
  },
});

export const duplicateEstimate = mutation({
  args: { id: v.id("estimates") },
  handler: async (ctx, args) => {
    const orig = await ctx.db.get(args.id);
    if (!orig) throw new Error("Not found");
    const { _id, _creationTime, ...data } = orig;
    const newId = await ctx.db.insert("estimates", { ...data, name: data.name + " (Copy)", status: "draft", projectId: undefined });
    const items = await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.id)).collect();
    for (const item of items) {
      const { _id: _, _creationTime: __, ...itemData } = item;
      await ctx.db.insert("estimateItems", { ...itemData, estimateId: newId });
    }
    return newId;
  },
});

// ===== ESTIMATE ITEMS =====
export const listEstimateItems = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
  },
});

export const listCompanyEstimateItems = query({
  args: { companyId: v.id("companies"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 2000, 1), 5000);
    return await ctx.db.query("estimateItems")
      .withIndex("by_company", q => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);
  },
});

export const createEstimateItem = mutation({
  args: { companyId: v.id("companies"), estimateId: v.id("estimates"), section: v.optional(v.string()), description: v.string(), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), taxPct: v.optional(v.number()), costItemId: v.optional(v.id("costItems")), costCode: v.optional(v.string()), assemblyId: v.optional(v.string()), assemblyName: v.optional(v.string()), duplicateFingerprint: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("estimateItems", args);
  },
});

export const updateEstimateItem = mutation({
  args: { id: v.id("estimateItems"), section: v.optional(v.string()), description: v.optional(v.string()), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), taxPct: v.optional(v.number()), costCode: v.optional(v.string()), assemblyId: v.optional(v.string()), assemblyName: v.optional(v.string()), duplicateFingerprint: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(id, cleaned);
  },
});

export const deleteEstimateItem = mutation({
  args: { id: v.id("estimateItems") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== ESTIMATE SPEC BOOKS =====
export const listEstimateSpecBooks = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimateSpecBooks").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
  },
});

function compactServerSpecBook(raw: any) {
  const now = new Date().toISOString();
  const sections = Array.isArray(raw?.sections) ? raw.sections : [];
  return {
    clientBookId: raw?.clientBookId ? String(raw.clientBookId) : raw?.id ? String(raw.id) : undefined,
    name: String(raw?.name || raw?.fileName || "Spec Book"),
    fileName: raw?.fileName ? String(raw.fileName) : undefined,
    pageCount: typeof raw?.pageCount === "number" ? raw.pageCount : undefined,
    status: raw?.status ? String(raw.status) : "indexed",
    sections,
    storageNote: raw?.storageNote ? String(raw.storageNote) : undefined,
    createdAt: raw?.createdAt ? String(raw.createdAt) : now,
    updatedAt: now,
  };
}

export const saveEstimateSpecBooks = mutation({
  args: { companyId: v.id("companies"), estimateId: v.id("estimates"), books: v.array(v.any()) },
  handler: async (ctx, args) => {
    const estimate = await ctx.db.get(args.estimateId);
    if (!estimate || estimate.companyId !== args.companyId) throw new Error("Estimate not found for company");

    const existing = await ctx.db.query("estimateSpecBooks").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
    for (const book of existing) await ctx.db.delete(book._id);

    for (const raw of args.books) {
      const book = compactServerSpecBook(raw);
      await ctx.db.insert("estimateSpecBooks", {
        companyId: args.companyId,
        estimateId: args.estimateId,
        ...book,
      });
    }
    return await ctx.db.query("estimateSpecBooks").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
  },
});

export const deleteEstimateSpecBook = mutation({
  args: { estimateId: v.id("estimates"), id: v.optional(v.id("estimateSpecBooks")), clientBookId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const books = await ctx.db.query("estimateSpecBooks").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
    for (const book of books) {
      if ((args.id && book._id === args.id) || (args.clientBookId && book.clientBookId === args.clientBookId)) {
        await ctx.db.delete(book._id);
      }
    }
    return await ctx.db.query("estimateSpecBooks").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
  },
});

export const bulkCreateEstimateItems = mutation({
  args: { items: v.array(v.object({ companyId: v.id("companies"), estimateId: v.id("estimates"), section: v.optional(v.string()), description: v.string(), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()), taxPct: v.optional(v.number()), costCode: v.optional(v.string()), assemblyId: v.optional(v.string()), assemblyName: v.optional(v.string()), duplicateFingerprint: v.optional(v.string()), notes: v.optional(v.string()) })) },
  handler: async (ctx, args) => {
    const ids = [];
    for (const item of args.items) {
      ids.push(await ctx.db.insert("estimateItems", item));
    }
    return ids;
  },
});

export const listProjectEstimates = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimates").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();
  },
});

function inferEstimateUnit(text?: string) {
  const value = String(text || "").toLowerCase();
  if (/cubic yard|\bcy\b|cu yd/.test(value)) return "CY";
  if (/square foot|sq ft|\bsf\b/.test(value)) return "SF";
  if (/linear foot|lineal foot|lin ft|\blf\b/.test(value)) return "LF";
  if (/ton|tons/.test(value)) return "TON";
  if (/hour|labor hour|\bhr\b/.test(value)) return "HR";
  if (/each|\bea\b|unit/.test(value)) return "EA";
  if (/lump sum|allowance|complete|all work/.test(value)) return "LS";
  return "LS";
}

function normalizeSuggestionText(value?: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function inferEstimateSection(source: any, text: string) {
  const explicit = source.trade || source.phase || source.requirementType || source.ruleType;
  if (explicit) return String(explicit);
  if (/concrete|rebar|form|footing|slab/i.test(text)) return "Concrete";
  if (/steel|metal|joist|deck|beam/i.test(text)) return "Structural Steel";
  if (/electrical|conduit|panel|charger|ev/i.test(text)) return "Electrical";
  if (/asphalt|paving|roadway|traffic/i.test(text)) return "Site / Civil";
  if (/plumb|pipe|water|sanitary/i.test(text)) return "Plumbing";
  return "Spec Scope";
}

function inferCostCode(source: any, text: string) {
  const section = String(source.sourceSpecSection || "").replace(/\s+/g, "");
  if (/^\d{5,6}$/.test(section)) return section;
  if (/concrete|rebar|form|footing|slab/i.test(text)) return "03-CONCRETE";
  if (/steel|metal|joist|deck|beam/i.test(text)) return "05-METALS";
  if (/electrical|conduit|panel|charger|ev/i.test(text)) return "26-ELECTRICAL";
  if (/asphalt|paving|roadway|traffic/i.test(text)) return "32-SITE";
  if (/subcontract|by others/i.test(text)) return "SUBCONTRACT";
  if (/labor|install/i.test(text)) return "LABOR";
  if (/material|product|furnish/i.test(text)) return "MATERIAL";
  return "SPEC-SCOPE";
}

function tokenScore(text: string, candidate: string) {
  const sourceTokens = new Set(normalizeSuggestionText(text).split(" ").filter((word) => word.length > 3));
  const candidateTokens = normalizeSuggestionText(candidate).split(" ").filter((word) => word.length > 3);
  if (!sourceTokens.size || !candidateTokens.length) return 0;
  return candidateTokens.filter((word) => sourceTokens.has(word)).length / Math.max(candidateTokens.length, 1);
}

function matchCatalogItem(text: string, costItems: any[]) {
  const scored = costItems
    .map((item) => ({ item, score: tokenScore(text, [item.name, item.category, item.description, item.unit].filter(Boolean).join(" ")) }))
    .filter((entry) => entry.score >= 0.28)
    .sort((a, b) => b.score - a.score);
  const match = scored[0]?.item;
  if (!match) return {};
  return {
    costItemId: match._id,
    catalogMatchName: match.name,
    catalogMatchCategory: match.category,
    catalogMatchScore: scored[0].score,
    unitCost: typeof match.unitCost === "number" ? match.unitCost : 0,
    unit: match.unit,
  };
}

function matchAssembly(text: string, assemblies: any[]) {
  const scored = assemblies
    .map((assembly) => ({ assembly, score: tokenScore(text, [assembly.name, assembly.description].filter(Boolean).join(" ")) }))
    .filter((entry) => entry.score >= 0.28)
    .sort((a, b) => b.score - a.score);
  const match = scored[0]?.assembly;
  if (!match) return {};
  return {
    assemblyId: String(match._id),
    assemblyName: match.name,
    assemblyMatchScore: scored[0].score,
  };
}

function suggestionFingerprint(value: any) {
  return [
    value.sourceType,
    value.sourceRequirementId || value.sourcePaymentRuleId || "",
    normalizeSuggestionText(value.section),
    normalizeSuggestionText(value.description).split(" ").slice(0, 12).join(" "),
    value.unit || "",
    value.costCode || "",
  ].join(":");
}

function suggestionDescription(source: any) {
  return source.scopeAssumption || source.measurementLanguage || source.payItemNotes || source.description || source.title || "Suggested line item";
}

function isDuplicateSuggestion(suggestion: any, existingItems: any[]) {
  const fingerprint = suggestionFingerprint(suggestion);
  return existingItems.some((item) => {
    if (item.duplicateFingerprint && item.duplicateFingerprint === fingerprint) return true;
    if (suggestion.sourceRequirementId && item.sourceRequirementId === suggestion.sourceRequirementId) return true;
    if (suggestion.sourcePaymentRuleId && item.sourcePaymentRuleId === suggestion.sourcePaymentRuleId) return true;
    const sameDescription = normalizeSuggestionText(item.description) === normalizeSuggestionText(suggestion.description);
    const sameSection = normalizeSuggestionText(item.section) === normalizeSuggestionText(suggestion.section);
    const sameUnit = String(item.unit || "") === String(suggestion.unit || "");
    return sameDescription && (sameSection || sameUnit);
  });
}

function enrichEstimateSuggestion(source: any, base: any, text: string, costItems: any[], assemblies: any[], existingItems: any[]) {
  const catalog = matchCatalogItem(text, costItems);
  const assembly = matchAssembly(text, assemblies);
  const suggestion = {
    ...base,
    section: inferEstimateSection(source, text),
    costCode: inferCostCode(source, text),
    costItemId: catalog.costItemId ? String(catalog.costItemId) : undefined,
    catalogMatchName: catalog.catalogMatchName,
    catalogMatchCategory: catalog.catalogMatchCategory,
    catalogMatchScore: catalog.catalogMatchScore,
    assemblyId: assembly.assemblyId,
    assemblyName: assembly.assemblyName,
    assemblyMatchScore: assembly.assemblyMatchScore,
    unit: catalog.unit || base.unit,
    unitCost: catalog.unitCost ?? base.unitCost,
  };
  const duplicateFingerprint = suggestionFingerprint(suggestion);
  return {
    ...suggestion,
    duplicateFingerprint,
    duplicateReason: isDuplicateSuggestion({ ...suggestion, duplicateFingerprint }, existingItems) ? "Likely duplicate of an existing estimate item" : undefined,
  };
}

function buildEstimateItemSuggestions(requirements: any[], paymentRules: any[], existingItems: any[] = [], costItems: any[] = [], assemblies: any[] = []) {
  const suggestions: any[] = [];

  for (const requirement of requirements) {
    if (requirement.status === "inactive" || requirement.exclusion) continue;
    const text = [requirement.title, requirement.description, requirement.scopeAssumption, requirement.allowance, requirement.alternate].filter(Boolean).join(" ");
    if (!text.trim()) continue;
    const description = requirement.allowance
      ? `Allowance - ${requirement.title}`
      : requirement.alternate
        ? `Alternate - ${requirement.title}`
        : requirement.title;
    const suggestion = enrichEstimateSuggestion(requirement, {
      sourceType: "estimate_requirement",
      sourceRequirementId: String(requirement._id),
      description,
      quantity: 1,
      unit: inferEstimateUnit(text),
      unitCost: 0,
      taxPct: 0,
      notes: suggestionDescription(requirement),
      measurementBasis: requirement.scopeAssumption || requirement.description || requirement.allowance || requirement.alternate,
      sourceSpecSection: requirement.sourceSpecSection,
      sourceQuote: requirement.sourceQuote,
      suggestionConfidence: requirement.sourceConfidence ?? 0.7,
    }, text, costItems, assemblies, existingItems);
    if (!suggestion.duplicateReason) suggestions.push(suggestion);
  }

  for (const rule of paymentRules) {
    if (rule.status === "inactive" || rule.status === "resolved") continue;
    const text = [rule.title, rule.description, rule.measurementLanguage, rule.unitPriceRule, rule.payItemNotes].filter(Boolean).join(" ");
    if (!text.trim()) continue;
    const description = rule.payItemNotes ? rule.payItemNotes.slice(0, 140) : rule.title;
    const suggestion = enrichEstimateSuggestion(rule, {
      sourceType: "payment_rule",
      sourcePaymentRuleId: String(rule._id),
      description,
      quantity: 1,
      unit: inferEstimateUnit(text),
      unitCost: 0,
      taxPct: 0,
      notes: suggestionDescription(rule),
      measurementBasis: rule.measurementLanguage || rule.unitPriceRule || rule.description,
      sourceSpecSection: rule.sourceSpecSection,
      sourceQuote: rule.sourceQuote,
      suggestionConfidence: rule.sourceConfidence ?? 0.72,
    }, text, costItems, assemblies, existingItems);
    if (!suggestion.duplicateReason) suggestions.push(suggestion);
  }

  return suggestions.slice(0, 40);
}

export const listEstimateItemSuggestions = query({
  args: { projectId: v.id("projects"), estimateId: v.optional(v.id("estimates")) },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    const requirements = await ctx.db.query("estimateRequirements").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();
    const paymentRules = await ctx.db.query("paymentRules").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();
    const existingItems = args.estimateId ? await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId!)).collect() : [];
    const costItems = project?.companyId ? await ctx.db.query("costItems").withIndex("by_company", q => q.eq("companyId", project.companyId)).collect() : [];
    const assemblies = project?.companyId ? await ctx.db.query("estimateAssemblies").withIndex("by_company", q => q.eq("companyId", project.companyId)).collect() : [];
    return buildEstimateItemSuggestions(requirements, paymentRules, existingItems, costItems, assemblies);
  },
});

export const createSuggestedEstimateItems = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    estimateId: v.id("estimates"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const requirements = await ctx.db.query("estimateRequirements").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();
    const paymentRules = await ctx.db.query("paymentRules").withIndex("by_project", q => q.eq("projectId", args.projectId)).collect();
    const existingItems = await ctx.db.query("estimateItems").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
    const costItems = await ctx.db.query("costItems").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
    const assemblies = await ctx.db.query("estimateAssemblies").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
    const suggestions = buildEstimateItemSuggestions(requirements, paymentRules, existingItems, costItems, assemblies).slice(0, args.limit || 12);
    const ids = [];
    for (const suggestion of suggestions) {
      ids.push(await ctx.db.insert("estimateItems", {
        companyId: args.companyId,
        estimateId: args.estimateId,
        section: suggestion.section,
        description: suggestion.description,
        quantity: suggestion.quantity,
        unit: suggestion.unit,
        unitCost: suggestion.unitCost,
        taxPct: suggestion.taxPct,
        costItemId: suggestion.costItemId as any,
        costCode: suggestion.costCode,
        assemblyId: suggestion.assemblyId,
        assemblyName: suggestion.assemblyName,
        duplicateFingerprint: suggestion.duplicateFingerprint,
        notes: [`Measurement basis: ${suggestion.measurementBasis || "review spec"}`, suggestion.notes].filter(Boolean).join("\n\n"),
        sourceType: suggestion.sourceType,
        sourceRequirementId: suggestion.sourceRequirementId,
        sourcePaymentRuleId: suggestion.sourcePaymentRuleId,
        sourceSpecSection: suggestion.sourceSpecSection,
        sourceQuote: suggestion.sourceQuote,
        suggestionConfidence: suggestion.suggestionConfidence,
      } as any));
    }
    return { created: ids.length, ids };
  },
});

// ===== ESTIMATE REQUIREMENTS =====
export const listEstimateRequirements = query({
  args: { projectId: v.optional(v.id("projects")), estimateId: v.optional(v.id("estimates")) },
  handler: async (ctx, args) => {
    if (args.estimateId) {
      return await ctx.db.query("estimateRequirements").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId!)).collect();
    }
    if (args.projectId) {
      return await ctx.db.query("estimateRequirements").withIndex("by_project", q => q.eq("projectId", args.projectId!)).collect();
    }
    return [];
  },
});

export const createEstimateRequirement = mutation({
  args: {
    companyId: v.id("companies"), projectId: v.id("projects"), estimateId: v.optional(v.id("estimates")),
    title: v.string(), requirementType: v.optional(v.string()), description: v.optional(v.string()),
    allowance: v.optional(v.string()), alternate: v.optional(v.string()), exclusion: v.optional(v.string()),
    wageRule: v.optional(v.string()), bondRule: v.optional(v.string()), taxRule: v.optional(v.string()), dbeRule: v.optional(v.string()),
    liquidatedDamagesRule: v.optional(v.string()), scopeAssumption: v.optional(v.string()),
    trade: v.optional(v.string()), phase: v.optional(v.string()), priority: v.optional(v.string()), status: v.optional(v.string()), projectRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("estimateRequirements", { ...args, status: args.status || "active", createdAt: Date.now() });
  },
});

export const updateEstimateRequirement = mutation({
  args: {
    id: v.id("estimateRequirements"), estimateId: v.optional(v.id("estimates")),
    title: v.optional(v.string()), requirementType: v.optional(v.string()), description: v.optional(v.string()),
    allowance: v.optional(v.string()), alternate: v.optional(v.string()), exclusion: v.optional(v.string()),
    wageRule: v.optional(v.string()), bondRule: v.optional(v.string()), taxRule: v.optional(v.string()), dbeRule: v.optional(v.string()),
    liquidatedDamagesRule: v.optional(v.string()), scopeAssumption: v.optional(v.string()),
    trade: v.optional(v.string()), phase: v.optional(v.string()), priority: v.optional(v.string()), status: v.optional(v.string()), projectRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await ctx.db.patch(id, cleaned);
  },
});

export const deleteEstimateRequirement = mutation({
  args: { id: v.id("estimateRequirements") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== CREWS & ASSEMBLIES =====
export const listCrews = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimateCrews").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createCrew = mutation({
  args: { companyId: v.id("companies"), name: v.string(), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => { return await ctx.db.insert("estimateCrews", args); },
});

export const updateCrew = mutation({
  args: { id: v.id("estimateCrews"), name: v.optional(v.string()), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const { id, ...u } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(u).filter(([_, v]) => v !== undefined)));
  },
});

export const deleteCrew = mutation({
  args: { id: v.id("estimateCrews") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const listAssemblies = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.query("estimateAssemblies").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createAssembly = mutation({
  args: { companyId: v.id("companies"), name: v.string(), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => { return await ctx.db.insert("estimateAssemblies", args); },
});

export const updateAssembly = mutation({
  args: { id: v.id("estimateAssemblies"), name: v.optional(v.string()), description: v.optional(v.string()), items: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const { id, ...u } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(u).filter(([_, v]) => v !== undefined)));
  },
});

export const deleteAssembly = mutation({
  args: { id: v.id("estimateAssemblies") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== RFQs =====
export const listRfqs = query({
  args: { companyId: v.id("companies"), estimateId: v.optional(v.id("estimates")) },
  handler: async (ctx, args) => {
    if (args.estimateId) {
      return await ctx.db.query("estimateRfqs").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId!)).collect();
    }
    return await ctx.db.query("estimateRfqs").withIndex("by_company", q => q.eq("companyId", args.companyId)).collect();
  },
});

export const createRfq = mutation({
  args: { companyId: v.id("companies"), estimateId: v.id("estimates"), vendorName: v.string(), amount: v.optional(v.number()), status: v.optional(v.string()), dueDate: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => { return await ctx.db.insert("estimateRfqs", args); },
});

export const updateRfq = mutation({
  args: { id: v.id("estimateRfqs"), vendorName: v.optional(v.string()), amount: v.optional(v.number()), status: v.optional(v.string()), dueDate: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...u } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(u).filter(([_, v]) => v !== undefined)));
  },
});

export const deleteRfq = mutation({
  args: { id: v.id("estimateRfqs") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

// ===== ENGINEER ESTIMATES =====
export const listEngineerEstimates = query({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    return await ctx.db.query("engineerEstimates").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
  },
});

export const bulkCreateEngineerEstimates = mutation({
  args: { items: v.array(v.object({ companyId: v.id("companies"), estimateId: v.id("estimates"), itemCode: v.optional(v.string()), description: v.string(), quantity: v.optional(v.number()), unit: v.optional(v.string()), unitCost: v.optional(v.number()) })) },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert("engineerEstimates", item);
    }
  },
});

export const deleteEngineerEstimate = mutation({
  args: { id: v.id("engineerEstimates") },
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const clearEngineerEstimates = mutation({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("engineerEstimates").withIndex("by_estimate", q => q.eq("estimateId", args.estimateId)).collect();
    for (const item of items) await ctx.db.delete(item._id);
  },
});

// ===== WIN BID → CREATE OPSSLATE PROJECT =====
export const convertToProject = mutation({
  args: { estimateId: v.id("estimates") },
  handler: async (ctx, args) => {
    const est = await ctx.db.get(args.estimateId);
    if (!est) throw new Error("Estimate not found");
    if (est.projectId) return est.projectId; // Already linked

    // Create OpsSlate project from estimate data
    const projectId = await ctx.db.insert("projects", {
      companyId: est.companyId,
      name: est.name,
      location: est.location || "",
      status: "active",
      type: est.bidType === "building" ? "Commercial" : "Heavy Highway",
      contractor: est.client || "",
      contractDate: est.bidDate || "",
    });

    // Link estimate to project
    await ctx.db.patch(args.estimateId, { projectId, status: "won" });

    return projectId;
  },
});

// ===== CONTACTS / VENDORS / SUBS (shared with OpsSlate) =====
export const listContacts = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("contacts").collect();
  },
});

export const listVendors = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("vendors").collect();
    return all.filter(v => v.companyId === args.companyId);
  },
});

export const listSubcontractors = query({
  args: { companyId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("subcontractors").collect();
    return all.filter(s => s.companyId === args.companyId);
  },
});

export const createVendor = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    category: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("vendors", args);
  },
});

export const createSubcontractor = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    trade: v.optional(v.string()),
    contactName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subcontractors", args);
  },
});
