import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const paymentRules = readFileSync(join(process.cwd(), "convex", "paymentRules.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");
const billingPanel = readFileSync(join(process.cwd(), "src", "components", "billing-ops-books-panel.tsx"), "utf8");
const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");

assert.match(schema, /paymentRules:\s*defineTable/, "schema defines payment rules");
assert.match(schema, /measurementLanguage:\s*v\.optional\(v\.string\(\)\)/, "payment rules store measurement language");
assert.match(schema, /backupDocumentation:\s*v\.optional\(v\.string\(\)\)/, "payment rules store backup documentation");
assert.match(schema, /storedMaterialRule:\s*v\.optional\(v\.string\(\)\)/, "payment rules store stored material rules");
assert.match(schema, /retainageRule:\s*v\.optional\(v\.string\(\)\)/, "payment rules store retainage rules");
assert.match(schema, /certifiedPayrollRequired:\s*v\.optional\(v\.boolean\(\)\)/, "payment rules store certified payroll requirement");
assert.match(schema, /unitPriceRule:\s*v\.optional\(v\.string\(\)\)/, "payment rules store unit price rules");
assert.match(schema, /payItemNotes:\s*v\.optional\(v\.string\(\)\)/, "payment rules store pay item notes");
assert.match(schema, /sourceQuote:\s*v\.optional\(v\.string\(\)\)/, "payment rules store source quote");

assert.match(paymentRules, /export const list/, "payment rules can be listed");
assert.match(paymentRules, /export const create/, "payment rules can be created");
assert.match(paymentRules, /export const update/, "payment rules can be updated");
assert.match(paymentRules, /export const remove/, "payment rules can be removed");

assert.match(specDNA, /type SpecPaymentRuleDraft/, "specDNA has payment rule draft type");
assert.match(specDNA, /createPaymentRuleFromSpecItem/, "specDNA creates payment rules from matrix items");
assert.match(specDNA, /export const publishPaymentRule/, "specDNA exposes editable payment rule publishing");
assert.match(specDNA, /createdRecordType:\s*"payment_rule"/, "published payment rules stamp matrix linkage");
assert.match(specDNA, /sourceType:\s*"spec_intelligence"/, "created payment rules are source linked");

assert.match(panel, /paymentRuleDraftItem/, "panel has payment rule draft state");
assert.match(panel, /Review Billing Draft/, "panel opens billing draft modal");
assert.match(panel, /Publish Payment Rule/, "panel publishes reviewed payment rules");
assert.match(panel, /publishPaymentRule/, "panel calls payment rule publishing mutation");
assert.match(panel, /certifiedPayrollRequired/, "panel reviews certified payroll requirement");

assert.match(billingPanel, /Billing \/ Ops Books Inputs/, "project page has billing ops books panel UI");
assert.match(billingPanel, /paymentRules\.payAppChecklist/, "billing panel lists published payment rules as a pay-app checklist");
assert.match(billingPanel, /Measurement Method/, "billing panel displays measurement language");
assert.match(billingPanel, /Backup Docs/, "billing panel displays backup documentation");
assert.match(billingPanel, /sourceQuote/, "billing panel displays source quote");
assert.match(projectPage, /BillingOpsBooksPanel/, "project page renders billing ops books panel");

console.log("specdna billing handoff checks passed");
