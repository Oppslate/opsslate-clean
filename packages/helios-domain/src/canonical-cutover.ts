import type {
  HeliosEngineeringCoverageStatus,
  HeliosEngineeringParityArea,
  HeliosEngineeringParityStatus,
} from "./engineering-record.ts";

export const HELIOS_CANONICAL_READER_CONTRACT_VERSION = 1;

export const HELIOS_CANONICAL_WORKFLOW_IDS = [
  "source_ingestion",
  "document_intelligence",
  "project_synthesis",
  "plan_reconstruction",
  "civil_geometry",
  "euclid",
  "takeoff",
  "estimate",
  "ask_helios",
] as const;

export const HELIOS_CANONICAL_READER_MODES = [
  "first_ingestion",
  "legacy_authoritative",
  "canonical_shadow",
  "canonical_required",
] as const;

export const HELIOS_CANONICAL_CUTOVER_STATUSES = [
  "ingestion_boundary",
  "blocked",
  "shadow_ready",
] as const;

export type HeliosCanonicalWorkflowId = (typeof HELIOS_CANONICAL_WORKFLOW_IDS)[number];
export type HeliosCanonicalReaderMode = (typeof HELIOS_CANONICAL_READER_MODES)[number];
export type HeliosCanonicalCutoverStatus = (typeof HELIOS_CANONICAL_CUTOVER_STATUSES)[number];

export type HeliosCanonicalWorkflowContract = {
  id: HeliosCanonicalWorkflowId;
  label: string;
  cutoverStage: number;
  currentMode: HeliosCanonicalReaderMode;
  targetMode: HeliosCanonicalReaderMode;
  originalPdfPolicy: "required_once" | "review_only" | "forbidden";
  requiredCoverage: Array<"documentIntelligence" | "planReconstruction" | "civilGeometry">;
  requiredParityAreas: HeliosEngineeringParityArea[];
  requiresCanonicalPages: boolean;
  requiresCanonicalText: boolean;
  requiresCanonicalAssets: boolean;
  requiresResolvedDrawingAuthority: boolean;
  legacyImplementation: string[];
};

