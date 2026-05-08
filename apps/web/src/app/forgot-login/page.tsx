"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function ForgotLoginPage() {
  const [searchName, setSearchName] = useState("");
  const [searching, setSearching] = useState(false);

  const results = useQuery(
    api.auth.lookupAccount,
    searching && searchName.trim() ? { name: searchName.trim() } : "skip"
  ) as Array<{ email: string; name: string }> | undefined;

  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <span className="text-5xl block mb-3">👤</span>
            <h1 className="text-2xl font-bold">Find Your Account</h1>
            <p className="text-muted-foreground mt-2">Enter your name to look up your login email.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Your Name</label>
              <Input
                type="text"
                placeholder="Enter your name..."
                value={searchName}
                onChange={(e) => { setSearchName(e.target.value); setSearching(false); }}
                onKeyDown={(e) => e.key === "Enter" && setSearching(true)}
              />
            </div>
            <Button onClick={() => setSearching(true)} disabled={!searchName.trim()} className="w-full bg-gradient-to-r from-orange-500 to-amber-600">
              Search →
            </Button>

            {searching && results !== undefined && (
              <div className="mt-4">
                {results.length === 0 ? (
                  <div className="bg-secondary/50 border border-border rounded-lg p-4 text-center">
                    <p className="text-muted-foreground">No accounts found for &quot;{searchName}&quot;</p>
                    <p className="text-xs text-muted-foreground mt-2">Contact your admin if you need help.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Found {results.length} account{results.length > 1 ? "s" : ""}:</p>
                    {results.map((r, i) => (
                      <div key={i} className="bg-secondary/50 border border-border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-sm text-muted-foreground">{r.email}</p>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2">
                      Email is partially hidden for security. If you recognize your account, go to{" "}
                      <Link href="/forgot-password" className="text-primary hover:underline">Forgot Password</Link>{" "}
                      to reset it.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-center mt-6 space-y-2">
            <Link href="/forgot-password" className="text-primary hover:underline text-sm block">Forgot your password?</Link>
            <Link href="/login" className="text-muted-foreground hover:underline text-sm block">Back to Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
