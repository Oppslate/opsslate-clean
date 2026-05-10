"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FeedbackWidget() {
  const { user } = useAuth();
  const submitFeedback = useMutation(api.feedback.submit);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const openFeedback = () => setOpen(true);
    window.addEventListener("opsslate:open-feedback", openFeedback);
    return () => window.removeEventListener("opsslate:open-feedback", openFeedback);
  }, []);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    await submitFeedback({
      companyId: user.companyId,
      userName: user.name,
      category,
      message: message.trim(),
    });
    setMessage("");
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setOpen(false); }, 2000);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="hidden"
        title="Send Feedback"
      >
        💬
      </button>

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3">
          <h3 className="font-bold text-sm">Send Feedback</h3>
          <p className="text-xs text-muted-foreground">Your feedback goes directly to the dev team and gets reviewed automatically.</p>

          <select
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="general">General</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="ui">UI/UX Improvement</option>
            <option value="data">Data / Calculations</option>
            <option value="workflow">Workflow Issue</option>
          </select>

          <Textarea
            placeholder="What's on your mind? Describe the issue or suggestion..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] text-sm"
          />

          {submitted ? (
            <p className="text-sm text-green-400 font-medium">✅ Thanks! We&apos;ll review this shortly.</p>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1" disabled={!message.trim()}>
                Submit
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
