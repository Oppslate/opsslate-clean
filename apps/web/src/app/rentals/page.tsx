
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrudModal, FieldDef } from "@/components/crud-modal";
import { SkeletonTable } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

function RentalsContent() {
  const { user } = useAuth();
  const rentals = useQuery(api.rentals.listByCompany, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const equipment = useQuery(api.equipment.list, user ? { companyId: user.companyId } : "skip");
  const vendors = useQuery(api.vendors.list, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const createRental = useMutation(api.rentals.create);
  const updateRental = useMutation(api.rentals.update);
  const offRent = useMutation(api.rentals.offRent);
  const createEquipment = useMutation(api.equipment.create);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);

  const filtered = useMemo(() => {
    if (!rentals) return [];
    let r = rentals;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
    }
    if (filterProject) r = r.filter((x) => x.projectId === filterProject);
    if (filterStatus) r = r.filter((x) => (x.status ?? "On Rent") === filterStatus);
    return r;
  }, [rentals, search, filterProject, filterStatus]);

  const fields: FieldDef[] = [
    { key: "projectId", label: "Project", type: "select", required: true, options: (projects ?? []).map((p) => ({ label: p.name, value: p._id })) },
    { key: "equipmentId", label: "Equipment", type: "select-or-custom", required: true, options: (equipment ?? []).map((e) => ({ label: e.name, value: e._id })) },
    { key: "vendor", label: "Vendor", type: "select", options: (vendors ?? []).map((v) => ({ label: String(v.name ?? ""), value: String(v.name ?? "") })) },
    { key: "po", label: "PO #" },
    { key: "rateType", label: "Rate Type", type: "select", options: [{ label: "Daily", value: "Daily" }, { label: "Weekly", value: "Weekly" }, { label: "Monthly", value: "Monthly" }] },
    { key: "rate", label: "Rate ($)", type: "number" },
    { key: "qty", label: "Qty", type: "number" },
    { key: "start", label: "Start Date", type: "date" },
    { key: "end", label: "End Date", type: "date" },
    { key: "status", label: "Status", type: "select", options: [{ label: "On Rent", value: "On Rent" }, { label: "Off Rent", value: "Off Rent" }, { label: "Returned", value: "Returned" }] },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    // If equipment is a custom name (not an existing ID), create it first
    let finalValues = { ...values };
    delete finalValues[`__equipmentId_other`];
    const eqVal = finalValues.equipmentId as string;
    const isExistingEquipment = (equipment ?? []).some((e) => e._id === eqVal);
    if (eqVal && !isExistingEquipment && user) {
      const newEqId = await createEquipment({ companyId: user.companyId, name: eqVal });
      finalValues.equipmentId = newEqId;
    }
    if (modal?.mode === "edit" && modal.data) {
      // Whitelist only fields the update mutation accepts
      const allowedKeys = ["vendor", "po", "start", "end", "rateType", "rate", "qty", "deliveryFee", "pickupFee", "status", "lastVerified"];
      const cleaned: Record<string, unknown> = {};
      for (const k of allowedKeys) {
        if (finalValues[k] !== undefined) cleaned[k] = finalValues[k];
      }
      await updateRental({ id: modal.data._id as Id<"rentals">, ...cleaned as Record<string, string | number | undefined> });
    } else {
      const cleanedCreate = Object.fromEntries(Object.entries(finalValues).filter(([k]) => !k.startsWith("__")));
      await createRental(cleanedCreate as Parameters<typeof createRental>[0]);
    }
  };

  const handleExport = () => {
    const headers = ["Project", "Equipment", "Vendor", "PO", "Rate Type", "Rate", "Start", "End", "Status", "Days Rented", "Total Cost"];
    const rows = filtered.map((r) => [
      (r.projectName as string) ?? "", (r.equipmentName as string) ?? "", (r.vendor as string) ?? "",
      (r.po as string) ?? "", (r.rateType as string) ?? "", String(r.rate ?? ""),
      (r.start as string) ?? "", (r.end as string) ?? "", (r.status as string) ?? "On Rent",
      r.daysRented ? String(r.daysRented) : "", r.totalCost ? String(r.totalCost) : "",
    ]);
    exportCSV(headers, rows, "rentals.csv");
  };

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">🏗️ Rentals</h1>
      <p className="text-muted-foreground text-sm mb-4">Track all equipment rentals across projects</p>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setModal({ mode: "create" })} addLabel="Add Rental" onExport={handleExport}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="On Rent">On Rent</option>
          <option value="Off Rent">Off Rent</option>
          <option value="Returned">Returned</option>
        </select>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Equipment</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>PO</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>Days Rented</TableHead>
            <TableHead>Total Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r._id as string} className="cursor-pointer hover:bg-secondary/50" onClick={() => setModal({ mode: "edit", data: r })}>
              <TableCell className="font-medium">{(r.projectName as string) ?? ""}</TableCell>
              <TableCell>{(r.equipmentName as string) ?? ""}</TableCell>
              <TableCell>{(r.vendor as string) ?? ""}</TableCell>
              <TableCell>{(r.po as string) ?? ""}</TableCell>
              <TableCell>
                {r.rateType as string} ${r.rate as number}
                {((r.deliveryFee as number) || (r.pickupFee as number)) ? (
                  <span className="text-muted-foreground text-xs block">
                    Total: ${((r.rate as number) ?? 0) + ((r.deliveryFee as number) ?? 0) + ((r.pickupFee as number) ?? 0)}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{(r.start as string) ?? ""}</TableCell>
              <TableCell>{(r.end as string) ?? ""}</TableCell>
              <TableCell><Badge variant={(r.status ?? "On Rent") === "On Rent" ? "default" : "secondary"}>{(r.status as string) ?? "On Rent"}</Badge></TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {(r.status ?? "On Rent") === "On Rent" && (
                  <Button variant="destructive" size="sm" onClick={() => offRent({ id: r._id as Id<"rentals"> })}>
                    Off Rent
                  </Button>
                )}
              </TableCell>
              <TableCell>{(() => {
                if (r.status !== "Off Rent" || !r.start || !r.end) return "—";
                const days = Math.max(1, Math.ceil((new Date(r.end as string).getTime() - new Date(r.start as string).getTime()) / (1000 * 60 * 60 * 24)));
                return <span className="font-medium">{days}</span>;
              })()}</TableCell>
              <TableCell>{(() => {
                if (r.status !== "Off Rent" || !r.start || !r.end || !r.rate) return "—";
                const days = Math.max(1, Math.ceil((new Date(r.end as string).getTime() - new Date(r.start as string).getTime()) / (1000 * 60 * 60 * 24)));
                const qty = (r.qty as number) ?? 1;
                const rate = r.rate as number;
                let cost = 0;
                if (r.rateType === "Weekly") cost = Math.ceil(days / 7) * rate * qty;
                else if (r.rateType === "Monthly") cost = Math.ceil(days / 30) * rate * qty;
                else cost = days * rate * qty;
                return <span className="font-semibold text-green-400">${cost.toLocaleString()}</span>;
              })()}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (<tr><td colSpan={11}><EmptyState icon="🏗️" title="No rentals yet" description="Track equipment rentals across all your projects." actionLabel="+ Add First Rental" onAction={() => setModal({ mode: "create" })} /></td></tr>)}
        </TableBody>
      </Table>

      {modal && (
        <CrudModal
          title={modal.mode === "edit" ? "Edit Rental" : "Add Rental"}
          fields={fields}
          initialValues={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function RentalsPage() {
  return <AppShell><RentalsContent /></AppShell>;
}
