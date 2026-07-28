import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Euclid Stage 4F is a signed-in tenant-authorized read path", async () => {
  const [page, data, gateway, query] = await Promise.all([
    read("../src/app/projects/[projectId]/civil-geometry/page.tsx"),
    read("../src/lib/helios-data.ts"),
    read("../../web/convex/heliosGateway.ts"),
    read("../../web/convex/heliosEuclidCockpit.ts"),
  ]);
  assert.match(page, /readHeliosPrincipal/);
  assert.match(page, /redirect\(/);
  assert.match(data, /getEuclidCockpitWorkspace/);
  assert.match(gateway, /protectedPayload\(request\)/);
  assert.match(query, /requireHeliosPrincipal/);
  assert.match(query, /project\.companyId !== companyId/);
  assert.match(query, /solutionRecord\.companyId !== companyId/);
});

test("Euclid Stage 4F reconstructs fingerprint-verified canonical records without rereading PDFs", async () => {
  const query = await read("../../web/convex/heliosEuclidCockpit.ts");
  assert.match(query, /reconstructEuclidModel/);
  assert.match(query, /chunk\.payloadFingerprint/);
  assert.match(query, /heliosEuclidIntegrationSolutionFingerprint/);
  assert.doesNotMatch(query, /openai|ctx\.storage|storageId|\.pdf|application\/pdf/i);
});

test("Euclid Stage 4F remains read only and does not publish quantities or LandXML", async () => {
  const [component, page, navigation] = await Promise.all([
    read("../src/components/euclid-cockpit.tsx"),
    read("../src/app/projects/[projectId]/civil-geometry/page.tsx"),
    read("../src/lib/navigation.ts"),
  ]);
  assert.match(component, /Read only/);
  assert.match(component, /does not change project documents or publish estimate quantities/);
  assert.doesNotMatch(component, /fetch\(|onClick=|LandXML|download|edit geometry|accept geometry/i);
  assert.doesNotMatch(page, /POST|PATCH|DELETE|PUT/);
  assert.match(navigation, /href: "\/civil-geometry"/);
  assert.doesNotMatch(navigation, /label: "Civil Geometry"[\s\S]{0,120}disabled: true/);
});

test("Euclid Stage 4F uses the approved three-panel OpsSlate workflow", async () => {
  const component = await read("../src/components/euclid-cockpit.tsx");
  assert.match(component, /AlignmentList/);
  assert.match(component, /EngineeringWorkspace/);
  assert.match(component, /IntelligenceRail/);
  assert.match(component, /@opsslate\/suite-ui\/badge/);
  assert.match(component, /@opsslate\/suite-ui\/button/);
  assert.match(component, /@opsslate\/suite-ui\/tabs/);
  assert.match(component, /xl:grid-cols-\[280px_minmax\(0,1\.55fr\)_minmax\(300px,\.8fr\)\]/);
});

test("Euclid Stage 4F provides direct project access without altering existing readers", async () => {
  const [project, assistant, estimate] = await Promise.all([
    read("../src/components/project-intake.tsx"),
    read("../src/components/ask-helios-workspace.tsx"),
    read("../src/components/estimate-cockpit-2.tsx"),
  ]);
  assert.match(project, /projects\/\$\{project\.id\}\/civil-geometry/);
  assert.doesNotMatch(assistant, /EuclidCockpit|getEuclidCockpitWorkspace/);
  assert.doesNotMatch(estimate, /EuclidCockpit|getEuclidCockpitWorkspace/);
});
