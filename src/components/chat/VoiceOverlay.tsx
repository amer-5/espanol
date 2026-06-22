"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X, Loader2 } from "lucide-react";
import { speak } from "@/lib/tts";

type Phase = "idle" | "recording" | "processing" | "speaking";

interface Props {
  onClose: () => void;
  onTranscript: (text: string) => Promise<string>; // returns AI reply
}

export default function VoiceOverlay({ onClose, onTranscript }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const phaseLabel: Record<Phase, string> = {
    idle: "Tapni i govori",
    recording: "Slušam...",
    processing: "Razmišljam...",
    speaking: "Govorim...",
  };

  const startRecording = async () => {
    setError("");
    setTranscript("");
    setReply("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const rec = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        processAudio(new Blob(chunksRef.current, { type: mimeType }));
      };
      mediaRef.current = rec;
      rec.start();
      setPhase("recording");
    } catch {
      setError("Mikrofon nije dostupan. Dozvoli pristup mikrofonu.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setPhase("processing");
  };

  const processAudio = async (blob: Blob) => {
    try {
      const fd = new FormData();
      fd.append("audio", blob);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const { text, error: tErr } = await res.json();
      if (tErr || !text) { setError("Nisam razumio. Pokušaj ponovo."); setPhase("idle"); return; }
      setTranscript(text);

      const aiReply = await onTranscript(text);
      setReply(aiReply);
      setPhase("speaking");
      await speak(aiReply);
      setPhase("idle");
    } catch {
      setError("Greška. Pokušaj ponovo.");
      setPhase("idle");
    }
  };

  const handleMicPress = () => {
    if (phase === "idle") startRecording();
    else if (phase === "recording") stopRecording();
  };

  // Cleanup on unmount
  useEffect(() => () => { mediaRef.current?.stop(); }, []);

  const isActive = phase === "recording";
  const isBusy = phase === "processing" || phase === "speaking";

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-between py-16 px-8">
      {/* Close */}
      <button
        onClick={onClose}
        className="self-end p-2 rounded-full text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Status area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm text-center">
        {/* Transcript / reply */}
        {transcript && (
          <div className="bg-gray-800 rounded-2xl px-5 py-3 text-white text-sm">
            <p className="text-gray-400 text-xs mb-1">Ti:</p>
            <p>{transcript}</p>
          </div>
        )}
        {reply && (
          <div className="bg-emerald-900/40 border border-emerald-700/40 rounded-2xl px-5 py-3 text-white text-sm">
            <p className="text-emerald-400 text-xs mb-1">AI:</p>
            <p>{reply}</p>
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Big mic button */}
      <div className="flex flex-col items-center gap-5">
        <p className="text-gray-400 text-sm">{phaseLabel[phase]}</p>

        <button
          onPointerDown={handleMicPress}
          disabled={isBusy}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
            isActive
              ? "bg-red-500 scale-110"
              : isBusy
              ? "bg-gray-700 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-400 active:scale-95"
          }`}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {/* Pulse rings when recording */}
          {isActive && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
              <span className="absolute -inset-3 rounded-full border-2 border-red-400 opacity-30 animate-pulse" />
            </>
          )}
          {isBusy
            ? <Loader2 className="w-10 h-10 text-white animate-spin" />
            : isActive
            ? <MicOff className="w-10 h-10 text-white" />
            : <Mic className="w-10 h-10 text-white" />
          }
        </button>

        {isActive && (
          <p className="text-red-400 text-xs animate-pulse">Tapni ponovo da završiš</p>
        )}
      </div>
    </div>
  );
}
