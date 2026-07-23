import { Badge } from "@opsslate/suite-ui/badge";

import { humanizeStatus } from "@/lib/format";

export function StatusBadge({ value }: { value: string }) {
  const ready = value === "ready_for_intelligence" || value === "documents_ready";
  return (
    <Badge
      variant={ready ? "default" : "secondary"}
      className={
        ready ? "bg-green-500/15 text-green-300 hover:bg-green-500/20" : undefined
      }
    >
      {humanizeStatus(value)}
    </Badge>
  );
}
