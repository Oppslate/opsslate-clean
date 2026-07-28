import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { ArrowRight, DraftingCompass } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HeliosShell } from "@/components/helios-shell";
import { getCockpit } from "@/lib/helios-data";
import { formatDate } from "@/lib/format";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function CivilGeometryProjectsPage() {
  const principal = await readHeliosPrincipal();
  if (!principal) redirect("/sign-in?redirect_url=%2Fcivil-geometry");
  const data = await getCockpit(principal);
  return (
    <HeliosShell principal={principal}>
      <div className="space-y-5">
        <header>
          <Badge variant="outline" className="mb-2 border-orange-500/35 text-orange-300"><DraftingCompass aria-hidden="true" />Euclid Model</Badge>
          <h1 className="text-3xl font-bold leading-9">Civil Geometry</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">Select a project to review its traceable horizontal control, vertical profiles, structures, engineering conflicts, and quantity readiness.</p>
        </header>
        <Card>
          <CardHeader><CardTitle>Preconstruction projects</CardTitle><CardDescription>The Euclid cockpit is read only and never publishes estimate quantities.</CardDescription></CardHeader>
          <CardContent>
            {data.recentProjects.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center text-center"><DraftingCompass className="mb-3 size-10 text-muted-foreground" aria-hidden="true" /><h2 className="font-semibold">No projects are available</h2><p className="mt-1 text-sm text-muted-foreground">Create a project and complete its engineering intake first.</p><Button asChild className="mt-4"><Link href="/">Return to cockpit</Link></Button></div> : <><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Owner</TableHead><TableHead>Bid date</TableHead><TableHead>Documents</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader><TableBody>{data.recentProjects.map((project) => <TableRow key={project.id}><TableCell className="min-w-64"><div className="font-medium">{project.name}</div><div className="text-xs text-muted-foreground">{project.projectNumber || "No project number"}</div></TableCell><TableCell>{project.ownerClient || "Not established"}</TableCell><TableCell>{formatDate(project.bidDate)}</TableCell><TableCell>{project.documentCount}</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/projects/${project.id}/civil-geometry`}>Open Euclid <ArrowRight aria-hidden="true" /></Link></Button></TableCell></TableRow>)}</TableBody></Table></div><div className="divide-y divide-border md:hidden">{data.recentProjects.map((project) => <Link key={project.id} href={`/projects/${project.id}/civil-geometry`} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><div className="truncate font-medium">{project.name}</div><div className="mt-1 text-xs text-muted-foreground">{formatDate(project.bidDate)} · {project.documentCount} documents</div></div><ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>)}</div></>}
          </CardContent>
        </Card>
      </div>
    </HeliosShell>
  );
}
