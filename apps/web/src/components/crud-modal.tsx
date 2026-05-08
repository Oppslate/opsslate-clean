"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | "select-or-custom" | "textarea" | "file";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  accept?: string;
  showWhen?: (values: Record<string, unknown>) => boolean;
}

interface CrudModalProps {
  title: string;
  fields: FieldDef[];
  initialValues?: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  onDelete?: () => Promise<void>;
}

export function CrudModal({ title, fields, initialValues, onSave, onClose, onDelete }: CrudModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialValues) setValues(initialValues);
  }, [initialValues]);

  const set = (key: string, val: unknown) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(values);
      toast(initialValues ? "Updated successfully" : "Created successfully", "success");
      onClose();
    } catch (e) {
      toast("Failed to save: " + (e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm("Delete this item? This cannot be undone.")) return;
    try {
      await onDelete();
      toast("Deleted", "success");
      onClose();
    } catch (e) {
      toast("Failed to delete: " + (e as Error).message, "error");
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl transition-colors">✕</button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-auto">
          {fields.filter((f) => (f.showWhen ? f.showWhen(values) : true)).map((f) => (
            <div key={f.key}>
              <label className="text-sm text-muted-foreground mb-1 block">
                {f.label}{f.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {f.type === "select-or-custom" ? (() => {
                const currentVal = (values[f.key] as string) ?? "";
                const isKnown = !currentVal || f.options?.some((o) => o.value === currentVal);
                const isOther = values[`__${f.key}_other`] === true || (!isKnown && currentVal !== "");
                return (
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                      value={isOther ? "__other__" : currentVal}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          set(`__${f.key}_other`, true);
                          set(f.key, "");
                        } else {
                          set(`__${f.key}_other`, false);
                          set(f.key, e.target.value);
                        }
                      }}
                    >
                      <option value="">Select...</option>
                      {f.options?.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      <option value="__other__">Other...</option>
                    </select>
                    {isOther && (
                      <Input
                        type="text"
                        value={currentVal}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder="Enter custom..."
                        className="flex-1 focus:ring-2 focus:ring-primary/50"
                      />
                    )}
                  </div>
                );
              })() : f.type === "select" ? (
                <select
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                >
                  <option value="">Select...</option>
                  {f.options?.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              ) : f.type === "textarea" ? (
                <Textarea
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="focus:ring-2 focus:ring-primary/50"
                />
              ) : f.type === "number" ? (
                <Input
                  type="number"
                  value={(values[f.key] as number) ?? ""}
                  onChange={(e) => set(f.key, e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={f.placeholder}
                  className="focus:ring-2 focus:ring-primary/50"
                />
              ) : f.type === "date" ? (
                <Input
                  type="date"
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  className="focus:ring-2 focus:ring-primary/50 cursor-pointer"
                />
              ) : f.type === "file" ? (
                <Input
                  type="file"
                  accept={f.accept}
                  onChange={(e) => set(f.key, e.target.files?.[0])}
                  className="focus:ring-2 focus:ring-primary/50"
                />
              ) : (
                <Input
                  type={f.type ?? "text"}
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="focus:ring-2 focus:ring-primary/50"
                />
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div>
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>🗑️ Delete</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
