import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@opsslate/suite-ui/card";
import Link from "next/link";

const messages: Record<string, string> = {
  unavailable:
    "Secure Helios access is temporarily unavailable. Please try again.",
};

export function HeliosAccessBoundary({ state }: { state?: string }) {
  const message = state ? messages[state] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div>
            <Badge
              variant="outline"
              className="mb-3 border-orange-500/35 text-orange-300"
            >
              Helios
            </Badge>
          </div>
          <CardTitle>Sign in to Helios</CardTitle>
          <CardDescription>
            Helios is an independent estimating application with its own
            accounts, companies, roles, and secure sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <p
              className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"
              role="alert"
            >
              {message}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">Create a Helios account</Link>
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Your company access is derived on the server from your verified
            Helios membership. OpsSlate credentials are not used.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
