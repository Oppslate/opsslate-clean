import type { ReactNode } from "react";

export type SuiteNavigationSection = {
  type: "section";
  label: string;
};

export type SuiteNavigationLink = {
  type: "link";
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
  active?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  disabledReason?: string;
};

export type SuiteNavigationItem =
  | SuiteNavigationSection
  | SuiteNavigationLink;

export type SuiteShellIdentity = {
  name: string;
  mark: string;
  badge?: ReactNode;
};

export type SuiteShellAccount = {
  name?: string;
  email?: string;
  initials?: string;
};

export type SuiteAccountMenuItem = {
  href: string;
  label: string;
};

export type SuiteFooterAction = {
  label: string;
  tone: "help" | "director" | "feedback";
  href?: string;
  onClick?: () => void;
};

export type SuiteSearchConfig = {
  label?: string;
  shortcut?: string;
  onActivate: () => void;
};