export const HELIOS_CANONICAL_WORKFLOW_CONTRACTS: readonly HeliosCanonicalWorkflowContract[] = [
  {
    id: "source_ingestion",
    label: "Source ingestion",
    cutoverStage: 1,
    currentMode: "first_ingestion",
    targetMode: "first_ingestion",
    originalPdfPolicy: "required_once",
    requiredCoverage: [],
    requiredParityAreas: ["sources"],
    requiresCanonicalPages: false,
    requiresCanonicalText: false,
    requiresCanonicalAssets: false,
    requiresResolvedDrawingAuthority: false,
    legacyImplementation: ["heliosIntelligenceActions:startDocument"],
  },
  {
    id: "document_intelligence",
    label: "Document intelligence",
    cutoverStage: 2,
    currentMode: "legacy_authoritative",
    targetMode: "canonical_required",
    originalPdfPolicy: "review_only",
    requiredCoverage: ["documentIntelligence"],
    requiredParityAreas: ["sources", "document_intelligence", "evidence"],
    requiresCanonicalPages: false,
    requiresCanonicalText: false,
    requiresCanonicalAssets: false,
    requiresResolvedDrawingAuthority: false,
    legacyImplementation: ["heliosDocumentIntelligence", "heliosEvidence"],
  },
  {
    id: "project_synthesis",
    label: "Project synthesis",
    cutoverStage: 2,
    currentMode: "legacy_authoritative",
    targetMode: "canonical_required",
    originalPdfPolicy: "forbidden",
    requiredCoverage: ["documentIntelligence"],
    requiredParityAreas: ["sources", "document_intelligence", "evidence"],
    requiresCanonicalPages: false,
    requiresCanonicalText: false,
    requiresCanonicalAssets: false,
    requiresResolvedDrawingAuthority: false,
    legacyImplementation: ["heliosIntelligenceActions:synthesizeProject"],
  },
  {
    id: "plan_reconstruction",
    label: "Plan reconstruction",
    cutoverStage: 3,
    currentMode: "legacy_authoritative",
    targetMode: "canonical_required",
    originalPdfPolicy: "forbidden",
    requiredCoverage: ["planReconstruction"],
    requiredParityAreas: ["sources", "plan_pages", "plan_views", "plan_calibrations", "plan_references"],
    requiresCanonicalPages: true,
    requiresCanonicalText: true,
    requiresCanonicalAssets: true,
    requiresResolvedDrawingAuthority: false,
    legacyImplementation: ["heliosPlanActions:startPlanDocument"],
  },
  {
    id: "civil_geometry",
    label: "Civil geometry reconstruction",
    cutoverStage: 4,
    currentMode: "legacy_authoritative",
    targetMode: "canonical_required",
    originalPdfPolicy: "forbidden",
    requiredCoverage: ["planReconstruction", "civilGeometry"],
    requiredParityAreas: ["sources", "plan_pages", "plan_views", "plan_calibrations", "plan_references", "civil_geometry"],
    requiresCanonicalPages: true,
    requiresCanonicalText: true,
    requiresCanonicalAssets: true,
    requiresResolvedDrawingAuthority: true,
    legacyImplementation: ["heliosCivilGeometryActions:startGeometryDocument"],
  },
  {
    id: "euclid",
    label: "Euclid model",
    cutoverStage: 4,
    currentMode: "canonical_shadow",
    targetMode: "canonical_required",
    originalPdfPolicy: "forbidden",
    requiredCoverage: ["civilGeometry"],
    requiredParityAreas: ["sources", "plan_pages", "plan_views", "civil_geometry"],
    requiresCanonicalPages: true,
    requiresCanonicalText: false,
    requiresCanonicalAssets: false,
    requiresResolvedDrawingAuthority: true,
    legacyImplementation: ["heliosEuclidShadow:syncEuclidRunShadow"],
  },
  {
    id: "takeoff",
    label: "Quantity and takeoff",
    cutoverStage: 5,
    currentMode: "legacy_authoritative",
    targetMode: "canonical_required",
    originalPdfPolicy: "forbidden",
    requiredCoverage: ["civilGeometry"],
    requiredParityAreas: ["sources", "plan_pages", "plan_views", "plan_calibrations", "civil_geometry"],
    requiresCanonicalPages: true,
    requiresCanonicalText: false,
    requiresCanonicalAssets: false,
    requiresResolvedDrawingAuthority: true,
    legacyImplementation: ["heliosTakeoffIntelligence:getWorkspace"],
  },
  {
    id: "estimate",
    label: "Estimate builder",
    cutoverStage: 5,
    currentMode: "legacy_authoritative",
    targetMode: "canonical_required",
    originalPdfPolicy: "forbidden",
    requiredCoverage: ["documentIntelligence"],
    requiredParityAreas: ["sources", "document_intelligence", "evidence", "civil_geometry"],
    requiresCanonicalPages: false,
    requiresCanonicalText: false,
    requiresCanonicalAssets: false,
    requiresResolvedDrawingAuthority: false,
    legacyImplementation: ["heliosEstimateActions:startEstimateProposal"],
  },
  {
    id: "ask_helios",
    label: "Ask Helios",
    cutoverStage: 5,
    currentMode: "legacy_authoritative",
    targetMode: "canonical_required",
    originalPdfPolicy: "forbidden",
    requiredCoverage: ["documentIntelligence", "planReconstruction", "civilGeometry"],
    requiredParityAreas: ["sources", "document_intelligence", "evidence", "plan_pages", "plan_views", "civil_geometry"],
    requiresCanonicalPages: false,
    requiresCanonicalText: false,
    requiresCanonicalAssets: false,
    requiresResolvedDrawingAuthority: true,
    legacyImplementation: ["heliosAssistant:loadAnswerContext"],
  },
] as const;

export type HeliosCanonicalCutoverInput = {
  engineeringRecordAvailable: boolean;
  engineeringRecordCurrent: boolean;
  sourceCount: number;
  immutableSourceCount: number;
  canonicalPageCount: number;
  canonicalTextSpanCount: number;
  canonicalAssetCount: number;
  unresolvedDrawingAuthorityCount: number;
  coverage: Record<"documentIntelligence" | "planReconstruction" | "civilGeometry", HeliosEngineeringCoverageStatus>;
  parityStatus?: Exclude<HeliosEngineeringParityStatus, "not_applicable">;
  parityAreas: Partial<Record<HeliosEngineeringParityArea, HeliosEngineeringParityStatus>>;
};

export type HeliosCanonicalWorkflowReadiness = {
  id: HeliosCanonicalWorkflowId;
  label: string;
  cutoverStage: number;
  currentMode: HeliosCanonicalReaderMode;
  targetMode: HeliosCanonicalReaderMode;
  originalPdfPolicy: HeliosCanonicalWorkflowContract["originalPdfPolicy"];
  status: HeliosCanonicalCutoverStatus;
  blockers: string[];
  legacyImplementation: string[];
};

