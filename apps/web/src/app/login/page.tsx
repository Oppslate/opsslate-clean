"use client";

import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/";
    }
  }, [user, loading]);

  if (loading) return <div className="min-h-screen bg-[#0b0f14]" />;
  if (user) return null;

  return <LoginForm direct />;
}
