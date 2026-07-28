"use client";

import type { HeliosAssistantMessage, HeliosAssistantWorkspace } from "@opsslate/helios-domain";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { Card } from "@opsslate/suite-ui/card";
import { Textarea } from "@opsslate/suite-ui/textarea";
import {
  ArrowLeft, Bot, Calculator, ExternalLink, FileSearch, LoaderCircle,
  MessageSquareText, Plus, Send, ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const QUICK_QUESTIONS = [
  "What are the most important unresolved project risks?",
  "Which estimate quantities still require review?",
  "Summarize the excavation quantities and their status.",
  "Which specifications control drainage work?",
];

function statusVariant(status?: HeliosAssistantMessage["answerStatus"]) {
  return status === "accepted" ? "secondary" : status === "conflicted" ? "destructive" : "outline";
}

export function AskHeliosWorkspace({ workspace }: { workspace: HeliosAssistantWorkspace }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const pending = workspace.messages.some((message) => message.status === "pending");
  const latestAnswer = useMemo(
    () => [...workspace.messages].reverse().find((message) => message.role === "assistant" && message.status === "completed"),
    [workspace.messages],
  );

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => router.refresh(), 2_500);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  async function ask(value: string) {
    const normalized = value.trim();
    if (!normalized || sending || pending) return;
    setSending(true); setError(undefined);
    try {
      const response = await fetch(`/api/projects/${workspace.project.id}/assistant`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized, threadId: workspace.activeThread?.id }),
      });
      const payload = await response.json() as { data?: { threadId: string }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "Ask Helios could not accept that question.");
      setQuestion("");
      router.push(`/projects/${workspace.project.id}/ask/${payload.data.threadId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ask Helios could not accept that question.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-orange-500/35 text-orange-300"><Bot aria-hidden="true" />Ask Helios</Badge>
            <Badge variant="secondary"><ShieldCheck aria-hidden="true" />Read only</Badge>
            {workspace.activeThread?.packageRevision && <Badge variant="outline">Revision {workspace.activeThread.packageRevision}</Badge>}
          </div>
          <h1 className="text-3xl font-bold leading-9">{workspace.project.name}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
            Ask about the documents, plan geometry, governed quantities, estimate, and risk record. Every supported answer cites the current project basis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href={`/projects/${workspace.project.id}`}><ArrowLeft aria-hidden="true" />Cockpit</Link></Button>
          <Button asChild><Link href={`/projects/${workspace.project.id}/ask`}><Plus aria-hidden="true" />New conversation</Link></Button>
        </div>
      </header>

      <div className="grid min-h-[720px] overflow-hidden rounded-xl border border-border bg-card/45 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="border-b border-border p-3 xl:border-b-0 xl:border-r" aria-label="Project conversations">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-semibold">Conversations</h2>
            <Badge variant="outline">{workspace.threads.length}</Badge>
          </div>
          <div className="space-y-1">
            {workspace.threads.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-xs leading-5 text-muted-foreground">Your project conversations will be saved here.</p>
            ) : workspace.threads.map((thread) => (
              <Button key={thread.id} asChild variant={workspace.activeThread?.id === thread.id ? "secondary" : "ghost"} className="h-auto w-full justify-start px-3 py-2 text-left">
                <Link href={`/projects/${workspace.project.id}/ask/${thread.id}`}>
                  <span className="min-w-0"><span className="block truncate text-sm">{thread.title}</span><span className="block text-xs font-normal text-muted-foreground">{thread.messageCount} messages</span></span>
                </Link>
              </Button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-[620px] min-w-0 flex-col">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(workspace.capabilities).map(([key, available]) => (
                <Badge key={key} variant={available ? "secondary" : "outline"} className="capitalize">
                  {key.replace(/([A-Z])/g, " $1")} · {available ? "available" : "not ready"}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {workspace.messages.length === 0 ? (
              <div className="mx-auto flex max-w-2xl flex-col items-center py-14 text-center">
                <div className="mb-4 grid size-12 place-items-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300"><MessageSquareText aria-hidden="true" /></div>
                <h2 className="text-xl font-semibold">Ask about this bid</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Helios answers from the current canonical record. It will identify missing or conflicting information instead of guessing.</p>
                <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                  {QUICK_QUESTIONS.map((prompt) => <Button key={prompt} variant="outline" className="h-auto justify-start whitespace-normal p-3 text-left" onClick={() => ask(prompt)}>{prompt}</Button>)}
                </div>
              </div>
            ) : workspace.messages.map((message) => (
              <article key={message.id} className={message.role === "user" ? "ml-auto max-w-[82%] rounded-xl bg-orange-500 px-4 py-3 text-slate-950" : "max-w-[92%] rounded-xl border border-border bg-background/50 p-4"}>
                {message.role === "assistant" && <div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline"><Bot aria-hidden="true" />Helios</Badge>{message.answerStatus && <Badge variant={statusVariant(message.answerStatus)} className="capitalize">{message.answerStatus}</Badge>}{message.confidence !== undefined && <Badge variant="outline">{message.confidence}% confidence</Badge>}</div>}
                {message.status === "pending" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Checking the governed project record…</div>
                ) : <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>}
                {message.status === "failed" && message.error && <p className="mt-2 text-xs text-destructive">{message.error}</p>}
                {message.role === "assistant" && message.citations.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{message.citations.map((citation) => citation.documentId ? (
                  <Button key={citation.sourceId} asChild size="sm" variant="outline"><a href={`/api/projects/${workspace.project.id}/documents/${citation.documentId}/content${citation.pageNumber ? `#page=${citation.pageNumber}` : ""}`} target="_blank" rel="noreferrer"><FileSearch aria-hidden="true" />{citation.label}<ExternalLink aria-hidden="true" /></a></Button>
                ) : <Badge key={citation.sourceId} variant="outline">{citation.label}</Badge>)}</div>}
              </article>
            ))}
          </div>

          <form className="border-t border-border bg-card/80 p-4" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
            <div className="flex items-end gap-2">
              <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about a station, elevation, quantity, specification, estimate item, or risk…" maxLength={2_000} rows={3} disabled={sending || pending} className="min-h-20 resize-none" />
              <Button type="submit" size="lg" disabled={!question.trim() || sending || pending} aria-label="Ask Helios"><Send aria-hidden="true" />Ask</Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Answers are advisory and never change the estimate.</span><span>{question.length}/2,000</span></div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </form>
        </main>

        <aside className="border-t border-border p-4 xl:border-l xl:border-t-0" aria-label="Answer basis">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Calculator className="size-4 text-orange-300" aria-hidden="true" />Answer basis</h2>
          {!latestAnswer ? <p className="mt-3 text-sm leading-6 text-muted-foreground">Select a saved answer to see its method, assumptions, limitations, and sources.</p> : (
            <div className="mt-3 space-y-4 text-sm">
              <Card className="p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method</p><p className="mt-1 leading-5">{latestAnswer.method || "Canonical project record lookup"}</p></Card>
              {latestAnswer.assumptions.length > 0 && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assumptions</h3><ul className="mt-2 space-y-2">{latestAnswer.assumptions.map((item) => <li key={item} className="rounded-md border p-2 leading-5">{item}</li>)}</ul></div>}
              {latestAnswer.limitations.length > 0 && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limitations</h3><ul className="mt-2 space-y-2">{latestAnswer.limitations.map((item) => <li key={item} className="rounded-md border border-amber-500/25 bg-amber-500/5 p-2 leading-5">{item}</li>)}</ul></div>}
              <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sources</h3><div className="mt-2 space-y-2">{latestAnswer.citations.map((citation) => <div key={citation.sourceId} className="rounded-md border p-2"><p className="font-medium">{citation.label}</p><p className="mt-1 text-xs text-muted-foreground">{citation.locator} · {citation.status}</p></div>)}</div></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
