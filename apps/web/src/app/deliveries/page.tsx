
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { Badge } from "@opsslate/suite-ui/badge";
import { CrudModal, FieldDef } from "@/components/crud-modal";
import { SkeletonTable } from "@opsslate/suite-ui/skeleton";
import { EmptyState } from "@opsslate/suite-ui/empty-state";
import { TableToolbar, exportCSV } from "@opsslate/suite-ui/table-toolbar";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

function DeliveriesContent() {
  const { user } = useAuth();
  const deliveries = useQuery(api.deliveries.listByCompany, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const createDelivery = useMutation(api.deliveries.create);
  const updateDelivery = useMutation(api.deliveries.update);
  const removeDelivery = useMutation(api.deliveries.remove);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (!deliveries) return [];
    let r = deliveries;
    if (search) { const q = search.toLowerCase(); r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q)); }
    if (filterProject) r = r.filter((x) => x.projectId === filterProject);
    if (filterStatus) r = r.filter((x) => (x.status ?? "Scheduled") === filterStatus);
    return r;
  }, [deliveries, search, filterProject, filterStatus]);

  const fields: FieldDef[] = [
    { key: "projectId", label: "Project", type: "select", required: true, options: (projects ?? []).map((p) => ({ label: p.name, value: p._id })) },
    { key: "supplier", label: "Supplier" },
    { key: "material", label: "Material", required: true },
    { key: "po", label: "PO #" },
    { key: "eta", label: "ETA", type: "date" },
    { key: "status", label: "Status", type: "select", options: [{ label: "Scheduled", value: "Scheduled" }, { label: "In Transit", value: "In Transit" }, { label: "Delivered", value: "Delivered" }, { label: "Delayed", value: "Delayed" }, { label: "Cancelled", value: "Cancelled" }] },
    { key: "confirmed", label: "Confirmed Date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    if (modal?.mode === "edit" && modal.data) {
      const { projectId, projectName, _id, _creationTime, ...rest } = values;
      await updateDelivery({ id: modal.data._id as Id<"deliveries">, ...rest as Record<string, string | undefined> });
    } else {
      await createDelivery(values as Parameters<typeof createDelivery>[0]);
    }
  };

  const handleExport = () => {
    const headers = ["Project", "Supplier", "Material", "PO", "ETA", "Status", "Confirmed", "Notes"];
    const rows = filtered.map((r) => [(r.projectName as string) ?? "", (r.supplier as string) ?? "", (r.material as string) ?? "", (r.po as string) ?? "", (r.eta as string) ?? "", (r.status as string) ?? "Scheduled", (r.confirmed as string) ?? "", (r.notes as string) ?? ""]);
    exportCSV(headers, rows, "deliveries.csv");
  };

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">🚚 Deliveries</h1>
      <p className="text-muted-foreground text-sm mb-4">Track material deliveries and ETAs</p>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setModal({ mode: "create" })} addLabel="Add Delivery" onExport={handleExport}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
          <option value="Delayed">Delayed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>PO</TableHead>
            <TableHead>ETA</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => {
            const late = r.eta && (r.eta as string) < todayStr && r.status !== "Delivered";
            return (
              <TableRow key={r._id as string} className="cursor-pointer hover:bg-secondary/50" onClick={() => setModal({ mode: "edit", data: r })}>
                <TableCell>{(r.projectName as string) ?? ""}</TableCell>
                <TableCell className="font-medium">{(r.supplier as string) ?? ""}</TableCell>
                <TableCell>{(r.material as string) ?? ""}</TableCell>
                <TableCell>{(r.po as string) ?? ""}</TableCell>
                <TableCell className={late ? "text-destructive font-bold" : ""}>{(r.eta as string) ?? ""}{late ? " ⚠️ LATE" : ""}</TableCell>
                <TableCell><Badge variant={late ? "destructive" : r.status === "Delivered" ? "default" : "secondary"}>{(r.status as string) ?? "Scheduled"}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{(r.notes as string) ?? ""}</TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (<tr><td colSpan={7}><EmptyState icon="🚚" title="No deliveries yet" description="Track material deliveries and ETAs." actionLabel="+ Add First Delivery" onAction={() => setModal({ mode: "create" })} /></td></tr>)}
        </TableBody>
      </Table>

      {modal && (
        <CrudModal
          title={modal.mode === "edit" ? "Edit Delivery" : "Add Delivery"}
          fields={fields}
          initialValues={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.mode === "edit" ? async () => { await removeDelivery({ id: modal.data!._id as Id<"deliveries"> }); } : undefined}
        />
      )}
    </div>
  );
}

export default function DeliveriesPage() {
  return <AppShell><DeliveriesContent /></AppShell>;
}
