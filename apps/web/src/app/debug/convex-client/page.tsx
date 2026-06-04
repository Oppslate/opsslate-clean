"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function ConvexClientDebugPage() {
  const [token, setToken] = useState("");
  const [writeStatus, setWriteStatus] = useState("");
  const user = useQuery(api.auth.me, token ? { token } : "skip") as any;
  const projects = useQuery(api.projects.list, user?.companyId ? { companyId: user.companyId } : "skip") as any[] | undefined;
  const createProject = useMutation(api.projects.create);

  useEffect(() => {
    setToken(window.localStorage.getItem("eq_token") || "");
  }, []);

  const writeProject = async () => {
    if (!user?.companyId) {
      setWriteStatus("No Convex user/company is available for this browser session.");
      return;
    }

    setWriteStatus("Writing...");
    try {
      const name = `Convex Debug Write ${new Date().toISOString()}`;
      const id = await createProject({
        companyId: user.companyId,
        name,
        type: "Debug",
        location: "Client debug page",
      });
      setWriteStatus(`Wrote project ${name} (${id})`);
    } catch (error) {
      setWriteStatus(error instanceof Error ? error.message : "Write failed.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0f14] p-8 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Convex Client Debug</h1>
          <p className="mt-2 text-sm text-white/60">
            Verifies the browser bundle, local session token, Convex user lookup, and project write path.
          </p>
        </div>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Client Environment</div>
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-black/35 p-4 text-sm text-emerald-200">
            {JSON.stringify(
              {
                nextPublicConvexUrl: process.env.NEXT_PUBLIC_CONVEX_URL || "",
                hasEqToken: Boolean(token),
                tokenLength: token.length,
              },
              null,
              2,
            )}
          </pre>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Convex Auth Lookup</div>
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-black/35 p-4 text-sm text-sky-200">
            {JSON.stringify({ user: user ?? null, projectCount: projects?.length ?? null }, null, 2)}
          </pre>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Client Write Test</div>
          <button
            type="button"
            onClick={writeProject}
            className="mt-3 rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
          >
            Write Debug Project
          </button>
          {writeStatus ? <p className="mt-3 text-sm text-white/75">{writeStatus}</p> : null}
        </section>
      </div>
    </main>
  );
}
