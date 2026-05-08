
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrudModal, FieldDef } from "@/components/crud-modal";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

function CrewContent() {
  const { user } = useAuth();
  const crew = useQuery(
    api.crew.listByCompany,
    user ? { companyId: user.companyId } : "skip"
  ) as Array<Record<string, unknown>> | undefined;
  const projects = useQuery(
    api.projects.list,
    user ? { companyId: user.companyId } : "skip"
  );
  const createMember = useMutation(api.crew.create);
  const updateMember = useMutation(api.crew.update);
  const sendNotification = useAction(api.crewEmail.sendNotification as any);
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    data?: Record<string, unknown>;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!crew) return [];
    let r = crew as Array<Record<string, unknown>>;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
    }
    if (filterProject)
      r = r.filter((x) => x.projectId === filterProject);
    return r;
  }, [crew, search, filterProject]);

  const fields: FieldDef[] = [
    {
      key: "projectId",
      label: "Project",
      type: "select",
      required: true,
      options: (projects ?? []).map((p) => ({
        label: p.name,
        value: p._id,
      })),
    },
    { key: "firstName", label: "First Name", required: true },
    { key: "lastName", label: "Last Name" },
    { key: "trade", label: "Trade" },
    { key: "task", label: "Task" },
    { key: "phaseCode", label: "Phase Code" },
    { key: "email", label: "Email" },
    { key: "start", label: "Start Date", type: "date" },
    { key: "end", label: "End Date", type: "date" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Completed", value: "Completed" },
        { label: "On Hold", value: "On Hold" },
      ],
    },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    if (modal?.mode === "edit" && modal.data) {
      const allowedKeys = [
        "firstName",
        "lastName",
        "trade",
        "task",
        "phaseCode",
        "email",
        "start",
        "end",
        "status",
      ];
      const cleaned: Record<string, unknown> = {};
      for (const k of allowedKeys) {
        if (values[k] !== undefined) cleaned[k] = values[k];
      }
      await updateMember({
        id: modal.data._id as Id<"crew">,
        ...(cleaned as Record<string, string | undefined>),
      });
    } else if (user) {
      await createMember({
        companyId: user.companyId,
        projectId: values.projectId as Id<"projects">,
        firstName: (values.firstName as string) || "Unknown",
        lastName: (values.lastName as string) || undefined,
        trade: (values.trade as string) || undefined,
        task: (values.task as string) || undefined,
        phaseCode: (values.phaseCode as string) || undefined,
        email: (values.email as string) || undefined,
        start: (values.start as string) || undefined,
        end: (values.end as string) || undefined,
      });
    }
  };

  const handleExport = () => {
    const headers = [
      "Project",
      "First Name",
      "Last Name",
      "Trade",
      "Task",
      "Phase Code",
      "Email",
      "Start",
      "End",
      "Status",
    ];
    const rows = filtered.map((r) => [
      (r.projectName as string) ?? "",
      (r.firstName as string) ?? "",
      (r.lastName as string) ?? "",
      (r.trade as string) ?? "",
      (r.task as string) ?? "",
      (r.phaseCode as string) ?? "",
      (r.email as string) ?? "",
      (r.start as string) ?? "",
      (r.end as string) ?? "",
      (r.status as string) ?? "Active",
    ]);
    exportCSV(headers, rows, "crew.csv");
  };

  if (!user) return null;

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">Crew</h1>
      <p className="text-muted-foreground text-sm mb-4">
        Assign crew members to projects with trades and tasks
      </p>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setModal({ mode: "create" })}
        addLabel="Add Crew Member"
        onExport={handleExport}
      >
        <select
          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {(projects ?? []).map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Trade</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Phase Code</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notify</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow
              key={r._id as string}
              className="cursor-pointer hover:bg-secondary/50"
              onClick={() => setModal({ mode: "edit", data: r })}
            >
              <TableCell className="font-medium">
                {(r.projectName as string) ?? ""}
              </TableCell>
              <TableCell>{(r.firstName as string) ?? ""}</TableCell>
              <TableCell>{(r.lastName as string) ?? ""}</TableCell>
              <TableCell>{(r.trade as string) ?? ""}</TableCell>
              <TableCell>{(r.task as string) ?? ""}</TableCell>
              <TableCell>{(r.phaseCode as string) || "-"}</TableCell>
              <TableCell>{(r.email as string) ?? ""}</TableCell>
              <TableCell>{(r.start as string) ?? ""}</TableCell>
              <TableCell>{(r.end as string) ?? ""}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    (r.status ?? "Active") === "Active"
                      ? "default"
                      : "secondary"
                  }
                >
                  {(r.status as string) ?? "Active"}
                </Badge>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                {(r.status ?? "Active") === "Active" && Boolean(r.email) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await sendNotification({ crewId: r._id as Id<"crew"> });
                        toast("Email sent to " + r.email, "success");
                      } catch (e) {
                        toast("Failed: " + (e as Error).message, "error");
                      }
                    }}
                  >
                    Send
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={11}>
                <EmptyState
                  icon="H"
                  title="No crew assigned"
                  description="Assign crew members to projects with their trade and task."
                  actionLabel="+ Add Crew Member"
                  onAction={() => setModal({ mode: "create" })}
                />
              </td>
            </tr>
          )}
        </TableBody>
      </Table>

      {modal && (
        <CrudModal
          title={
            modal.mode === "edit" ? "Edit Crew Member" : "Add Crew Member"
          }
          fields={fields}
          initialValues={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function CrewPage() {
  return (
    <AppShell>
      <CrewContent />
    </AppShell>
  );
}
