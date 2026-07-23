import { SkeletonCard } from "@opsslate/suite-ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6" aria-label="Loading Helios">
      <div className="mx-auto max-w-[1500px] space-y-5 animate-pulse">
        <div className="h-9 w-72 rounded bg-secondary" />
        <div className="h-5 w-full max-w-xl rounded bg-secondary" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.55fr)]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
