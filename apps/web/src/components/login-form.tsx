"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LandingPage } from "@/components/landing-page";

function validatePassword(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 12) errors.push("Must be at least 12 characters");
  if (!/[A-Z]/.test(pw)) errors.push("Must contain at least 1 uppercase letter");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) errors.push("Must contain at least 1 special character");
  return errors;
}

function OpsSlateMark() {
  return (
    <div className="relative h-14 w-14 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="absolute left-3 top-3 h-8 w-8 border-l-[6px] border-t-[6px] border-white [clip-path:polygon(0_0,100%_0,72%_22%,24%_22%,24%_72%,0_100%)]" />
      <span className="absolute left-5 top-7 h-2.5 w-5 -skew-x-[28deg] rounded-[2px] bg-orange-500" />
      <span className="absolute left-8 top-7 h-2.5 w-5 -skew-x-[28deg] rounded-[2px] bg-lime-400" />
      <span className="absolute left-6 top-10 h-2.5 w-5 -skew-x-[28deg] rounded-[2px] bg-sky-500" />
    </div>
  );
}

export function LoginForm({
  defaultMode = "login",
  direct = false,
  lockedMode,
}: {
  defaultMode?: "login" | "signup";
  direct?: boolean;
  lockedMode?: "login" | "signup";
}) {
  const { login, signup } = useAuth();
  const [showAuth, setShowAuth] = useState(direct);
  const [mode, setMode] = useState<"login" | "signup">(lockedMode ?? defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      const pwErrors = validatePassword(password);
      if (pwErrors.length > 0) {
        setError(pwErrors.join(". "));
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(company, email, password, name);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  if (!showAuth) {
    return <LandingPage onGetStarted={() => window.location.href = "/signup"} />;
  }

  const pwErrors = mode === "signup" && password.length > 0 ? validatePassword(password) : [];
  const inputClass = "h-12 rounded-lg border-white/10 bg-white/[0.06] text-white placeholder:text-white/34 focus-visible:ring-orange-500/45";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050607] p-4 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(115deg,rgba(249,115,22,0.18),transparent_30%),linear-gradient(245deg,rgba(59,130,246,0.14),transparent_34%),linear-gradient(180deg,rgba(163,230,53,0.08),transparent_56%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_34%)]" />

      <div className="relative w-full max-w-[470px] rounded-2xl border border-white/10 bg-[#0c1117]/92 p-6 shadow-[0_32px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-7">
        <div className="mb-7">
          <div className="mb-5 flex items-center gap-4">
            <OpsSlateMark />
            <div className="min-w-0">
              <div className="text-3xl font-black tracking-tight">
                <span className="text-white">Ops</span><span className="text-orange-500">Slate</span>
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-white/42">Plan. Coordinate. Deliver.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className="rounded-md border border-orange-300/18 bg-orange-300/10 px-2.5 py-1 text-orange-100">Ops Suite</span>
            <span className="rounded-md border border-lime-300/16 bg-lime-300/8 px-2.5 py-1 text-lime-100">AI Ready</span>
            <span className="rounded-md border border-sky-300/16 bg-sky-300/8 px-2.5 py-1 text-sky-100">Secure Access</span>
          </div>
          <div className="mt-6">
            <h1 className="text-2xl font-black">
              {mode === "signup" ? "Create your OpsSlate account" : "Sign in to OpsSlate"}
            </h1>
            <p className="mt-2 text-sm font-medium text-white/56">
              {mode === "signup" ? "Start a new company workspace connected to your OpsSlate database." : "Access your existing company workspace."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <Input
                placeholder="Company name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className={inputClass}
              />
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </>
          )}

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />

          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/42 transition hover:bg-white/5 hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {mode === "signup" && password.length > 0 && (
              <div className="mt-2 space-y-1">
                {[
                  { label: "12+ characters", pass: password.length >= 12 },
                  { label: "1 uppercase letter", pass: /[A-Z]/.test(password) },
                  { label: "1 special character (!@#$...)", pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
                ].map((c) => (
                  <p key={c.label} className={`flex items-center gap-1.5 text-xs ${c.pass ? "text-lime-300" : "text-white/34"}`}>
                    {c.pass ? "OK" : "--"} {c.label}
                  </p>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-12 w-full rounded-lg bg-orange-500 text-base font-black text-slate-950 shadow-[0_16px_36px_rgba(249,115,22,0.24)] transition hover:bg-orange-400"
            disabled={loading || (mode === "signup" && pwErrors.length > 0)}
          >
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>

          {mode === "login" && (
            <div className="flex justify-between text-xs">
              <Link href="/forgot-password" className="font-semibold text-orange-200 hover:text-orange-100">
                Forgot password?
              </Link>
              <Link href="/forgot-login" className="font-semibold text-orange-200 hover:text-orange-100">
                Forgot login email?
              </Link>
            </div>
          )}

          {lockedMode ? (
            <Link
              href={lockedMode === "signup" ? "/login" : "/signup"}
              className="block w-full text-center text-sm font-medium text-white/56 transition hover:text-lime-200"
            >
              {lockedMode === "signup" ? "Already have an account? Sign in instead" : "Need a new company account? Create one"}
            </Link>
          ) : (
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-white/56 transition hover:text-lime-200"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
