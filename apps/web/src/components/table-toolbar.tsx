"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TableToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onAdd: () => void;
  addLabel?: string;
  onExport?: () => void;
  children?: React.ReactNode;
}

export function TableToolbar({ search, onSearchChange, onAdd, addLabel, onExport, children }: TableToolbarProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-64"
        />
        {children}
      </div>
      <div className="flex gap-2">
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>📥 Export CSV</Button>
        )}
        <Button onClick={onAdd}>+ {addLabel ?? "Add"}</Button>
      </div>
    </div>
  );
}

export function exportCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