export type HeliosCanonicalCutoverEvaluation = {
  contractVersion: number;
  status: "blocked" | "shadow_ready";
  eligibleWorkflowCount: number;
  blockedWorkflowCount: number;
  duplicatePdfUploadWorkflowCount: number;
  workflows: HeliosCanonicalWorkflowReadiness[];
  blockers: string[];
};

function requiredParityBlockers(
  contract: HeliosCanonicalWorkflowContract,
  input: HeliosCanonicalCutoverInput,
) {
  return contract.requiredParityAreas.flatMap((area) => {
    const status = input.parityAreas[area];
    return status === "passed" || status === "not_applicable"
      ? []
      : [`${contract.label} requires passing ${area.replaceAll("_", " ")} parity.`];
  });
}

export function evaluateHeliosCanonicalCutover(
  input: HeliosCanonicalCutoverInput,
): HeliosCanonicalCutoverEvaluation {
  const commonBlockers = [
    ...(!input.engineeringRecordAvailable ? ["The canonical engineering record is missing."] : []),
    ...(input.engineeringRecordAvailable && !input.engineeringRecordCurrent ? ["The canonical engineering record is not current."] : []),
    ...(input.sourceCount < 1 ? ["No canonical source is registered."] : []),
    ...(input.immutableSourceCount !== input.sourceCount ? ["Every canonical source must be immutable."] : []),
    ...(input.parityStatus !== "passed" ? ["Current golden parity has not passed."] : []),
  ];
  const workflows = HELIOS_CANONICAL_WORKFLOW_CONTRACTS.map((contract): HeliosCanonicalWorkflowReadiness => {
    const blockers = [
      ...commonBlockers,
      ...requiredParityBlockers(contract, input),
      ...contract.requiredCoverage.flatMap((area) =>
        ["ready", "not_applicable"].includes(input.coverage[area])
          ? []
          : [`${contract.label} requires ${area.replace(/([A-Z])/g, " $1").toLowerCase()} coverage to be ready or not applicable.`],
      ),
      ...(contract.requiresCanonicalPages && input.canonicalPageCount < 1 ? [`${contract.label} requires canonical pages.`] : []),
      ...(contract.requiresCanonicalText && input.canonicalTextSpanCount < 1 ? [`${contract.label} requires native or OCR text spans.`] : []),
      ...(contract.requiresCanonicalAssets && input.canonicalAssetCount < 1 ? [`${contract.label} requires canonical page or view assets.`] : []),
      ...(contract.requiresResolvedDrawingAuthority && input.unresolvedDrawingAuthorityCount > 0
        ? [`${contract.label} is blocked by ${input.unresolvedDrawingAuthorityCount} unresolved drawing authority conflict${input.unresolvedDrawingAuthorityCount === 1 ? "" : "s"}.`]
        : []),
    ];
    return {
      id: contract.id,
      label: contract.label,
      cutoverStage: contract.cutoverStage,
      currentMode: contract.currentMode,
      targetMode: contract.targetMode,
      originalPdfPolicy: contract.originalPdfPolicy,
      status: contract.id === "source_ingestion"
        ? "ingestion_boundary"
        : blockers.length ? "blocked" : "shadow_ready",
      blockers: [...new Set(blockers)],
      legacyImplementation: [...contract.legacyImplementation],
    };
  });
  const downstream = workflows.filter((workflow) => workflow.id !== "source_ingestion");
  const blockers = [...new Set(downstream.flatMap((workflow) => workflow.blockers))];
  return {
    contractVersion: HELIOS_CANONICAL_READER_CONTRACT_VERSION,
    status: downstream.every((workflow) => workflow.status === "shadow_ready") ? "shadow_ready" : "blocked",
    eligibleWorkflowCount: downstream.filter((workflow) => workflow.status === "shadow_ready").length,
    blockedWorkflowCount: downstream.filter((workflow) => workflow.status === "blocked").length,
    duplicatePdfUploadWorkflowCount: HELIOS_CANONICAL_WORKFLOW_CONTRACTS.filter((workflow) =>
      workflow.originalPdfPolicy === "forbidden" && workflow.legacyImplementation.some((entry) =>
        entry.includes("PlanActions") || entry.includes("CivilGeometryActions"),
      ),
    ).length,
    workflows,
    blockers,
  };
}
