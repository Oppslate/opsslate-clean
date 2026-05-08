import assert from "node:assert/strict";
import { getSuiteAppsByKeys, recommendedPrimaryApps, suiteApps, suiteBundles } from "../src/lib/suite-apps.ts";

assert.equal(suiteApps.length, 5);
assert.deepEqual(
  suiteApps.map((app) => app.key),
  ["projectManagement", "estimating", "scheduler", "books", "takeoff"],
);
assert.deepEqual(
  suiteApps.map((app) => app.href),
  ["/project-management", "/estimating", "/scheduler", "/books", "/takeoff"],
);
assert.deepEqual(
  recommendedPrimaryApps().map((app) => app.key),
  ["projectManagement", "estimating", "scheduler"],
);
for (const app of suiteApps) {
  assert.ok(app.name);
  assert.ok(app.domain.includes("opsslate.app"));
  assert.ok(app.appHref);
  assert.ok(app.localHref);
  assert.ok(app.handoff.length > 40);
  assert.ok(app.summary.length > 40);
  assert.ok(app.capabilities.length >= 4);
}

assert.deepEqual(
  suiteBundles.map((bundle) => bundle.name),
  ["Ops Core", "Precon Pack", "Full Suite"],
);
assert.equal(getSuiteAppsByKeys(["takeoff", "estimating"]).length, 2);
