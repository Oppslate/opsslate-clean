"use client";

import type {
  HeliosCockpitData,
  HeliosProjectInput,
} from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@opsslate/suite-ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@opsslate/suite-ui/dialog";
import { Input } from "@opsslate/suite-ui/input";
import { Label } from "@opsslate/suite-ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@opsslate/suite-ui/table";
import { Textarea } from "@opsslate/suite-ui/textarea";
import { useToast } from "@opsslate/suite-ui/toast";
import {
  ArrowRight,
  FileClock,
  FolderOpen,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { formatDate, formatTimestamp } from "@/lib/format";
import { StatusBadge } from "./status-badge";

function ProjectFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" maxLength={160} required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectNumber">Project number</Label>
        <Input id="projectNumber" name="projectNumber" maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bidDate">Bid date</Label>
        <Input id="bidDate" name="bidDate" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownerClient">Owner / client</Label>
        <Input id="ownerClient" name="ownerClient" maxLength={160} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="engineer">Engineer</Label>
        <Input id="engineer" name="engineer" maxLength={160} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" maxLength={240} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" maxLength={4000} rows={4} />
      </div>
    </div>
  );
}

export function Cockpit({ data }: { data: HeliosCockpitData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const input = values as HeliosProjectInput;
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Project could not be created.");
      toast("Project created.");
      router.push(`/projects/${payload.data.id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Project could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="outline" className="mb-2 border-orange-500/35 text-orange-300">
            Preconstruction
          </Badge>
          <h1 className="text-3xl font-bold leading-9">Helios cockpit</h1>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
            Open bid opportunities, document intake, and readiness for project intelligence.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New project
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.55fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent projects</CardTitle>
            <CardDescription>
              Helios opportunities remain separate from awarded OpsSlate projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentProjects.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
                <FolderOpen className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-semibold">No preconstruction projects yet</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Create the first project, then add bid documents from its intake screen.
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  New project
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Bid date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Intelligence</TableHead>
                        <TableHead className="text-right">Docs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentProjects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-medium hover:text-orange-300"
                            >
                              {project.name}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {project.projectNumber || project.ownerClient || "No project number"}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(project.bidDate)}</TableCell>
                          <TableCell><StatusBadge value={project.status} /></TableCell>
                          <TableCell><StatusBadge value={project.intelligenceStatus} /></TableCell>
                          <TableCell className="text-right">{project.documentCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y divide-border md:hidden">
                  {data.recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{project.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDate(project.bidDate)} · {project.documentCount} documents
                        </div>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active processing queue</CardTitle>
            <CardDescription>
              Documents securely stored and waiting for the approved 3C intelligence engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.processingQueue.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
                <FileClock className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-semibold">Nothing waiting</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Uploaded PDFs will appear here with their real intake status.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.processingQueue.map(({ document, projectName }) => (
                  <Link
                    key={document.id}
                    href={`/projects/${document.projectId}`}
                    className="block py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{document.fileName}</div>
                        <div className="truncate text-xs text-muted-foreground">{projectName}</div>
                      </div>
                      <StatusBadge value={document.status} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Updated {formatTimestamp(document.updatedAt)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={submitProject}>
            <DialogHeader>
              <DialogTitle>New Helios project</DialogTitle>
              <DialogDescription>
                Create a preconstruction opportunity. It will not become an OpsSlate project until a future approved handoff.
              </DialogDescription>
            </DialogHeader>
            <div className="py-5">
              <ProjectFields />
              {formError && (
                <p className="mt-4 text-sm text-red-300" role="alert">{formError}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
