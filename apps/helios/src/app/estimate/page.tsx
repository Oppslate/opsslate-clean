import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@opsslate/suite-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@opsslate/suite-ui/table";
import { ArrowRight, Calculator } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HeliosShell } from "@/components/helios-shell";
import { getCockpit } from "@/lib/helios-data";
import { formatDate } from "@/lib/format";
import { readHeliosPrincipal } from "@/lib/helios-session";

export const dynamic = "force-dynamic";

export default async function EstimateProjectsPage() {
  const principal = await readHeliosPrincipal();
  if (!principal) notFound();
  const data = await getCockpit(principal);
  return (
    <HeliosShell principal={principal}>
      <div className="space-y-5">
        <header>
          <Badge variant="outline" className="mb-2 border-orange-500/35 text-orange-300">
            Foundation 3E
          </Badge>
          <h1 className="text-3xl font-bold leading-9">Estimate Builder</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
            Select an evidence-ready project to create or review its owner-pay-item estimate breakdown.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Preconstruction projects</CardTitle>
            <CardDescription>
              Estimate proposals remain unpriced until an estimator supplies or approves rates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentProjects.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <Calculator className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-semibold">No projects are available</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a project and complete document intelligence first.
                </p>
                <Button asChild className="mt-4"><Link href="/">Return to cockpit</Link></Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Bid date</TableHead>
                    <TableHead>Intelligence</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="min-w-64">
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project.projectNumber || "No project number"}
                        </div>
                      </TableCell>
                      <TableCell>{project.ownerClient || "Not established"}</TableCell>
                      <TableCell>{formatDate(project.bidDate)}</TableCell>
                      <TableCell className="capitalize">
                        {project.intelligenceStatus.replaceAll("_", " ")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/projects/${project.id}/estimate`}>
                            Open estimate <ArrowRight aria-hidden="true" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </HeliosShell>
  );
}
