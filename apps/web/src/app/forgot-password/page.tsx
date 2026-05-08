"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generateToken = useMutation(api.auth.generateResetToken);
  const sendResetEmail = useAction(api.authEmail.sendResetEmail);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setError(""); setLoading(true);
    try {
      const result = await generateToken({ email: email.trim() }) as { ok: boolean; token?: string; name?: string } | null;
      if (result?.token && result?.name) {
        await sendResetEmail({ email: email.trim(), name: result.name, resetToken: result.token });
      }
      // Always show success (don't reveal if email exists)
      setSent(true);
    } catch {
      setSent(true); // Still show success to not reveal email existence
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
        <Card className="bg-card border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <span className="text-5xl block mb-4">📧</span>
            <h1 className="text-xl font-bold mb-2">Check Your Email</h1>
            <p className="text-muted-foreground mb-2">If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.</p>
            <p className="text-muted-foreground text-sm mb-6">The link expires in 1 hour.</p>
            <div className="space-y-3">
              <Button variant="outline" onClick={() => { setSent(false); setEmail(""); }} className="w-full">Try a different email</Button>
              <Link href="/login" className="text-primary hover:underline text-sm block">Back to Login</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <span className="text-5xl block mb-3">🔑</span>
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="text-muted-foreground mt-2">Enter your email and we&apos;ll send you a reset link.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Email Address</label>
              <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button onClick={handleSubmit} disabled={loading || !email.trim()} className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-lg py-6">
              {loading ? "Sending..." : "Send Reset Link →"}
            </Button>
          </div>
          <div className="text-center mt-6 space-y-2">
            <Link href="/forgot-login" className="text-primary hover:underline text-sm block">Forgot your login email?</Link>
            <Link href="/login" className="text-muted-foreground hover:underline text-sm block">Back to Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
