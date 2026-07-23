"use client";

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-secondary rounded w-1/3 mb-3" />
      <div className="h-8 bg-secondary rounded w-1/2 mb-2" />
      <div className="h-3 bg-secondary rounded w-2/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 bg-secondary rounded ${i === 0 ? "w-32" : i < 3 ? "w-24" : "w-16"}`} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="h-10 bg-secondary rounded-lg w-64" />
        <div className="h-10 bg-secondary rounded-lg w-32" />
        <div className="ml-auto h-10 bg-secondary rounded-lg w-28" />
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-secondary/30 px-4 py-3 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 bg-secondary rounded w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 border-t border-border/30">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className={`h-4 bg-secondary rounded ${j === 0 ? "w-28" : "w-20"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-7 bg-secondary rounded w-40 mb-2" />
          <div className="h-4 bg-secondary rounded w-56" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-secondary rounded-lg w-40" />
          <div className="h-10 bg-secondary rounded-lg w-44" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (<SkeletonCard key={i} />))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="h-5 bg-secondary rounded w-48 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-secondary rounded w-16 mb-2" />
              <div className="h-6 bg-secondary rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
