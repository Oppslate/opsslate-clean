import "server-only";

import type {
  HeliosCockpitData,
  HeliosEstimateWorkspace,
  HeliosProjectDetail,
  HeliosProjectInput,
  HeliosProjectSummary,
  HeliosTakeoffWorkspace,
} from "@opsslate/helios-domain";
import type { HeliosPrincipal } from "@/lib/helios-principal";

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

export function getEstimateWorkspace(
  principal: HeliosPrincipal,
  projectId: string,
) {
  return callHeliosGateway<HeliosEstimateWorkspace | null>(
    "/helios/v1/estimates/get",
    principal,
    { projectId },
  );
}

export function getTakeoffWorkspace(
  principal: HeliosPrincipal,
  projectId: string,
) {
  return callHeliosGateway<HeliosTakeoffWorkspace | null>(
    "/helios/v1/takeoff/get",
    principal,
    { projectId },
  );
}

export function requestEstimateProposal(
  principal: HeliosPrincipal,
  projectId: string,
) {
  return callHeliosGateway<{
    estimateId: string;
    jobId: string;
    status: "queued";
  }>("/helios/v1/estimates/propose", principal, { projectId });
}
