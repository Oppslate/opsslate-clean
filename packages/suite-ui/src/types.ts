import type { SuiteAppKey } from "@opsslate/suite-config";

export type SuiteToolbarUser = {
  email?: string;
  name?: string;
} | null;

export type SuiteToolbarProps = {
  activePathname: string;
  user: SuiteToolbarUser;
  plan: string;
  showActions?: boolean;
  onLogout?: () => void;
  appUrlOverrides?: Partial<Record<SuiteAppKey, string>>;
};
