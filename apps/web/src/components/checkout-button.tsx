"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface CheckoutButtonProps {
  priceId: string;
  companyId?: string;
  email?: string;
  children: ReactNode;
  variant?: "default" | "outline";
  className?: string;
}

export function CheckoutButton({
  priceId,
  companyId,
  email,
  children,
  variant = "default",
  className,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const onCheckout = async () => {
    try {
      setLoading(true);
      const fallbackEmail = email ?? window.prompt("Enter your email for checkout:") ?? undefined;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          email: fallbackEmail,
          companyId,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to start checkout");
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      alert("Unable to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onCheckout} disabled={loading} variant={variant} className={className}>
      {loading ? "Redirecting..." : children}
    </Button>
  );
}
