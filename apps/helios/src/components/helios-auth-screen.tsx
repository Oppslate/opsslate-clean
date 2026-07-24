import type { ReactNode } from "react";

export function HeliosAuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
      <section className="hidden border-r border-border bg-card/40 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-orange-500 font-semibold text-white">
            H
          </span>
          <div>
            <p className="font-semibold text-foreground">Helios</p>
            <p className="text-sm text-muted-foreground">
              Construction Intelligence
            </p>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-orange-300">
            Built for heavy highway estimating
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-foreground">
            Turn bid documents into evidence-backed project intelligence.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Helios operates independently with its own accounts, companies,
            projects, document storage, and estimating workflow.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Private preview · Authorized users only
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        {children}
      </section>
    </main>
  );
}
