"use client";

import { Button } from "@opsslate/suite-ui/button";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-lg">
        <AlertTriangle className="mx-auto size-10 text-orange-300" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold">Helios could not load</h1>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          The secure project service is unavailable or the current account no
          longer has access. No project data was changed.
        </p>
        <Button className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
