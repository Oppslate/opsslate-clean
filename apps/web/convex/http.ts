import { httpRouter } from "convex/server";

import {
  createHeliosProject,
  createHeliosUploadIntent,
  getHeliosProject,
  listHeliosProjects,
  registerHeliosDocument,
  resolveIdentity,
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

export default http;
