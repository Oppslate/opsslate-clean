export type HeliosEstimateWbsClassificationRules = {
  itemNumberPrefixes: readonly string[];
  keywords: readonly string[];
};

export type HeliosEstimateWbsSection = {
  id: string;
  displayName: string;
  sortOrder: number;
  classificationRules: HeliosEstimateWbsClassificationRules;
};

export const HELIOS_ESTIMATE_WBS = [
  {
    id: "01",
    displayName: "Mobilization",
    sortOrder: 10,
    classificationRules: {
      itemNumberPrefixes: ["699"],
      keywords: [
        "mobilization",
        "performance bond",
        "payment bond",
        "bonds",
        "insurance",
        "temporary facilities",
        "field office",
        "temporary office",
      ],
    },
  },
  {
    id: "02",
    displayName: "Site Preparation",
    sortOrder: 20,
    classificationRules: {
      itemNumberPrefixes: ["201", "202", "209"],
      keywords: [
        "clearing and grubbing",
        "clearing & grubbing",
        "tree removal",
        "topsoil stripping",
        "erosion control",
        "construction entrance",
        "dust control",
        "temporary fence",
        "site clearing",
        "surface preparation",
        "site preparation",
        "grubbing",
      ],
    },
  },
  {
    id: "03",
    displayName: "Earthwork",
    sortOrder: 30,
    classificationRules: {
      itemNumberPrefixes: ["203.02", "203.07", "206.01", "206.02"],
      keywords: [
        "unclassified excavation",
        "structural excavation",
        "trench excavation",
        "rock excavation",
        "unsuitable material removal",
        "common excavation",
        "excavation and disposal",
        "excavate",
        "excavation",
      ],
    },
  },
  {
    id: "04",
    displayName: "Fill & Embankment",
    sortOrder: 40,
    classificationRules: {
      itemNumberPrefixes: ["203.03", "203.21", "203.24", "304"],
      keywords: [
        "select structure fill",
        "structural backfill",
        "shoulder backup material",
        "embankment",
        "borrow material",
        "imported fill",
        "common fill",
        "backfill",
        "select fill",
      ],
    },
  },
  {
    id: "05",
    displayName: "Drainage",
    sortOrder: 50,
    classificationRules: {
      itemNumberPrefixes: ["603", "604", "605"],
      keywords: [
        "culvert pipe",
        "underdrain",
        "catch basin",
        "drainage manhole",
        "headwall",
        "end section",
        "drainage structure",
        "storm drain",
        "culvert",
        "drainage pipe",
      ],
    },
  },
  {
    id: "06",
    displayName: "Utilities",
    sortOrder: 60,
    classificationRules: {
      itemNumberPrefixes: ["660", "661", "662", "663", "664", "665", "670"],
      keywords: [
        "water main",
        "water service",
        "sanitary sewer",
        "storm sewer",
        "gas main",
        "electric utility",
        "electrical utility",
        "communications",
        "telecommunications",
        "utility relocation",
        "utility work",
        "conduit",
      ],
    },
  },
  {
    id: "07",
    displayName: "Concrete",
    sortOrder: 70,
    classificationRules: {
      itemNumberPrefixes: ["555", "557", "608", "609"],
      keywords: [
        "concrete curb",
        "concrete sidewalk",
        "concrete driveway",
        "concrete foundation",
        "concrete wall",
        "concrete pavement",
        "reinforced concrete",
        "concrete work",
        "sidewalk",
        "curb",
      ],
    },
  },
  {
    id: "08",
    displayName: "Asphalt",
    sortOrder: 80,
    classificationRules: {
      itemNumberPrefixes: ["402", "404", "407", "418", "490"],
      keywords: [
        "asphalt base",
        "asphalt binder",
        "asphalt top",
        "asphalt pavement",
        "hot mix asphalt",
        "milling",
        "tack coat",
        "joint sealing",
        "bituminous",
        "asphalt",
      ],
    },
  },
  {
    id: "09",
    displayName: "Structures",
    sortOrder: 90,
    classificationRules: {
      itemNumberPrefixes: [
        "551",
        "552",
        "553",
        "554",
        "556",
        "558",
        "559",
        "562",
        "563",
        "564",
        "565",
        "567",
        "568",
      ],
      keywords: [
        "bridge structure",
        "bridge replacement",
        "retaining wall",
        "box culvert",
        "structural steel",
        "bridge bearing",
        "bridge joint",
        "cofferdam",
        "sheet piling",
        "pile foundation",
        "bridge",
      ],
    },
  },
  {
    id: "10",
    displayName: "Traffic Control",
    sortOrder: 100,
    classificationRules: {
      itemNumberPrefixes: ["619", "645", "646", "680", "685"],
      keywords: [
        "maintenance and protection of traffic",
        "work zone traffic control",
        "temporary traffic signal",
        "traffic signal",
        "pavement markings",
        "traffic signs",
        "flagging",
        "barricades",
        "striping",
        "traffic control",
      ],
    },
  },
  {
    id: "11",
    displayName: "Restoration",
    sortOrder: 110,
    classificationRules: {
      itemNumberPrefixes: ["610", "611", "612", "613"],
      keywords: [
        "pavement restoration",
        "site restoration",
        "topsoil and seed",
        "topsoil",
        "seeding",
        "seed and mulch",
        "mulching",
        "plantings",
        "landscaping",
        "restoration",
      ],
    },
  },
  {
    id: "12",
    displayName: "Miscellaneous",
    sortOrder: 120,
    classificationRules: {
      itemNumberPrefixes: [],
      keywords: [],
    },
  },
] as const satisfies readonly HeliosEstimateWbsSection[];

export type HeliosEstimateWbsId = (typeof HELIOS_ESTIMATE_WBS)[number]["id"];

export type HeliosEstimateWbsClassificationInput = {
  officialItemNumber: string;
  description: string;
  estimatorDescription?: string;
  supportingText?: readonly string[];
};

function normalized(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9.&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function prefixMatches(itemNumber: string, prefix: string) {
  return (
    itemNumber === prefix ||
    itemNumber.startsWith(`${prefix}.`) ||
    itemNumber.startsWith(prefix)
  );
}

export function classifyEstimateWbsSection(
  input: HeliosEstimateWbsClassificationInput,
) {
  const itemNumber = input.officialItemNumber.trim().toLowerCase();
  const searchText = normalized(
    [
      input.description,
      input.estimatorDescription || "",
      ...(input.supportingText || []),
    ].join(" "),
  );
  let best:
    | { section: (typeof HELIOS_ESTIMATE_WBS)[number]; score: number }
    | undefined;

  for (const section of HELIOS_ESTIMATE_WBS) {
    if (section.id === "12") continue;
    let score = 0;
    for (const prefix of section.classificationRules.itemNumberPrefixes) {
      if (prefixMatches(itemNumber, prefix.toLowerCase())) {
        score = Math.max(score, 10_000 + prefix.length * 10);
      }
    }
    for (const keyword of section.classificationRules.keywords) {
      const normalizedKeyword = normalized(keyword);
      if (normalizedKeyword && searchText.includes(normalizedKeyword)) {
        score += 500 + normalizedKeyword.length;
      }
    }
    if (
      score > 0 &&
      (!best ||
        score > best.score ||
        (score === best.score && section.sortOrder < best.section.sortOrder))
    ) {
      best = { section, score };
    }
  }
  return best?.section || HELIOS_ESTIMATE_WBS[HELIOS_ESTIMATE_WBS.length - 1];
}

export function estimateWbsSectionById(id: string) {
  return HELIOS_ESTIMATE_WBS.find((section) => section.id === id);
}
