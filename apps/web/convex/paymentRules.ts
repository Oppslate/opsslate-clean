import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return ctx.db.query("paymentRules").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
  },
});

function inferBillingChecklistStatus(value: unknown, required = true) {
  if (!required) return "not_applicable";
  if (typeof value === "boolean") return value ? "ready" : "missing";
  return String(value || "").trim() ? "ready" : "missing";
}

function checklistField(label: string, value: unknown, required = true) {
  return {
    label,
    value: typeof value === "boolean" ? (value ? "Required" : "") : String(value || "").trim(),
    status: inferBillingChecklistStatus(value, required),
    required,
  };
}

function buildPayAppChecklist(rules: any[]) {
  const rows = rules.map((rule) => {
    const storedMaterialsRequired = /stored material/i.test([rule.ruleType, rule.title, rule.description, rule.sourceQuote].filter(Boolean).join(" "));
    const retainageRequired = /retainage|retain/i.test([rule.ruleType, rule.title, rule.description, rule.sourceQuote].filter(Boolean).join(" "));
    const certifiedPayrollRequired = Boolean(rule.certifiedPayrollRequired) || /certified payroll|prevailing wage/i.test([rule.title, rule.description, rule.sourceQuote].filter(Boolean).join(" "));
    const checklist = {
      measurementMethod: checklistField("Measurement Method", rule.measurementLanguage || rule.description),
      backupDocs: checklistField("Backup Docs", rule.backupDocumentation),
      certifiedPayroll: checklistField("Certified Payroll", rule.certifiedPayrollRequired || certifiedPayrollRequired, certifiedPayrollRequired),
      storedMaterials: checklistField("Stored Materials", rule.storedMaterialRule, storedMaterialsRequired),
      retainage: checklistField("Retainage", rule.retainageRule, retainageRequired),
      unitPriceNotes: checklistField("Unit Price Notes", rule.unitPriceRule || rule.payItemNotes, /unit price|pay item/i.test([rule.ruleType, rule.title, rule.description, rule.sourceQuote].filter(Boolean).join(" "))),
    };
    const fields = Object.values(checklist);
    const missingItems = fields.filter((item: any) => item.status === "missing").map((item: any) => item.label);
    const readyItems = fields.filter((item: any) => item.status === "ready").length;
    const applicableItems = fields.filter((item: any) => item.status !== "not_applicable").length;

    return {
      ...rule,
      checklist,
      missingItems,
      readyItems,
      applicableItems,
      payAppReady: missingItems.length === 0 && applicableItems > 0,
    };
  });

  return {
    totalRules: rows.length,
    payAppReady: rows.filter((row) => row.payAppReady).length,
    missingBackupDocs: rows.filter((row) => row.checklist.backupDocs.status === "missing").length,
    missingMeasurementMethod: rows.filter((row) => row.checklist.measurementMethod.status === "missing").length,
    certifiedPayrollRequired: rows.filter((row) => row.checklist.certifiedPayroll.status === "ready").length,
    storedMaterialsRules: rows.filter((row) => row.checklist.storedMaterials.status !== "not_applicable").length,
    retainageRules: rows.filter((row) => row.checklist.retainage.status !== "not_applicable").length,
    rows,
  };
}

export const payAppChecklist = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const rules = await ctx.db.query("paymentRules").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    return buildPayAppChecklist(rules);
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    projectId: v.id("projects"),
    title: v.string(),
    ruleType: v.optional(v.string()),
    description: v.optional(v.string()),
    measurementLanguage: v.optional(v.string()),
    backupDocumentation: v.optional(v.string()),
    storedMaterialRule: v.optional(v.string()),
    retainageRule: v.optional(v.string()),
    certifiedPayrollRequired: v.optional(v.boolean()),
    unitPriceRule: v.optional(v.string()),
    payItemNotes: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    projectRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("paymentRules", {
      ...args,
      status: args.status || "active",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("paymentRules"),
    title: v.optional(v.string()),
    ruleType: v.optional(v.string()),
    description: v.optional(v.string()),
    measurementLanguage: v.optional(v.string()),
    backupDocumentation: v.optional(v.string()),
    storedMaterialRule: v.optional(v.string()),
    retainageRule: v.optional(v.string()),
    certifiedPayrollRequired: v.optional(v.boolean()),
    unitPriceRule: v.optional(v.string()),
    payItemNotes: v.optional(v.string()),
    trade: v.optional(v.string()),
    phase: v.optional(v.string()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    projectRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)));
  },
});

export const remove = mutation({
  args: { id: v.id("paymentRules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
