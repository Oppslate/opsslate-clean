"use client";

import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/login-form";
import { useEffect } from "react";

export default function SignupPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/";
    }
  }, [user, loading]);

  if (loading) return <div className="min-h-screen bg-[#0b0f14]" />;
  if (user) return null;

  return <LoginForm defaultMode="signup" direct />;
}
