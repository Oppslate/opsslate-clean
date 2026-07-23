import { httpRouter } from "convex/server";

import { resolveIdentity } from "./heliosGateway";

const http = httpRouter();

http.route({
  path: "/helios/v1/identity/resolve",
  method: "POST",
  handler: resolveIdentity,
});

export default http;
