import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(join(root, "src/app/buyout/page.tsx"), "utf8");

assert.match(page, /RFQ Desk/, "Buyout should include an RFQ Desk tab");
assert.match(page, /api\.companyBranding\.get/, "RFQs should use company branding for letterhead");
assert.match(page, /api\.vendors\.list/, "RFQs should pull vendor recipients from the vendor directory");
assert.match(page, /selectedVendorIds/, "RFQs should support multiple bid invitations");
assert.match(page, /buildRfqBody/, "RFQs should generate standardized correspondence");
assert.match(page, /copyRfqPackage/, "RFQs should copy a complete RFQ package");
assert.match(page, /mailto:/, "RFQs should open email drafts for selected vendors");
assert.match(page, /Missing detail flags/, "RFQ quote comparison should flag missing quote details");
assert.match(page, /Quantity from takeoff/, "RFQ requisitions should surface takeoff quantity context");
assert.match(page, /Specs\/Attachments/, "RFQs should include spec and attachment instructions");
assert.match(page, /api\.estimating\.listProjectEstimates/, "Material requisitions should find the project's linked estimates");
assert.match(page, /api\.estimating\.listEstimateItems/, "Material requisitions should populate from project estimate items");
assert.match(page, /rfqManualItemDescription/, "RFQ Desk should support a manual Other material requisition");
assert.match(page, /value="other"/, "Material requisition dropdown should include an Other option");
assert.match(page, /Pricing due date/, "RFQ Desk should label the date picker clearly");
assert.match(page, /type="date"/, "Pricing due should use a browser date picker");
