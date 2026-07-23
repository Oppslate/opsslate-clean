
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@opsslate/suite-ui/card";
import { Badge } from "@opsslate/suite-ui/badge";
import { Button } from "@opsslate/suite-ui/button";
import { useToast } from "@opsslate/suite-ui/toast";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";

const ACTION_ICONS: Record<string, string> = {
  ADD_PUNCH_ITEM: "✅", CLOCK_IN: "⏱️", CLOCK_OUT: "⏹️", ADD_DAILY_LOG: "📝",
  CHECK_WEATHER: "⛅", CHECK_RFIS: "❓", CHECK_SUBMITTALS: "📋", ADD_SAFETY_NOTE: "🦺",
  CHECK_CREW: "👷", CHECK_BUDGET: "💰", ADD_DELIVERY_NOTE: "🚚", ASK_QUESTION: "🧠", ERROR: "❌",
};

function VoiceContent() {
  const { user } = useAuth();
  const projects = useQuery(api.projects.list, user ? { companyId: user.companyId } : "skip");
  const { toast } = useToast();

  const [selectedProject, setSelectedProject] = useState("");
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [commandLog, setCommandLog] = useState<Array<{
    transcript: string; action: string; response: string; time: string; icon: string;
  }>>([]);
  const [handsFreeModeActive, setHandsFreeModeActive] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const processCommand = useAction(api.voiceCommand.processCommand as any);

  const history = useQuery(
    api.voiceCommandHelpers.getHistory,
    selectedProject ? { projectId: selectedProject as Id<"projects"> } : "skip"
  );

  // Init speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    // Try to find a good voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) ||
      voices.find(v => v.lang.startsWith("en-US")) || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => {
      // In hands-free mode, restart listening after response
      if (handsFreeModeActive) {
        setTimeout(() => startListening(), 500);
      }
    };
    synthRef.current.speak(utterance);
  }, [handsFreeModeActive]);

  const handleCommand = useCallback(async (text: string) => {
    if (!text.trim() || !user || !selectedProject || processing) return;
    setProcessing(true);
    setTranscript(text);

    try {
      const result = await processCommand({
        companyId: user.companyId,
        projectId: selectedProject as Id<"projects">,
        userId: user._id,
        userName: user.name,
        transcript: text,
      });

      const entry = {
        transcript: text,
        action: result.action || "UNKNOWN",
        response: result.spoken_response || "Done.",
        time: new Date().toLocaleTimeString(),
        icon: ACTION_ICONS[result.action] || "🎯",
      };
      setCommandLog(prev => [entry, ...prev]);

      // Speak the response
      speak(result.spoken_response || "Done.");

    } catch (e: any) {
      console.error("Voice command error:", e);
      const errorMsg = e?.message || e?.data || "Unknown error";
      const entry = {
        transcript: text,
        action: "ERROR",
        response: `Error: ${typeof errorMsg === "string" ? errorMsg.slice(0, 150) : "Something went wrong. Check console."}`,
        time: new Date().toLocaleTimeString(),
        icon: "❌",
      };
      setCommandLog(prev => [entry, ...prev]);
      speak("Sorry, something went wrong. Try again.");
    }

    setProcessing(false);
    setTranscript("");
    setInterimTranscript("");
  }, [user, selectedProject, processing, processCommand, speak]);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast("Speech recognition not supported. Use Chrome or Edge.", "error");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        handleCommand(final);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast("Speech error: " + event.error, "error");
      }
      setListening(false);
      // In hands-free mode, retry after errors
      if (handsFreeModeActive && event.error === "no-speech") {
        setTimeout(() => startListening(), 1000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [handleCommand, toast, handsFreeModeActive]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setHandsFreeModeActive(false);
  };

  const toggleHandsFree = () => {
    if (handsFreeModeActive) {
      stopListening();
    } else {
      setHandsFreeModeActive(true);
      startListening();
      speak("Hands-free mode active. I'm listening.");
    }
  };

  const selectedProj = (projects ?? []).find(p => p._id === selectedProject);

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-1 inline-block">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">🎙️ Voice Command — Jobsite Mode</h1>
          <p className="text-muted-foreground text-sm">Hands-free construction management. Speak commands, get things done.</p>
        </div>
        <select className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
          <option value="">Select Project...</option>
          {(projects ?? []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      {!selectedProject ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">🎙️</div>
            <h3 className="text-xl font-bold mb-2">Select a Project to Start</h3>
            <p className="text-muted-foreground text-sm">Voice commands are project-specific. Select a project first.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Big mic button */}
          <Card className={`border-2 transition-all duration-300 ${
            listening ? "border-red-500 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.3)]" :
            handsFreeModeActive ? "border-green-500 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.2)]" :
            "border-border bg-card"
          }`}>
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Badge variant="outline" className="text-xs mb-3">{selectedProj?.name}</Badge>
              </div>

              {/* Mic button */}
              <button
                onClick={listening ? stopListening : startListening}
                disabled={processing}
                className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl transition-all duration-300 mx-auto mb-4 ${
                  listening ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)] animate-pulse" :
                  processing ? "bg-purple-500 animate-spin-slow" :
                  "bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-xl"
                }`}
              >
                {processing ? "🧠" : listening ? "🔴" : "🎙️"}
              </button>

              {/* Status */}
              <div className="text-lg font-bold mb-2">
                {processing ? (
                  <span className="text-purple-400">Processing...</span>
                ) : listening ? (
                  <span className="text-red-400 animate-pulse">Listening...</span>
                ) : (
                  <span className="text-muted-foreground">Tap to speak</span>
                )}
              </div>

              {/* Live transcript */}
              {(transcript || interimTranscript) && (
                <div className="bg-secondary/50 rounded-xl p-4 max-w-lg mx-auto mb-4">
                  <p className="text-sm">
                    {transcript && <span className="font-medium">{transcript}</span>}
                    {interimTranscript && <span className="text-muted-foreground italic"> {interimTranscript}</span>}
                  </p>
                </div>
              )}

              {/* Hands-free toggle */}
              <div className="flex justify-center gap-3">
                <Button
                  variant={handsFreeModeActive ? "default" : "outline"}
                  onClick={toggleHandsFree}
                  className={handsFreeModeActive ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {handsFreeModeActive ? "🟢 Hands-Free ON" : "👐 Enable Hands-Free"}
                </Button>
              </div>

              {handsFreeModeActive && (
                <p className="text-xs text-green-400 mt-2 animate-pulse">
                  Always listening — speak naturally, I&apos;ll respond and keep listening
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick commands */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm mb-3">💡 Try Saying...</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  { icon: "✅", cmd: "Add punch item, unit 204, damaged drywall, south wall" },
                  { icon: "⏱️", cmd: "Clock me in" },
                  { icon: "⏹️", cmd: "Clock out Mike" },
                  { icon: "⛅", cmd: "What's the weather tomorrow?" },
                  { icon: "📝", cmd: "Add daily log, framed second floor, 8 crew on site" },
                  { icon: "👷", cmd: "Who's on the crew today?" },
                  { icon: "❓", cmd: "How many open RFIs do we have?" },
                  { icon: "🦺", cmd: "Safety concern, tripping hazard at east stairwell" },
                  { icon: "🚚", cmd: "Lumber delivery arrived, 2x4s and plywood" },
                  { icon: "💰", cmd: "What's our budget looking like?" },
                  { icon: "📋", cmd: "Any submittals pending?" },
                  { icon: "🧠", cmd: "When is the next concrete pour scheduled?" },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    onClick={() => handleCommand(item.cmd)}
                  >
                    <span className="text-lg mt-0.5">{item.icon}</span>
                    <span className="text-xs text-muted-foreground">&quot;{item.cmd}&quot;</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Command log */}
          {commandLog.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">📜 Command History</h3>
                <div className="space-y-3">
                  {commandLog.map((entry, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-secondary/30">
                      <span className="text-2xl">{entry.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{entry.action}</Badge>
                          <span className="text-[10px] text-muted-foreground">{entry.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">🗣️ &quot;{entry.transcript}&quot;</p>
                        <p className="text-sm font-medium mt-1">🤖 {entry.response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved history */}
          {(history ?? []).length > 0 && commandLog.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-3">📜 Recent Voice Commands</h3>
                <div className="space-y-2">
                  {(history ?? []).map((h: any) => (
                    <div key={h._id} className="flex items-center gap-3 text-sm py-2 border-b border-border/50">
                      <span>{ACTION_ICONS[h.action] || "🎯"}</span>
                      <div className="flex-1">
                        <span className="text-muted-foreground">&quot;{h.transcript}&quot;</span>
                        <span className="mx-2">→</span>
                        <span>{h.response}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function VoicePage() {
  return <AppShell><VoiceContent /></AppShell>;
}
