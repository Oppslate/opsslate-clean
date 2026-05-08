"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "../../convex/_generated/dataModel";

const PROJECT_TYPES = [
  { label: "Commercial", icon: "🏢" },
  { label: "Residential", icon: "🏠" },
  { label: "Civil/Infrastructure", icon: "🛣️" },
  { label: "Industrial", icon: "🏭" },
  { label: "Renovation", icon: "🔨" },
  { label: "Concrete", icon: "🧱" },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const createProject = useMutation(api.projects.create);
  const [step, setStep] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async () => {
    if (!projectName.trim() || !user) return;
    setLoading(true);
    try {
      await createProject({
        companyId: user.companyId,
        name: projectName.trim(),
        type: projectType || undefined,
        location: location || undefined,
      });
      setStep(3);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {step === 0 && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="text-6xl mb-4">🏗️</div>
            <h1 className="text-3xl font-bold text-white">Welcome to OpsSlate</h1>
            <p className="text-muted-foreground text-lg">
              The AI-powered construction management platform that replaces Procore at a fraction of the cost.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { icon: "📝", label: "Daily Logs" },
                { icon: "🤖", label: "AI Autopilot" },
                { icon: "📊", label: "40+ Modules" },
              ].map((f) => (
                <div key={f.label} className="bg-secondary/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                </div>
              ))}
            </div>
            <Button size="lg" className="mt-6 px-8" onClick={() => setStep(1)}>
              Get Started →
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Step 1 of 2</p>
              <h2 className="text-2xl font-bold text-white">What type of work do you do?</h2>
              <p className="text-muted-foreground text-sm mt-1">This helps us customize your experience.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => { setProjectType(t.label); setStep(2); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    projectType === t.label
                      ? "border-primary bg-primary/10 text-white"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:text-white"
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Skip →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Step 2 of 2</p>
              <h2 className="text-2xl font-bold text-white">Create your first project</h2>
              <p className="text-muted-foreground text-sm mt-1">You can always add more later.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white block mb-1.5">Project Name *</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Downtown Office Renovation"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white block mb-1.5">Location</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 123 Main St, Buffalo NY"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button
                className="flex-1"
                onClick={handleCreateProject}
                disabled={!projectName.trim() || loading}
              >
                {loading ? "Creating..." : "Create Project →"}
              </Button>
            </div>
            <button
              onClick={onComplete}
              className="text-sm text-muted-foreground hover:text-primary block text-center w-full"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white">You&apos;re all set!</h2>
            <p className="text-muted-foreground text-lg">
              Your project <span className="text-white font-semibold">&quot;{projectName}&quot;</span> is ready. Start by adding a daily log or exploring the AI tools.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: "📝", label: "Add Daily Log", desc: "Record today's work" },
                { icon: "🤖", label: "Try AI Autopilot", desc: "Let AI plan your project" },
                { icon: "👷", label: "Add Crew", desc: "Set up your team" },
                { icon: "📷", label: "Upload Photos", desc: "Document the site" },
              ].map((a) => (
                <div key={a.label} className="bg-secondary/50 rounded-xl p-4 text-left">
                  <div className="text-xl mb-1">{a.icon}</div>
                  <div className="text-sm font-medium text-white">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
              ))}
            </div>
            <Button size="lg" className="mt-4 px-8" onClick={onComplete}>
              Go to Dashboard →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
