import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { ArrowRight, Bot } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HeliosShell } from "@/components/helios-shell";
import { getCockpit } from "@/lib/helios-data";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function AskHeliosProjectsPage() {
  const principal = await readHeliosPrincipal();
  if (!principal) redirect("/sign-in?redirect_url=%2Fask");
  const data = await getCockpit(principal);
  return <HeliosShell principal={principal}>
    <div className="space-y-5">
      <header><Badge variant="outline" className="mb-2 border-orange-500/35 text-orange-300"><Bot aria-hidden="true" />Ask Helios</Badge><h1 className="text-3xl font-bold leading-9">Project conversations</h1><p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">Select a project to ask evidence-backed questions about documents, geometry, quantities, estimates, and risks.</p></header>
      <Card><CardHeader><CardTitle>Choose a project</CardTitle><CardDescription>Conversations remain attached to the project and bid-package revision.</CardDescription></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Project number</TableHead><TableHead>Intelligence</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader><TableBody>
          {data.recentProjects.map((project) => <TableRow key={project.id}><TableCell className="font-medium">{project.name}</TableCell><TableCell>{project.projectNumber || "Not established"}</TableCell><TableCell className="capitalize">{project.intelligenceStatus.replaceAll("_", " ")}</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link href={`/projects/${project.id}/ask`}>Ask Helios<ArrowRight aria-hidden="true" /></Link></Button></TableCell></TableRow>)}
        </TableBody></Table>
      </CardContent></Card>
    </div>
  </HeliosShell>;
}
