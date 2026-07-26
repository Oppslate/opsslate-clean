import { httpRouter } from "convex/server";

import {
  createHeliosProject,
  createHeliosPackage,
  createHeliosUploadIntent,
  getHeliosProject,
  getHeliosEstimate,
  finalizeHeliosPackage,
  listHeliosProjects,
  registerHeliosDocument,
  requestHeliosEstimateProposal,
  reviewHeliosFinding,
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
  path: "/helios/v1/estimates/get",
  method: "POST",
  handler: getHeliosEstimate,
});
http.route({
  path: "/helios/v1/estimates/propose",
  method: "POST",
  handler: requestHeliosEstimateProposal,
});

export default http;
