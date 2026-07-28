import type { SuiteNavigationItem } from "@opsslate/suite-ui/shell";
import {
  Activity,
  ClipboardCheck,
  DraftingCompass,
  FileSearch,
  FileText,
  FolderKanban,
  Gauge,
  Bot,
  Handshake,
  Landmark,
  MailQuestion,
  Settings,
  TableProperties,
} from "lucide-react";
import { createElement } from "react";

const icon = (component: typeof Gauge) =>
  createElement(component, { size: 16, "aria-hidden": true });

const gatedReason =
  "This destination is intentionally unavailable until its approved foundation milestone begins.";

export const heliosNavigation: SuiteNavigationItem[] = [
  { type: "section", label: "Command Center" },
  { type: "link", href: "/", label: "Cockpit", icon: icon(Gauge) },
  {
    type: "link",
    href: "/ask",
    label: "Ask Helios",
    icon: icon(Bot),
  },

  { type: "section", label: "Preconstruction" },
  {
    type: "link",
    href: "/opportunities",
    label: "Opportunities",
    icon: icon(FolderKanban),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/documents",
    label: "Documents",
    icon: icon(FileText),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/project-intelligence",
    label: "Project Intelligence",
    icon: icon(FileSearch),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/civil-geometry",
    label: "Civil Geometry",
    icon: icon(DraftingCompass),
  },

  { type: "section", label: "Estimate" },
  {
    type: "link",
    href: "/estimate",
    label: "Estimate Builder",
    icon: icon(TableProperties),
  },
  {
    type: "link",
    href: "/rfqs",
    label: "RFQs",
    icon: icon(MailQuestion),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },

  { type: "section", label: "Review & Submit" },
  {
    type: "link",
    href: "/bid-review",
    label: "Bid Review",
    icon: icon(ClipboardCheck),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/proposal",
    label: "Proposal",
    icon: icon(Landmark),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },

  { type: "section", label: "Handoff" },
  {
    type: "link",
    href: "/handoff",
    label: "OpsSlate Handoff",
    icon: icon(Handshake),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },

  { type: "section", label: "System" },
  {
    type: "link",
    href: "/activity",
    label: "Activity",
    icon: icon(Activity),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
  {
    type: "link",
    href: "/settings",
    label: "Settings",
    icon: icon(Settings),
    disabled: true,
    disabledLabel: "Gated",
    disabledReason: gatedReason,
  },
];
