import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const memory = readFileSync(join(process.cwd(), "convex", "estimatePredictionMemory.ts"), "utf8");
const estimatingPage = readFileSync(join(process.cwd(), "src", "app", "estimating", "page.tsx"), "utf8");

for (const table of [
  "estimatePredictionRuns",
  "estimatePredictionFeatures",
  "estimateOutcomeMemory",
  "estimatorFeedback",
  "predictionFeedback",
]) {
  assert.match(schema, new RegExp(`${table}: defineTable`), `schema should define ${table}`);
}

for (const requiredField of [
  "estimateId: v.id(\"estimates\")",
  "projectId: v.optional(v.id(\"projects\"))",
  "companyId: v.id(\"companies\")",
  "modelVersion: v.string()",
  "predictionType: v.string()",
  "predictionKey: v.string()",
  "predictionValue: v.any()",
  "inputSnapshot: v.optional(v.any())",
  "outputSnapshot: v.optional(v.any())",
  "outcomeSnapshot: v.optional(v.any())",
  "outcomeRecordedAt: v.optional(v.number())",
  "confidence: v.optional(v.number())",
  "featureKey: v.string()",
  "featureValue: v.any()",
  "actualValue: v.optional(v.any())",
  "outcomeType: v.string()",
  "feedbackType: v.string()",
  "sourceUserId: v.optional(v.id(\"users\"))",
]) {
  assert.match(schema, new RegExp(requiredField.replace(/[()]/g, "\\$&")), `prediction memory schema should include ${requiredField}`);
}

for (const indexName of [
  "by_estimate",
  "by_company",
  "by_prediction_run",
  "by_project",
  "by_prediction_key",
  "by_source_user",
]) {
  assert.match(schema, new RegExp(`\\.index\\("${indexName}"`), `prediction memory schema should expose ${indexName}`);
}

for (const fn of [
  "createPredictionRun",
  "listPredictionRuns",
  "recordPredictionFeatures",
  "recordEstimateOutcome",
  "listEstimateOutcomes",
  "recordEstimatorFeedback",
  "recordPredictionFeedback",
  "listPredictionFeedback",
  "updatePredictionRunOutcome",
]) {
  assert.match(memory, new RegExp(`export const ${fn}\\s*=`), `prediction memory module should export ${fn}`);
}

assert.match(memory, /ctx\.db\.insert\("estimatePredictionRuns"/, "memory module should persist prediction runs");
assert.match(memory, /inputSnapshot:\s*v\.optional\(v\.any\(\)\)/, "prediction run mutation should accept input snapshots");
assert.match(memory, /outputSnapshot:\s*v\.optional\(v\.any\(\)\)/, "prediction run mutation should accept output snapshots");
assert.match(memory, /outcomeSnapshot:\s*v\.optional\(v\.any\(\)\)/, "prediction run mutation should reserve later outcome snapshots");
assert.match(memory, /ctx\.db\.patch\(args\.predictionRunId,[\s\S]*outcomeSnapshot/, "memory module should update later prediction outcomes");
assert.match(memory, /ctx\.db\.insert\("estimatePredictionFeatures"/, "memory module should persist feature rows");
assert.match(memory, /ctx\.db\.insert\("estimateOutcomeMemory"/, "memory module should persist outcome memory");
assert.match(memory, /ctx\.db\.insert\("estimatorFeedback"/, "memory module should persist estimator feedback");
assert.match(memory, /ctx\.db\.insert\("predictionFeedback"/, "memory module should persist prediction feedback");

assert.match(estimatingPage, /useMutation\(api\.estimatePredictionMemory\.createPredictionRun\)/, "estimating page should persist every predictive estimator run");
assert.match(estimatingPage, /predictionRunSignatureRef/, "estimating page should guard prediction run writes with a signature");
assert.match(estimatingPage, /const inputSnapshot = \{[\s\S]*estimateId:[\s\S]*itemCount:[\s\S]*historicalItemCount:/, "prediction run writes should store model inputs");
assert.match(estimatingPage, /outputSnapshot:\s*predictionOutputSnapshot/, "prediction run writes should store model output");
assert.match(estimatingPage, /predictionValue:\s*\{[\s\S]*inputSnapshot,[\s\S]*outputSnapshot:[\s\S]*predictionOutputSnapshot,[\s\S]*outcomeSnapshot:\s*null/, "prediction run writes should remain compatible with the deployed predictionValue contract");
assert.match(estimatingPage, /confidence:\s*predictiveEstimatorModel\.survivalScore/, "prediction run writes should store confidence");

console.log("estimate prediction memory checks passed");
