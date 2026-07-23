"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@opsslate/suite-ui/button";
import { Input } from "@opsslate/suite-ui/input";
import { Badge } from "@opsslate/suite-ui/badge";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Id } from "../../convex/_generated/dataModel";

interface Contact {
  _id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  phone?: string;
  email?: string;
}

export function CallTranscriberModal({
  projectId,
  projectName,
  companyId,
  contacts,
  userName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  companyId: string;
  contacts: Contact[];
  userName: string;
  onClose: () => void;
}) {
  const createEmail = useMutation(api.emails.create);
  const addFieldNote = useMutation(api.fieldNotes.add);

  const [selectedContact, setSelectedContact] = useState("");
  const [customContact, setCustomContact] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");

  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createRecognition(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.maxAlternatives = 1;
    return r;
  }

  const startRecording = useCallback(() => {
    setError("");
    const recognition = createRecognition();
    if (!recognition) {
      setError("Speech recognition not supported on this browser. Try Chrome or Safari.");
      return;
    }

    let finalTranscript = "";
    let interimTranscript = "";

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; [key: number]: { transcript: string } } } }) => {
      interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript = result[0].transcript;
        }
      }
      setTranscript(finalTranscript + (interimTranscript ? `[...${interimTranscript}]` : ""));
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === "no-speech") return; // Ignore silence
      if (event.error === "aborted") return;
      setError(`Recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      // Auto-restart if still recording (speech recognition auto-stops)
      if (recognitionRef.current && recording) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [recording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    // Clean up interim markers
    setTranscript((prev) => prev.replace(/\[\.\.\..*?\]/g, "").trim());
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { recognitionRef.current.stop(); }
      if (timerRef.current) { clearInterval(timerRef.current); }
    };
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const contactName = selectedContact === "custom"
    ? customContact
    : contacts.find((c) => c._id === selectedContact)
      ? [contacts.find((c) => c._id === selectedContact)?.firstName, contacts.find((c) => c._id === selectedContact)?.lastName].filter(Boolean).join(" ") + (contacts.find((c) => c._id === selectedContact)?.company ? ` (${contacts.find((c) => c._id === selectedContact)?.company})` : "")
      : "Unknown";

  const handleSave = async () => {
    if (!transcript.trim()) { setError("No transcript to save"); return; }

    const cleanTranscript = transcript.replace(/\[\.\.\..*?\]/g, "").trim();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const subject = topic.trim()
      ? `📞 Call: ${topic} — ${contactName}`
      : `📞 Call with ${contactName}`;

    try {
      // Save to communications (emails table)
      await createEmail({
        companyId,
        projectId,
        subject,
        from: userName,
        to: contactName,
        date: dateStr,
        body: `CALL TRANSCRIPT\n` +
          `Date: ${dateStr} at ${timeStr}\n` +
          `Duration: ${formatDuration(duration)}\n` +
          `With: ${contactName}\n` +
          `Topic: ${topic || "General"}\n` +
          `Recorded by: ${userName}\n` +
          `Project: ${projectName}\n` +
          `${"─".repeat(40)}\n\n` +
          cleanTranscript,
        category: "outgoing",
        source: "Call Transcript",
      });

      // Also save as field note for quick reference
      await addFieldNote({
        companyId: companyId as Id<"companies">,
        projectId: projectId as Id<"projects">,
        note: `📞 ${subject} (${formatDuration(duration)}) — ${cleanTranscript.slice(0, 200)}${cleanTranscript.length > 200 ? "..." : ""}`,
        author: userName,
      });

      setSaved(true);
    } catch (err) {
      setError(`Save failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-5 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">📞 Call Transcriber</h2>
              <p className="text-sm text-muted-foreground mt-1">{projectName}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Contact Selection */}
          {!recording && !transcript && (
            <>
              <div>
                <label className="text-sm font-medium block mb-2">Who are you calling?</label>
                <select
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                >
                  <option value="">Select team member...</option>
                  {contacts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                      {c.company ? ` — ${c.company}` : ""}
                      {c.role ? ` (${c.role})` : ""}
                    </option>
                  ))}
                  <option value="custom">Other (type name)</option>
                </select>
                {selectedContact === "custom" && (
                  <Input className="mt-2" placeholder="Name / Company..." value={customContact} onChange={(e) => setCustomContact(e.target.value)} />
                )}
                {selectedContact && selectedContact !== "custom" && (() => {
                  const c = contacts.find((c) => c._id === selectedContact);
                  if (!c) return null;
                  return (
                    <div className="mt-2 bg-secondary/40 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</span>
                        {c.company && <span className="text-muted-foreground ml-1">• {c.company}</span>}
                      </div>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300">
                          📞 {c.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No phone on file</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Topic (optional)</label>
                <Input placeholder="e.g., Electrical rough-in schedule, Change order discussion..." value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
            </>
          )}

          {/* Recording Controls */}
          <div className="text-center py-4">
            {!recording && !transcript && (
              <Button
                onClick={startRecording}
                disabled={!selectedContact || (selectedContact === "custom" && !customContact.trim())}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full w-24 h-24 text-lg"
              >
                🎙️<br />Record
              </Button>
            )}

            {recording && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-bold text-lg">Recording — {formatDuration(duration)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Put your phone on speaker and talk normally. I&apos;m listening.</p>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="rounded-full w-20 h-20 text-lg"
                >
                  ⏹️<br />Stop
                </Button>
              </div>
            )}

            {!recording && transcript && !saved && (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => { setTranscript(""); setDuration(0); }}>🔄 Re-record</Button>
                <Button onClick={handleSave} className="bg-gradient-to-r from-orange-500 to-amber-600">💾 Save Transcript</Button>
              </div>
            )}

            {saved && (
              <div className="space-y-3">
                <div className="text-green-400 text-lg font-bold">✅ Saved!</div>
                <p className="text-sm text-muted-foreground">Transcript saved to Communications and Field Notes</p>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            )}
          </div>

          {/* Live Transcript */}
          {(recording || transcript) && (
            <Card className="bg-secondary/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold">Transcript</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">{formatDuration(duration)}</Badge>
                    <Badge variant="outline" className="text-xs">📞 {contactName}</Badge>
                  </div>
                </div>
                <div className="text-sm leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {transcript || <span className="text-muted-foreground italic">Listening...</span>}
                </div>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

          <p className="text-xs text-muted-foreground text-center">
            💡 Tip: Put your phone on speaker mode for best results. Works offline — transcript saves when you have signal.
          </p>
        </div>
      </div>
    </div>
  );
}
