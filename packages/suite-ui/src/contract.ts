export const SUITE_UI_VERSION = "0.2.0";

export const suiteUiFoundationContract = {
  package: "@opsslate/suite-ui",
  version: SUITE_UI_VERSION,
  ownership: {
    tokens: "shared",
    primitives: "shared",
    toolbar: "shared",
    shell: "shared",
    sidebar: "shared",
    feedbackStates: "shared",
  },
  applicationAdapters: [
    "authentication",
    "billing",
    "navigation data",
    "account actions",
    "application overlays",
  ],
  prohibitedApplicationOwnership: [
    "copied shell geometry",
    "copied sidebar component",
    "app-local semantic tokens",
    "app-local UI primitives",
    "duplicate toolbar implementation",
  ],
} as const;
