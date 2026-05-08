"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

function validatePassword(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 12) errors.push("Must be at least 12 characters");
  if (!/[A-Z]/.test(pw)) errors.push("Must contain at least 1 uppercase letter");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) errors.push("Must contain at least 1 special character");
  return errors;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "12+ characters", pass: password.length >= 12 },
    { label: "1 uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "1 special character", pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
    { label: "1 lowercase letter", pass: /[a-z]/.test(password) },
    { label: "1 number", pass: /[0-9]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const strength = passed <= 2 ? "Weak" : passed <= 3 ? "Fair" : passed <= 4 ? "Good" : "Strong";
  const color = passed <= 2 ? "bg-red-500" : passed <= 3 ? "bg-yellow-500" : passed <= 4 ? "bg-blue-500" : "bg-green-500";

  return (
    <div className="space-y-2 mt-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= passed ? color : "bg-zinc-700"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{password.length > 0 ? `Strength: ${strength}` : ""}</p>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className={`text-xs flex items-center gap-1.5 ${c.pass ? "text-green-400" : "text-zinc-500"}`}>
            {c.pass ? "✅" : "○"} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SetupAccountInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";

  const tokenInfo = useQuery(api.auth.verifyResetToken, token ? { token } : "skip") as { email: string; name: string } | null | undefined;
  const resetPassword = useMutation(api.auth.resetPasswordWithToken);

  // Track verified state so reactive query doesn't show "expired" after password set
  const verifiedRef = useRef<{ email: string; name: string } | null>(null);
  if (tokenInfo && !verifiedRef.current) {
    verifiedRef.current = tokenInfo;
  }
  const verified = verifiedRef.current;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // SUCCESS first — before any token checks
  if (success) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <span className="text-5xl block mb-4">✅</span>
            <h1 className="text-xl font-bold mb-2">Account Ready!</h1>
            <p className="text-muted-foreground mb-6">Your password has been set. You can now log in.</p>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-orange-500 to-amber-600 w-full text-lg py-6">
                Log In Now →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <span className="text-5xl block mb-4">❌</span>
            <h1 className="text-xl font-bold mb-2">Invalid Link</h1>
            <p className="text-muted-foreground mb-4">This setup link is missing or invalid.</p>
            <Link href="/login" className="text-primary hover:underline">Go to Login →</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenInfo === undefined && !verified) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <span className="text-5xl block mb-4">⏰</span>
            <h1 className="text-xl font-bold mb-2">Link Expired</h1>
            <p className="text-muted-foreground mb-4">This setup link has expired. Please contact your admin for a new invite.</p>
            <Link href="/login" className="text-primary hover:underline">Go to Login →</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError("");
    const errors = validatePassword(password);
    if (errors.length > 0) { setError(errors[0]); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <span className="text-5xl block mb-3">🏗️</span>
            <h1 className="text-2xl font-bold">Welcome to OpsSlate</h1>
            <p className="text-muted-foreground mt-2">Hi <strong>{verified.name}</strong>, let&apos;s set up your account.</p>
          </div>

          <div className="bg-secondary/50 border border-border rounded-lg p-3 mb-6">
            <p className="text-xs text-muted-foreground">Your login email</p>
            <p className="font-medium text-lg">{verified.email}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Choose a Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Confirm Password</label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                <p className="text-xs text-green-400 mt-1">✅ Passwords match</p>
              )}
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={loading || validatePassword(password).length > 0 || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-lg py-6"
            >
              {loading ? "Setting up..." : "Create My Account →"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupAccountPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0b0f14] flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}><SetupAccountInner /></Suspense>;
}
