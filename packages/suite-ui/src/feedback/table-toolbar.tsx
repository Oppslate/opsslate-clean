"use client";

import { Download, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  addLabel?: string;
  onExport?: () => void;
  children?: ReactNode;
}

export function TableToolbar({
  search,
  onSearchChange,
  onAdd,
  addLabel,
  onExport,
  children,
}: TableToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-64"
        />
        {children}
      </div>
      <div className="flex gap-2">
        {onExport && (
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        )}
        <Button type="button" onClick={onAdd}>
          <Plus aria-hidden="true" />
          {addLabel ?? "Add"}
        </Button>
      </div>
    </div>
  );
}

export function exportCSV(
  headers: string[],
  rows: string[][],
  filename: string,
) {
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
