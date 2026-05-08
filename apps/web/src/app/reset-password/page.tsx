"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "12+ characters", pass: password.length >= 12 },
    { label: "1 uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "1 special character", pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const color = passed <= 1 ? "bg-red-500" : passed === 2 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-2 mt-3">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= passed ? color : "bg-zinc-700"}`} />
        ))}
      </div>
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

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";

  const tokenInfo = useQuery(api.auth.verifyResetToken, token ? { token } : "skip") as { email: string; name: string } | null | undefined;
  const resetPassword = useMutation(api.auth.resetPasswordWithToken);

  // Track verified state so reactive query clearing the token doesn't show "expired"
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

  // SUCCESS — show first, before any other checks
  if (success) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <span className="text-5xl block mb-4">✅</span>
            <h1 className="text-xl font-bold mb-2">Password Updated!</h1>
            <p className="text-muted-foreground mb-6">Your password has been changed successfully.</p>
            <Link href="/login"><Button className="bg-gradient-to-r from-orange-500 to-amber-600 w-full text-lg py-6">Log In Now →</Button></Link>
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
            <p className="text-muted-foreground mb-4">This reset link is invalid.</p>
            <Link href="/forgot-password" className="text-primary hover:underline">Request a new reset link →</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Still loading from Convex
  if (tokenInfo === undefined && !verified) {
    return <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>;
  }

  // Token invalid/expired AND we never verified it
  if (!verified) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <span className="text-5xl block mb-4">⏰</span>
            <h1 className="text-xl font-bold mb-2">Link Expired</h1>
            <p className="text-muted-foreground mb-4">This reset link has expired.</p>
            <Link href="/forgot-password" className="text-primary hover:underline">Request a new one →</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const valid = password.length >= 12 && /[A-Z]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) && password === confirmPassword;

  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <span className="text-5xl block mb-3">🔒</span>
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground mt-2">Choose a new password for <strong>{verified.email}</strong></p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">New Password</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter new password..." value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">{showPassword ? "🙈" : "👁️"}</button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Confirm Password</label>
              <Input type={showPassword ? "text" : "password"} placeholder="Confirm password..." value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {confirmPassword && password !== confirmPassword && <p className="text-xs text-red-400 mt-1">Passwords do not match</p>}
              {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && <p className="text-xs text-green-400 mt-1">✅ Match</p>}
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
            <Button onClick={async () => {
              setError(""); setLoading(true);
              try { await resetPassword({ token, newPassword: password }); setSuccess(true); }
              catch (e: unknown) { setError((e as Error).message); }
              finally { setLoading(false); }
            }} disabled={loading || !valid} className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-lg py-6">
              {loading ? "Updating..." : "Reset Password →"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-6">
            <Link href="/login" className="text-primary hover:underline">Back to Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0b0f14] flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}><ResetPasswordInner /></Suspense>;
}
