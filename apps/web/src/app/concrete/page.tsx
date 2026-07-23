
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

function ConcreteContent() {
  const { user } = useAuth();
  const pours = useQuery(api.concrete.listByCompany, user ? { companyId: user.companyId } : "skip") as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const createPour = useMutation(api.concrete.create);
  const updatePour = useMutation(api.concrete.update);
  const removePour = useMutation(api.concrete.remove);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);

  const filtered = useMemo(() => {
    if (!pours) return [];
    let r = pours;
    if (search) { const q = search.toLowerCase(); r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q)); }
    if (filterProject) r = r.filter((x) => x.projectId === filterProject);
    if (filterStatus) r = r.filter((x) => (x.status ?? "Planned") === filterStatus);
    return r;
  }, [pours, search, filterProject, filterStatus]);

  const fields: FieldDef[] = [
    { key: "projectId", label: "Project", type: "select", required: true, options: (projects ?? []).map((p) => ({ label: p.name, value: p._id })) },
    { key: "date", label: "Pour Date", type: "date", required: true },
    { key: "pour", label: "Pour Name/Location" },
    { key: "cy", label: "Cubic Yards", type: "number" },
    { key: "mixDesign", label: "Mix Design" },
    { key: "supplier", label: "Supplier" },
    { key: "pump", label: "Pump Type" },
    { key: "crew", label: "Crew" },
    { key: "weatherRisk", label: "Weather Risk", type: "select", options: [{ label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" }] },
    { key: "status", label: "Status", type: "select", options: [{ label: "Planned", value: "Planned" }, { label: "Confirmed", value: "Confirmed" }, { label: "In Progress", value: "In Progress" }, { label: "Completed", value: "Completed" }, { label: "Cancelled", value: "Cancelled" }] },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    if (modal?.mode === "edit" && modal.data) {
      const { projectId, projectName, _id, _creationTime, ...rest } = values;
      await updatePour({ id: modal.data._id as Id<"concretePours">, ...rest as Record<string, string | number | undefined> });
    } else {
      await createPour(values as Parameters<typeof createPour>[0]);
    }
  };

  const handleExport = () => {
    const headers = ["Project", "Date", "Pour", "CY", "Mix", "Supplier", "Pump", "Crew", "Weather", "Status"];
    const rows = filtered.map((r) => [(r.projectName as string) ?? "", (r.date as string) ?? "", (r.pour as string) ?? "", String(r.cy ?? ""), (r.mixDesign as string) ?? "", (r.supplier as string) ?? "", (r.pump as string) ?? "", (r.crew as string) ?? "", (r.weatherRisk as string) ?? "", (r.status as string) ?? "Planned"]);
    exportCSV(headers, rows, "concrete-pours.csv");
  };

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">🧱 Concrete</h1>
      <p className="text-muted-foreground text-sm mb-4">Pour scheduling, tracking, and status</p>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setModal({ mode: "create" })} addLabel="Add Pour" onExport={handleExport}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
        </select>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Planned">Planned</option>
          <option value="Confirmed">Confirmed</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Pour</TableHead>
            <TableHead>CY</TableHead>
            <TableHead>Mix</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Pump</TableHead>
            <TableHead>Crew</TableHead>
            <TableHead>Weather</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r._id as string} className="cursor-pointer hover:bg-secondary/50" onClick={() => setModal({ mode: "edit", data: r })}>
              <TableCell>{(r.projectName as string) ?? ""}</TableCell>
              <TableCell className="font-medium">{(r.date as string) ?? ""}</TableCell>
              <TableCell>{(r.pour as string) ?? ""}</TableCell>
              <TableCell>{r.cy != null ? String(r.cy) : ""}</TableCell>
              <TableCell>{(r.mixDesign as string) ?? ""}</TableCell>
              <TableCell>{(r.supplier as string) ?? ""}</TableCell>
              <TableCell>{(r.pump as string) ?? ""}</TableCell>
              <TableCell>{(r.crew as string) ?? ""}</TableCell>
              <TableCell>{r.weatherRisk ? <Badge variant={(r.weatherRisk as string) === "High" ? "destructive" : "secondary"}>{r.weatherRisk as string}</Badge> : ""}</TableCell>
              <TableCell><Badge>{(r.status as string) ?? "Planned"}</Badge></TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (<tr><td colSpan={10}><EmptyState icon="🧱" title="No concrete pours yet" description="Schedule and track concrete pours across your projects." actionLabel="+ Schedule First Pour" onAction={() => setModal({ mode: "create" })} /></td></tr>)}
        </TableBody>
      </Table>

      {modal && (
        <CrudModal
          title={modal.mode === "edit" ? "Edit Pour" : "Add Pour"}
          fields={fields}
          initialValues={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.mode === "edit" ? async () => { await removePour({ id: modal.data!._id as Id<"concretePours"> }); } : undefined}
        />
      )}
    </div>
  );
}

export default function ConcretePage() {
  return <AppShell><ConcreteContent /></AppShell>;
}
