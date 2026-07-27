import { httpRouter } from "convex/server";

import {
  appendHeliosPackageEntries,
  createHeliosProject,
  createHeliosPackage,
  createHeliosUploadIntent,
  getHeliosProject,
  getHeliosEstimate,
  finalizeHeliosPackage,
  listHeliosProjects,
  mutateHeliosEstimateBuild,
  mutateHeliosEstimateSupport,
  registerHeliosDocument,
  requestHeliosEstimateProposal,
  reclassifyHeliosEstimateWbs,
  reviewHeliosEstimateRecord,
  acceptHeliosEstimateImport,
  acceptRemainingHeliosEstimateRecords,
  reviewHeliosFinding,
  reviewHeliosBidBasis,
  reviewHeliosPlanIntelligence,
  resolveIdentity,
  retryHeliosDocument,
  retryHeliosProject,
  viewHeliosDocument,
} from "./heliosGateway";

const http = httpRouter();

http.route({
  path: "/helios/v1/identity/resolve",
  method: "POST",
  handler: resolveIdentity,
});

http.route({
  path: "/helios/v1/projects/list",
  method: "POST",
  handler: listHeliosProjects,
});
http.route({
  path: "/helios/v1/packages/create",
  method: "POST",
  handler: createHeliosPackage,
});
http.route({
  path: "/helios/v1/packages/append",
  method: "POST",
  handler: appendHeliosPackageEntries,
});
http.route({
  path: "/helios/v1/packages/finalize",
  method: "POST",
  handler: finalizeHeliosPackage,
});
http.route({
  path: "/helios/v1/projects/create",
  method: "POST",
  handler: createHeliosProject,
});
http.route({
  path: "/helios/v1/projects/get",
  method: "POST",
  handler: getHeliosProject,
});
http.route({
  path: "/helios/v1/uploads/create",
  method: "POST",
  handler: createHeliosUploadIntent,
});
http.route({
  path: "/helios/v1/documents/register",
  method: "POST",
  handler: registerHeliosDocument,
});
http.route({
  path: "/helios/v1/documents/view",
  method: "POST",
  handler: viewHeliosDocument,
});
http.route({
  path: "/helios/v1/documents/retry",
  method: "POST",
  handler: retryHeliosDocument,
});
http.route({
  path: "/helios/v1/intelligence/retry",
  method: "POST",
  handler: retryHeliosProject,
});
http.route({
  path: "/helios/v1/findings/review",
  method: "POST",
  handler: reviewHeliosFinding,
});
http.route({
  path: "/helios/v1/bid-basis/review",
  method: "POST",
  handler: reviewHeliosBidBasis,
});
http.route({
  path: "/helios/v1/plan-intelligence/review",
  method: "POST",
  handler: reviewHeliosPlanIntelligence,
});
http.route({
  path: "/helios/v1/estimates/get",
  method: "POST",
  handler: getHeliosEstimate,
});
http.route({
  path: "/helios/v1/estimates/propose",
  method: "POST",
  handler: requestHeliosEstimateProposal,
});
http.route({
  path: "/helios/v1/estimates/reclassify-wbs",
  method: "POST",
  handler: reclassifyHeliosEstimateWbs,
});
http.route({
  path: "/helios/v1/estimates/review",
  method: "POST",
  handler: reviewHeliosEstimateRecord,
});
http.route({
  path: "/helios/v1/estimates/build",
  method: "POST",
  handler: mutateHeliosEstimateBuild,
});
http.route({
  path: "/helios/v1/estimates/support",
  method: "POST",
  handler: mutateHeliosEstimateSupport,
});
http.route({
  path: "/helios/v1/estimates/accept-import",
  method: "POST",
  handler: acceptHeliosEstimateImport,
});
http.route({
  path: "/helios/v1/estimates/accept-remaining",
  method: "POST",
  handler: acceptRemainingHeliosEstimateRecords,
});

export default http;
