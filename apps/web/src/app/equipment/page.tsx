
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

function EquipmentContent() {
  const { user } = useAuth();
  const equipment = useQuery(api.equipment.list, user ? { companyId: user.companyId } : "skip");
  const createEquip = useMutation(api.equipment.create);
  const updateEquip = useMutation(api.equipment.update);
  const removeEquip = useMutation(api.equipment.remove);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);

  const filtered = useMemo(() => {
    if (!equipment) return [];
    let r = equipment as Array<Record<string, unknown>>;
    if (search) { const q = search.toLowerCase(); r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q)); }
    if (filterStatus) r = r.filter((x) => (x.status ?? "Available") === filterStatus);
    return r;
  }, [equipment, search, filterStatus]);

  const equipmentTypes = [
    "Excavator", "Dozer", "Loader", "Skid Steer", "Crane", "Dump Truck", "Compactor", "Generator", "Pump",
  ];

  const fields: FieldDef[] = [
    { key: "name", label: "Equipment Name", required: true },
    { key: "type", label: "Type", type: "select", options: [
      ...equipmentTypes.map((t) => ({ label: t, value: t })),
      { label: "Other", value: "Other" },
    ]},
    {
      key: "customType",
      label: "Equipment Type",
      placeholder: "Type equipment category",
      showWhen: (values) => values.type === "Other",
    },
    { key: "serial", label: "Serial / Unit #" },
    { key: "hours", label: "Hours", type: "number" },
    { key: "nextDue", label: "Next Service Due", type: "date" },
    { key: "status", label: "Status", type: "select", options: [{ label: "Available", value: "Available" }, { label: "On Rent", value: "On Rent" }, { label: "In Service", value: "In Service" }, { label: "Down", value: "Down" }] },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    const normalizedType = values.type === "Other"
      ? (values.customType as string | undefined)?.trim() || "Other"
      : (values.type as string | undefined);

    if (modal?.mode === "edit" && modal.data) {
      const { _id, _creationTime, companyId, customType, ...rest } = values;
      await updateEquip({
        id: modal.data._id as Id<"equipment">,
        ...(rest as Record<string, string | number | undefined>),
        type: normalizedType,
      });
    } else if (user) {
      await createEquip({
        companyId: user.companyId,
        name: values.name as string,
        type: normalizedType,
        serial: values.serial as string,
        hours: values.hours as number,
        nextDue: values.nextDue as string,
      });
    }
  };

  const getModalInitialValues = () => {
    if (!modal?.data) return undefined;
    const currentType = modal.data.type as string | undefined;
    if (currentType && !equipmentTypes.includes(currentType) && currentType !== "Other") {
      return { ...modal.data, type: "Other", customType: currentType };
    }
    return modal.data;
  };

  const handleExport = () => {
    const headers = ["Name", "Type", "Serial", "Hours", "Next Service", "Status"];
    const rows = filtered.map((r) => [(r.name as string) ?? "", (r.type as string) ?? "", (r.serial as string) ?? "", String(r.hours ?? ""), (r.nextDue as string) ?? "", (r.status as string) ?? "Available"]);
    exportCSV(headers, rows, "equipment.csv");
  };

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">🔧 Equipment</h1>
      <p className="text-muted-foreground text-sm mb-4">Fleet inventory and maintenance tracking</p>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setModal({ mode: "create" })} addLabel="Add Equipment" onExport={handleExport}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="On Rent">On Rent</option>
          <option value="In Service">In Service</option>
          <option value="Down">Down</option>
        </select>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Serial / Unit #</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Next Service</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => {
            const overdue = r.nextDue && (r.nextDue as string) < new Date().toISOString().slice(0, 10);
            return (
              <TableRow key={r._id as string} className="cursor-pointer hover:bg-secondary/50" onClick={() => setModal({ mode: "edit", data: r })}>
                <TableCell className="font-medium">{(r.name as string) ?? ""}</TableCell>
                <TableCell>{(r.type as string) ?? ""}</TableCell>
                <TableCell>{(r.serial as string) ?? ""}</TableCell>
                <TableCell>{r.hours != null ? String(r.hours) : ""}</TableCell>
                <TableCell className={overdue ? "text-destructive font-bold" : ""}>{(r.nextDue as string) ?? ""}{overdue ? " ⚠️" : ""}</TableCell>
                <TableCell><Badge variant={(r.status as string) === "Down" ? "destructive" : "secondary"}>{(r.status as string) ?? "Available"}</Badge></TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (<tr><td colSpan={6}><EmptyState icon="🔧" title="No equipment yet" description="Add your fleet and rental equipment." actionLabel="+ Add First Equipment" onAction={() => setModal({ mode: "create" })} /></td></tr>)}
        </TableBody>
      </Table>

      {modal && (
        <CrudModal
          title={modal.mode === "edit" ? "Edit Equipment" : "Add Equipment"}
          fields={fields}
          initialValues={getModalInitialValues()}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.mode === "edit" ? async () => { await removeEquip({ id: modal.data!._id as Id<"equipment"> }); } : undefined}
        />
      )}
    </div>
  );
}

export default function EquipmentPage() {
  return <AppShell><EquipmentContent /></AppShell>;
}
