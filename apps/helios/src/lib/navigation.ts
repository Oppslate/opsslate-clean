import type { SuiteNavigationItem } from "@opsslate/suite-ui/shell";

const gatedReason =
  "This destination is intentionally unavailable until its approved foundation milestone begins.";

export const heliosNavigation: SuiteNavigationItem[] = [
  { type: "section", label: "Command Center" },
  { type: "link", href: "/", label: "Foundation", icon: "F" },

  { type: "section", label: "Preconstruction" },
  {
    type: "link",
    href: "/opportunities",
    label: "Opportunities",
    icon: "O",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/documents",
    label: "Documents",
    icon: "D",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/project-intelligence",
    label: "Project Intelligence",
    icon: "PI",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },

  { type: "section", label: "Estimate" },
  {
    type: "link",
    href: "/estimate",
    label: "Estimate Builder",
    icon: "E",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/rfqs",
    label: "RFQs",
    icon: "R",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },

  { type: "section", label: "Review & Submit" },
  {
    type: "link",
    href: "/bid-review",
    label: "Bid Review",
    icon: "BR",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/proposal",
    label: "Proposal",
    icon: "P",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },

  { type: "section", label: "Handoff" },
  {
    type: "link",
    href: "/handoff",
    label: "OpsSlate Handoff",
    icon: "H",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },

  { type: "section", label: "System" },
  {
    type: "link",
    href: "/activity",
    label: "Activity",
    icon: "A",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/settings",
    label: "Settings",
    icon: "S",
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
];
