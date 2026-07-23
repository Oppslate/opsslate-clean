import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@opsslate/suite-ui/card";

const messages: Record<string, string> = {
  invalid:
    "Your OpsSlate session could not be verified. Sign in to OpsSlate again, then return to Helios.",
  missing:
    "No shared OpsSlate session was found. Sign in to OpsSlate, then return to Helios.",
  unavailable:
    "Secure Helios access is not available yet. An administrator must complete the Foundation 3A identity configuration.",
};

export function HeliosAccessBoundary({ state }: { state?: string }) {
  const opsSlateUrl =
    process.env.NEXT_PUBLIC_OPSSLATE_APP_URL || "https://opsslate.app";
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
          <CardTitle>Authenticated OpsSlate access required</CardTitle>
          <CardDescription>
            Helios uses a verified OpsSlate identity and derives company access
            on the server. Company identifiers are never accepted from the
            browser as authorization.
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
            <form
              action="/api/auth/session?returnTo=/"
              method="post"
              className="contents"
            >
              <Button type="submit">Verify OpsSlate session</Button>
            </form>
            <Button asChild variant="outline">
              <a href={`${opsSlateUrl.replace(/\/$/, "")}/login`}>
                Go to OpsSlate sign in
              </a>
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Helios does not accept credentials directly and does not create
            accounts automatically.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
