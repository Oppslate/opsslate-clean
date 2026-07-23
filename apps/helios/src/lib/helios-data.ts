import "server-only";

import type {
  HeliosCockpitData,
  HeliosProjectDetail,
  HeliosProjectInput,
  HeliosProjectSummary,
} from "@opsslate/helios-domain";
import type { HeliosPrincipal } from "@opsslate/suite-auth/types";

import { callHeliosGateway } from "./helios-gateway";

export function getCockpit(principal: HeliosPrincipal) {
  return callHeliosGateway<HeliosCockpitData>(
    "/helios/v1/projects/list",
    principal,
  );
}

export function createProject(
  principal: HeliosPrincipal,
  input: HeliosProjectInput,
) {
  return callHeliosGateway<HeliosProjectSummary>(
    "/helios/v1/projects/create",
    principal,
    { input },
  );
}

export function getProject(principal: HeliosPrincipal, projectId: string) {
  return callHeliosGateway<HeliosProjectDetail>(
    "/helios/v1/projects/get",
    principal,
    { projectId },
  );
}
