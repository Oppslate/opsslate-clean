import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const specDNA = readFileSync(join(process.cwd(), "convex", "specDNA.ts"), "utf8");
const panel = readFileSync(join(process.cwd(), "src", "components", "spec-dna-panel.tsx"), "utf8");

assert.match(specDNA, /export const createRfisFromRisks/, "specDNA exposes risk-to-RFI handoff");
assert.match(specDNA, /export const approveItem/, "specDNA exposes item approval handoff");
assert.match(specDNA, /createRfiFromSpecItem\(ctx, item, args\.requestedBy\)/, "risk approval can pass requester context");
assert.match(specDNA, /function createRfiFromSpecItem/, "risk handoff uses a shared direct RFI creator");
assert.match(specDNA, /ctx\.db\.insert\("rfis"/, "risk handoff creates real RFIs");
assert.match(specDNA, /createdRecordType:\s*"rfi"/, "risk handoff stamps created RFI records");
assert.match(specDNA, /let rfisCreated = 0/, "approved commit tracks created RFIs");
assert.match(specDNA, /let intelligenceCommitted = 0/, "approved commit tracks committed intelligence records");
assert.match(specDNA, /return \{ tasksCreated, submittalsCreated, rfisCreated, intelligenceCommitted \}/, "approved commit returns all handoff counts");

assert.match(panel, /createRfisFromRisks/, "panel wires the RFI handoff action");
assert.match(panel, /approveItem/, "panel uses item approval handoff");
assert.match(panel, /handleApproveItem/, "panel handles risk approval as an immediate RFI handoff");
assert.match(panel, /approveItem\(\{ id: item\._id, requestedBy: userName \}\)/, "bulk approval uses the same approval handoff");
assert.match(panel, /Create RFI/, "risk item button clearly creates an RFI");
assert.match(panel, /Create RFIs/, "panel exposes a create RFIs control");
assert.match(panel, /RFIs/, "panel reports RFI commit results");
assert.match(panel, /intelligence items/, "panel reports committed intelligence results");
assert.match(panel, /Commit Approved moves approved items into OpsSlate/, "panel explains commit behavior clearly");
assert.match(panel, /footerMessage/, "panel shows commit feedback near the commit button");
assert.match(panel, /reviewFilter/, "panel has a review filter");
assert.match(panel, /destinationFilter/, "panel has a destination filter");
assert.match(panel, /Approve Visible/, "panel has a bulk approve visible control");
assert.match(panel, /Low confidence/, "panel can isolate low-confidence items");

console.log("specdna phase 2 checks passed");
