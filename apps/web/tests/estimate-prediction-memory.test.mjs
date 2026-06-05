import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const schema = readFileSync(join(process.cwd(), "convex", "schema.ts"), "utf8");
const memory = readFileSync(join(process.cwd(), "convex", "estimatePredictionMemory.ts"), "utf8");

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
]) {
  assert.match(memory, new RegExp(`export const ${fn}\\s*=`), `prediction memory module should export ${fn}`);
}

assert.match(memory, /ctx\.db\.insert\("estimatePredictionRuns"/, "memory module should persist prediction runs");
assert.match(memory, /ctx\.db\.insert\("estimatePredictionFeatures"/, "memory module should persist feature rows");
assert.match(memory, /ctx\.db\.insert\("estimateOutcomeMemory"/, "memory module should persist outcome memory");
assert.match(memory, /ctx\.db\.insert\("estimatorFeedback"/, "memory module should persist estimator feedback");
assert.match(memory, /ctx\.db\.insert\("predictionFeedback"/, "memory module should persist prediction feedback");

console.log("estimate prediction memory checks passed");
