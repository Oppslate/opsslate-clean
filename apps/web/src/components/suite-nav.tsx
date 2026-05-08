"use client";

import { SuiteToolbar } from "@/components/suite-toolbar";

export function SuiteNav({ showActions = true }: { showActions?: boolean }) {
  return <SuiteToolbar showActions={showActions} />;
}
