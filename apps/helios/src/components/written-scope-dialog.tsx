"use client";

import { Button } from "@opsslate/suite-ui/button";
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
import { Textarea } from "@opsslate/suite-ui/textarea";
import { FilePenLine, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

import {
  prepareWrittenScope,
  type PreparedBidPackage,
} from "@/lib/package-files";

export function WrittenScopeDialog({
  disabled,
  onPrepared,
}: {
  disabled: boolean;
  onPrepared: (prepared: PreparedBidPackage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string>();
  const [preparing, setPreparing] = useState(false);
  const contentBytes = useMemo(
    () => new TextEncoder().encode(content).byteLength,
    [content],
  );

  async function prepare() {
    setPreparing(true);
    setError(undefined);
    try {
      const next = await prepareWrittenScope({
        title,
        sourceLocation,
        content,
      });
      onPrepared(next);
      setOpen(false);
      setTitle("");
      setSourceLocation("");
      setContent("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Written scope is invalid.",
      );
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <FilePenLine className="size-4" aria-hidden="true" />
        Add written scope
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add written scope</DialogTitle>
            <DialogDescription>
              Preserve the owner-issued narrative exactly as received. Helios
              records its source and hash without pretending it is a plan or
              specification.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="written-scope-title">Scope title</Label>
              <Input
                id="written-scope-title"
                value={title}
                maxLength={160}
                placeholder="Emergency culvert replacement written scope"
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="written-scope-source">
                Source reference <span className="font-normal">(optional)</span>
              </Label>
              <Input
                id="written-scope-source"
                value={sourceLocation}
                maxLength={500}
                placeholder="Construction Exchange project listing, email, or owner letter"
                onChange={(event) => setSourceLocation(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="written-scope-content">Exact written scope</Label>
              <Textarea
                id="written-scope-content"
                value={content}
                className="min-h-64 resize-y"
                placeholder="Paste the complete issued scope without summarizing it."
                onChange={(event) => setContent(event.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                {contentBytes.toLocaleString()} of 131,072 bytes
              </div>
            </div>
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-200"
              >
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={preparing} onClick={() => void prepare()}>
              {preparing && (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              )}
              Review scope manifest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
