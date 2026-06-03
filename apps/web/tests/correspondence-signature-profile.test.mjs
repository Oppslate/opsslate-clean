import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const signatureLib = readFileSync(join(root, "src/lib/correspondence-signature.ts"), "utf8");
const settingsPage = readFileSync(join(root, "src/app/settings/page.tsx"), "utf8");
const estimatingPage = readFileSync(join(root, "src/app/estimating/page.tsx"), "utf8");
const buyoutPage = readFileSync(join(root, "src/app/buyout/page.tsx"), "utf8");

assert.match(signatureLib, /signatureStorageKey/, "signature profile should be keyed to the logged-in user");
assert.match(signatureLib, /formatCorrespondenceSignature/, "signature library should format correspondence closings");
assert.match(signatureLib, /Cell:/, "signature closing should include a cell phone label");
assert.match(settingsPage, /Correspondence Signature/, "Settings should let each user manage their own signature");
assert.match(settingsPage, /Only your logged-in account can use this signature/, "Settings should explain signature ownership");
assert.match(settingsPage, /saveSignatureProfile/, "Settings should save the personal signature profile");
assert.match(estimatingPage, /formatCorrespondenceSignature/, "Estimating RFQs should use the sender signature");
assert.match(buyoutPage, /formatCorrespondenceSignature/, "Buyout RFQs should use the sender signature");
assert.doesNotMatch(estimatingPage, /"Thank you,"\s*,\s*branding\?\.name \|\| "OpsSlate Estimating"/, "Estimating RFQs should not close with company name only");
assert.doesNotMatch(buyoutPage, /"Thank you,"\s*,\s*branding\?\.name \|\| "OpsSlate Procurement"/, "Buyout RFQs should not close with company name only");
