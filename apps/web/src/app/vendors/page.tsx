
"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CrudModal, FieldDef } from "@/components/crud-modal";
import { EmptyState } from "@/components/empty-state";
import { TableToolbar, exportCSV } from "@/components/table-toolbar";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

function VendorsContent() {
  const { user } = useAuth();
  const vendors = useQuery(api.vendors.list, user ? { companyId: user.companyId } : "skip");
  const createVendor = useMutation(api.vendors.create);
  const updateVendor = useMutation(api.vendors.update);
  const removeVendor = useMutation(api.vendors.remove);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; data?: Record<string, unknown> } | null>(null);
  // Load contacts to show which projects each vendor is on
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId as Id<"companies"> } : "skip");

  const categories = useMemo(() => {
    if (!vendors) return [];
    return [...new Set(vendors.map((v) => v.category).filter(Boolean))];
  }, [vendors]);

  const filtered = useMemo(() => {
    if (!vendors) return [];
    let r = vendors as Array<Record<string, unknown>>;
    if (search) { const q = search.toLowerCase(); r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q)); }
    if (filterCategory) r = r.filter((x) => x.category === filterCategory);
    return r;
  }, [vendors, search, filterCategory]);

  const vendorCategories = [
    "General Contractor", "Concrete Supplier", "Equipment Rental", "Aggregate/Materials", "Electrical",
    "Plumbing", "Excavation", "Trucking/Hauling", "Survey", "Testing/Lab",
  ];

  const fields: FieldDef[] = [
    { key: "name", label: "Company Name", required: true },
    { key: "category", label: "Category", type: "select", options: [
      ...vendorCategories.map((c) => ({ label: c, value: c })),
      { label: "Other", value: "Other" },
    ]},
    {
      key: "customCategory",
      label: "Vendor Category",
      placeholder: "Type custom category",
      showWhen: (values) => values.category === "Other",
    },
    { key: "contactName", label: "Contact Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "emergency", label: "Emergency Contact" },
    { key: "rating", label: "Rating (1-5)", type: "select", options: [
      { label: "⭐ 1", value: "1" }, { label: "⭐⭐ 2", value: "2" }, { label: "⭐⭐⭐ 3", value: "3" },
      { label: "⭐⭐⭐⭐ 4", value: "4" }, { label: "⭐⭐⭐⭐⭐ 5", value: "5" },
    ]},
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const handleSave = async (values: Record<string, unknown>) => {
    const normalizedCategory = values.category === "Other"
      ? (values.customCategory as string | undefined)?.trim() || "Other"
      : (values.category as string | undefined);

    if (modal?.mode === "edit" && modal.data) {
      const { _id, _creationTime, companyId, customCategory, ...rest } = values;
      await updateVendor({
        id: modal.data._id as Id<"vendors">,
        ...(rest as Record<string, string | undefined>),
        category: normalizedCategory,
      });
    } else if (user) {
      await createVendor({
        companyId: user.companyId,
        name: (values.name as string) ?? "",
        category: normalizedCategory,
        contactName: values.contactName as string,
        phone: values.phone as string,
        email: values.email as string,
        emergency: values.emergency as string,
        notes: values.notes as string,
      });
    }
  };

  const getModalInitialValues = () => {
    if (!modal?.data) return undefined;
    const currentCategory = modal.data.category as string | undefined;
    if (currentCategory && !vendorCategories.includes(currentCategory) && currentCategory !== "Other") {
      return { ...modal.data, category: "Other", customCategory: currentCategory };
    }
    return modal.data;
  };

  const handleExport = () => {
    const headers = ["Name", "Category", "Contact", "Phone", "Email", "Emergency", "Notes"];
    const rows = filtered.map((r) => [(r.name as string) ?? "", (r.category as string) ?? "", (r.contactName as string) ?? "", (r.phone as string) ?? "", (r.email as string) ?? "", (r.emergency as string) ?? "", (r.notes as string) ?? ""]);
    exportCSV(headers, rows, "vendors.csv");
  };

  return (
    <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mb-1">🏢 Vendors</h1>
      <p className="text-muted-foreground text-sm mb-4">Master contact directory — add people here and pull them into any project</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline">{(vendors || []).length} total contacts</Badge>
        {categories.length > 0 && <Badge variant="secondary">{categories.length} categories</Badge>}
      </div>

      <TableToolbar search={search} onSearchChange={setSearch} onAdd={() => setModal({ mode: "create" })} addLabel="Add Vendor" onExport={handleExport}>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (<option key={c} value={c!}>{c}</option>))}
        </select>
      </TableToolbar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Emergency</TableHead>
            <TableHead>Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r._id as string} className="cursor-pointer hover:bg-secondary/50" onClick={() => setModal({ mode: "edit", data: r })}>
              <TableCell className="font-medium">{(r.name as string) ?? ""}</TableCell>
              <TableCell><Badge variant="secondary">{(r.category as string) ?? ""}</Badge></TableCell>
              <TableCell>{(r.contactName as string) ?? ""}</TableCell>
              <TableCell>{r.phone ? <a href={`tel:${r.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{r.phone as string}</a> : ""}</TableCell>
              <TableCell>{r.email ? <a href={`mailto:${r.email}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{r.email as string}</a> : ""}</TableCell>
              <TableCell>{r.emergency ? <a href={`tel:${r.emergency}`} className="text-destructive hover:underline" onClick={(e) => e.stopPropagation()}>📞 {r.emergency as string}</a> : ""}</TableCell>
              <TableCell>{r.rating ? "⭐".repeat(Math.min(5, r.rating as number)) : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (<tr><td colSpan={6}><EmptyState icon="🏢" title="No vendors yet" description="Build your vendor and supplier contact directory." actionLabel="+ Add First Vendor" onAction={() => setModal({ mode: "create" })} /></td></tr>)}
        </TableBody>
      </Table>

      {modal && (
        <CrudModal
          title={modal.mode === "edit" ? "Edit Vendor" : "Add Vendor"}
          fields={fields}
          initialValues={getModalInitialValues()}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.mode === "edit" ? async () => { await removeVendor({ id: modal.data!._id as Id<"vendors"> }); } : undefined}
        />
      )}
    </div>
  );
}

export default function VendorsPage() {
  return <AppShell><VendorsContent /></AppShell>;
}
