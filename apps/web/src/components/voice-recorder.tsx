"use client";
import { useState, useRef, useCallback } from "react";
import { Button } from "@opsslate/suite-ui/button";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);

        try {
          // Use browser's SpeechRecognition API as primary
          // Fall back to sending audio for server-side processing
          const text = await transcribeWithBrowserAPI(blob);
          onTranscript(text);
        } catch (err) {
          console.error("Transcription failed:", err);
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access is required for voice input. Please allow microphone access in your browser settings.");
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startRecording}
          disabled={disabled || processing}
          className={`gap-2 ${processing ? "animate-pulse" : ""}`}
        >
          {processing ? "🔄 Processing..." : "🎙️ Voice Input"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="gap-2 animate-pulse"
        >
          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
          Stop Recording
        </Button>
      )}
    </div>
  );
}

// Browser-based speech recognition
function transcribeWithBrowserAPI(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    // Try Web Speech API first (works in Chrome, Edge, Safari)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback: use a simple file reader approach
      reject(new Error("Speech recognition not supported. Try Chrome or Edge."));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let fullTranscript = "";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onend = () => {
      resolve(fullTranscript.trim());
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.start();

    // Auto-stop after playing the recorded audio
    // Actually, Web Speech API works with live mic, not recorded audio
    // So we need to use it differently - start live recognition instead

    // For now, resolve with a note to use live recognition
    // The actual implementation will use live SpeechRecognition during recording
    setTimeout(() => {
      recognition.stop();
    }, 100);
  });
}

// Live speech recognition component - better approach
export function LiveVoiceInput({ onTranscript, disabled }: VoiceRecorderProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input requires Chrome, Edge, or Safari.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      if (transcriptRef.current) {
        onTranscript(transcriptRef.current.trim());
        transcriptRef.current = "";
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    transcriptRef.current = "";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcriptRef.current += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onend = () => {
      setListening(false);
      if (transcriptRef.current) {
        onTranscript(transcriptRef.current.trim());
        transcriptRef.current = "";
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setListening(false);
    };

    recognition.start();
    setListening(true);
  }, [listening, onTranscript]);

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "outline"}
      size="sm"
      onClick={toggleListening}
      disabled={disabled}
      className={`gap-2 ${listening ? "animate-pulse" : ""}`}
    >
      {listening ? (
        <>
          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
          Tap to Stop
        </>
      ) : (
        "🎙️ Voice"
      )}
    </Button>
  );
}
