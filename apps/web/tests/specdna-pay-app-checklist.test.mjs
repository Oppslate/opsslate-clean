import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const paymentRules = readFileSync(join(process.cwd(), "convex", "paymentRules.ts"), "utf8");
const billingPanel = readFileSync(join(process.cwd(), "src", "components", "billing-ops-books-panel.tsx"), "utf8");
const designDoc = readFileSync(join(process.cwd(), "..", "..", "docs", "superpowers", "specs", "2026-05-26-specdna-phase-two-command-center-design.md"), "utf8");

assert.match(paymentRules, /function inferBillingChecklistStatus/, "payment rules infer checklist status");
assert.match(paymentRules, /function buildPayAppChecklist/, "payment rules build pay-app checklist rows");
assert.match(paymentRules, /export const payAppChecklist/, "payment rules expose pay-app checklist query");
assert.match(paymentRules, /measurementMethod/, "checklist includes measurement method");
assert.match(paymentRules, /backupDocs/, "checklist includes backup docs");
assert.match(paymentRules, /certifiedPayroll/, "checklist includes certified payroll");
assert.match(paymentRules, /storedMaterials/, "checklist includes stored materials");
assert.match(paymentRules, /retainage/, "checklist includes retainage");
assert.match(paymentRules, /unitPriceNotes/, "checklist includes unit price notes");
assert.match(paymentRules, /missingItems/, "checklist calls out missing pay-app items");

assert.match(billingPanel, /paymentRules\.payAppChecklist/, "billing panel reads pay-app checklist query");
assert.match(billingPanel, /Pay-App Checklist/, "billing panel renders pay-app checklist title");
assert.match(billingPanel, /Backup Docs/, "billing panel displays backup docs checklist section");
assert.match(billingPanel, /Measurement Method/, "billing panel displays measurement method checklist section");
assert.match(billingPanel, /Certified Payroll/, "billing panel displays certified payroll checklist section");
assert.match(billingPanel, /Stored Materials/, "billing panel displays stored materials checklist section");
assert.match(billingPanel, /Retainage/, "billing panel displays retainage checklist section");
assert.match(billingPanel, /Unit Price Notes/, "billing panel displays unit price notes checklist section");
assert.match(billingPanel, /Missing for Pay App/, "billing panel displays missing checklist items");
assert.match(billingPanel, /Pay App Ready/, "billing panel displays ready count");

assert.match(designDoc, /Ops Books \/ billing packet polish/, "design doc records billing packet polish");

console.log("specdna pay-app checklist checks passed");
