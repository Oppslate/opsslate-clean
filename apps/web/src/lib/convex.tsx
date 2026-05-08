"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

function getConvexUrl() {
  const value = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

const convexUrl = getConvexUrl();
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0f14] px-6 text-white">
        <div className="max-w-md rounded-lg border border-red-500/30 bg-red-950/20 p-6 text-center">
          <h1 className="text-lg font-semibold">OpsSlate is missing its Convex configuration.</h1>
          <p className="mt-2 text-sm text-white/70">
            Set NEXT_PUBLIC_CONVEX_URL for this deployment and redeploy the app.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
