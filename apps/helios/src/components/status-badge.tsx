import { Badge } from "@opsslate/suite-ui/badge";

import { humanizeStatus } from "@/lib/format";

export function StatusBadge({ value }: { value: string }) {
  const ready = [
    "ready_for_intelligence",
    "documents_ready",
    "completed",
    "ready_for_review",
  ].includes(value);
  const failed = value === "failed";
  const processing = [
    "queued",
    "uploading_to_openai",
    "analyzing",
    "processing",
  ].includes(value);
  return (
    <Badge
      variant={failed ? "destructive" : ready ? "default" : "secondary"}
      className={
        ready
          ? "bg-green-500/15 text-green-300 hover:bg-green-500/20"
          : processing
            ? "bg-orange-500/15 text-orange-200 hover:bg-orange-500/20"
            : undefined
      }
    >
      {humanizeStatus(value)}
    </Badge>
  );
}
