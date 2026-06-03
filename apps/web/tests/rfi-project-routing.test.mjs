import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const projectPage = readFileSync(join(process.cwd(), "src", "app", "project", "[id]", "page.tsx"), "utf8");
const rfiPage = readFileSync(join(process.cwd(), "src", "app", "rfis", "page.tsx"), "utf8");

assert.match(projectPage, /href=\{`\/rfis\?projectId=\$\{params\.id\}`\}/, "project RFIs card routes with project filter");
assert.match(rfiPage, /useSearchParams/, "RFI page can read route query params");
assert.match(rfiPage, /initialProjectId/, "RFI page initializes project filter from URL");

console.log("RFI project routing checks passed");
