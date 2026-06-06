import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");
const memory = readFileSync(join(root, "convex/estimatePredictionMemory.ts"), "utf8");

assert.match(page, /Approve Recommendation/, "Cicero recommendations should be approvable");
assert.match(page, /Dismiss Recommendation/, "Cicero recommendations should be dismissible");
assert.match(page, /Learning Note/, "Dismissals should capture learning notes");
assert.match(page, /dismissRecommendationModal/, "Dismissals should open a learning modal");
assert.match(page, /recordEstimatorFeedback/, "Estimating should record estimator feedback");
assert.match(page, /accepted_recommendation/, "Accepted recommendations should be typed for memory");
assert.match(page, /dismissed_recommendation/, "Dismissed recommendations should be typed for memory");
assert.match(memory, /recordPredictionFeedback/, "Prediction feedback should be recorded");
assert.match(memory, /accepted|dismissed/, "Feedback should distinguish accepted and dismissed actions");

console.log("cicero recommendation outcome checks passed");
