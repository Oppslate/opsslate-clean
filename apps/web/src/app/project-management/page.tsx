"use client";

import { ProductSalesPage } from "@/components/product-sales-page";
import { suiteApps } from "@/lib/suite-apps";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export default function ProjectManagementSalesPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) window.location.replace("/");
  }, [loading, user]);

  if (loading || user) {
    return (
      <div className="min-h-screen bg-[#050607] text-white">
        <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-white/60">
          Opening Project Management...
        </div>
      </div>
    );
  }

  return <ProductSalesPage app={suiteApps.find((app) => app.key === "projectManagement")!} />;
}
