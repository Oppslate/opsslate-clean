import { httpRouter } from "convex/server";

import {
  abandonHeliosPackage,
  appendHeliosPackageEntries,
  createHeliosProject,
  createHeliosPackage,
  createHeliosUploadIntent,
  getHeliosProject,
  getHeliosAssistantWorkspace,
  getHeliosEstimate,
  getHeliosEuclidCockpit,
  evaluateHeliosEuclidPosition,
  buildHeliosEuclidCandidate,
  validateHeliosEuclidCandidate,
  promoteHeliosEuclidCandidate,
  publishHeliosEuclidQuantity,
  recordHeliosEuclidReview,
  getHeliosTakeoff,
  finalizeHeliosPackage,
  listHeliosProjects,
  mutateHeliosEstimateBuild,
  mutateHeliosEstimateSupport,
  mutateHeliosTakeoff,
  registerHeliosDocument,
  requestHeliosEstimateProposal,
  reclassifyHeliosEstimateWbs,
  reviewHeliosEstimateRecord,
  acceptHeliosEstimateImport,
  acceptRemainingHeliosEstimateRecords,
  reviewHeliosFinding,
  reviewHeliosBidBasis,
  reviewHeliosPlanIntelligence,
  reviewHeliosCivilGeometry,
  resolveIdentity,
  retryHeliosDocument,
  retryHeliosProject,
  viewHeliosDocument,
  askHeliosProject,
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
  path: "/helios/v1/packages/abandon",
  method: "POST",
  handler: abandonHeliosPackage,
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
  path: "/helios/v1/assistant/get",
  method: "POST",
  handler: getHeliosAssistantWorkspace,
});
http.route({
  path: "/helios/v1/assistant/ask",
  method: "POST",
  handler: askHeliosProject,
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
  path: "/helios/v1/takeoff/get",
  method: "POST",
  handler: getHeliosTakeoff,
});
http.route({
  path: "/helios/v1/takeoff/review",
  method: "POST",
  handler: mutateHeliosTakeoff,
});
http.route({
  path: "/helios/v1/civil-geometry/review",
  method: "POST",
  handler: reviewHeliosCivilGeometry,
});
http.route({
  path: "/helios/v1/euclid/cockpit",
  method: "POST",
  handler: getHeliosEuclidCockpit,
});
http.route({
  path: "/helios/v1/euclid/stations",
  method: "POST",
  handler: evaluateHeliosEuclidPosition,
});
http.route({
  path: "/helios/v1/euclid/reviews",
  method: "POST",
  handler: recordHeliosEuclidReview,
});
http.route({
  path: "/helios/v1/euclid/candidates",
  method: "POST",
  handler: buildHeliosEuclidCandidate,
});
http.route({
  path: "/helios/v1/euclid/candidate-validations",
  method: "POST",
  handler: validateHeliosEuclidCandidate,
});
http.route({
  path: "/helios/v1/euclid/promotions",
  method: "POST",
  handler: promoteHeliosEuclidCandidate,
});
http.route({
  path: "/helios/v1/euclid/quantity-publications",
  method: "POST",
  handler: publishHeliosEuclidQuantity,
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
