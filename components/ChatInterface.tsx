"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { AppSnapshot } from "@/lib/appContext";

type VoiceState = "idle" | "listening" | "unsupported";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function useVoice(onResult: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  useEffect(() => {
    const SR = typeof window !== "undefined"
      && ((window as AnySpeechRecognition).SpeechRecognition || (window as AnySpeechRecognition).webkitSpeechRecognition) as AnySpeechRecognition | undefined;
    if (!SR) { setState("unsupported"); return; }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: AnySpeechRecognition) => {
      const transcript = e.results[0][0].transcript;
      setState("idle");
      onResult(transcript);
    };
    rec.onerror = () => setState("idle");
    rec.onend = () => setState((s) => s === "listening" ? "idle" : s);

    recognitionRef.current = rec;
  }, [onResult]);

  const toggle = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (state === "listening") {
      rec.stop();
      setState("idle");
    } else {
      rec.start();
      setState("listening");
    }
  }, [state]);

  return { state, toggle };
}

interface ValidCta { duration: number; durationUnit: string; durationLabel: string; }

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestion?: string;
  suggestionSymbol?: string;
  validCta?: ValidCta;
}

interface ChatInterfaceProps {
  pendingInput?: string;
  onPendingInputConsumed?: () => void;
  onAiMessage?: () => void;
  appSnapshot?: AppSnapshot;
}


function SuggestionCard({ text, symbol, validCta, onTrade }: { text: string; symbol?: string; validCta?: ValidCta; onTrade: (prompt: string) => void }) {
  const isCall = /\b(call|rise|bullish|higher|buy)\b/i.test(text);
  const isPut = /\b(put|fall|falling|down|bearish|lower|sell|decline)\b/i.test(text);
  // PUT takes priority if both match (e.g. "consider a PUT")
  const direction = isPut ? "PUT" : isCall ? "CALL" : null;
  const cta = validCta ?? { duration: 5, durationUnit: "m", durationLabel: "5 min" };

  return (
    <div className="mt-2 rounded-2xl overflow-hidden border border-white/8 bg-gradient-to-br from-white/[0.04] to-transparent backdrop-blur-sm">
      {/* Top accent bar */}
      <div className={`h-0.5 w-full ${isCall ? "bg-gradient-to-r from-green-500/60 to-green-400/20" : isPut ? "bg-gradient-to-r from-red-500/60 to-red-400/20" : "bg-gradient-to-r from-yellow-500/60 to-yellow-400/20"}`} />
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCall ? "bg-green-500/20 text-green-400" : isPut ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
            💡
          </div>
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">AI Suggestion</span>
          {direction && (
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isCall ? "bg-green-500/15 text-green-400 border border-green-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
              {direction} ↑
            </span>
          )}
        </div>
        {/* Body */}
        <p className="text-gray-300 text-xs leading-relaxed">{text}</p>
        {/* CTA */}
        {direction && (
          <button
            onClick={() => onTrade(`Buy $10 ${direction === "CALL" ? "rise" : "fall"} on ${symbol ?? "Volatility 100"} for ${cta.duration} ${cta.durationUnit === "m" ? "minute" : cta.durationUnit === "d" ? "day" : cta.durationUnit === "h" ? "hour" : cta.durationUnit === "t" ? "tick" : "second"}${cta.duration > 1 ? "s" : ""}`)}
            className={`self-start flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all ${direction === "CALL" ? "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20" : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"}`}
          >
            <span>{direction === "CALL" ? "↑" : "↓"}</span>
            Quick {direction === "CALL" ? "Rise" : "Fall"} — $10 · {cta.durationLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300"
      title="Copy"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function ChatInterface({ pendingInput, onPendingInputConsumed, onAiMessage, appSnapshot }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<Record<string, unknown> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { state: voiceState, toggle: toggleVoice } = useVoice(
    useCallback((transcript: string) => {
      sendMessage(transcript);
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      inputRef.current?.focus();
      onPendingInputConsumed?.();
    }
  }, [pendingInput, onPendingInputConsumed]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const userMessage = (overrideText ?? input).trim();
    if (!userMessage || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          pendingProposal,
          // Captured before the new user message is added to state (closure over old messages)
          chatHistory: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          appSnapshot,
        }),
      });

      const data = await res.json() as {
        reply: string;
        priceData?: { symbol: string; price: number; history: number[]; validCta: ValidCta; suggestion?: string };
        proposal?: Record<string, unknown>;
        clearProposal?: boolean;
      };

      const suggestion = data.priceData?.suggestion;
      const suggestionSymbol = data.priceData?.symbol;
      const validCta = data.priceData?.validCta;

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, timestamp: new Date(), suggestion, suggestionSymbol, validCta }]);
      onAiMessage?.();

      if (data.proposal) setPendingProposal(data.proposal);
      if (data.clearProposal) setPendingProposal(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${msg}`, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, pendingProposal]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full relative">

      {/* ── Messages / Welcome area ── */}
      <div className="flex-1 overflow-y-auto">

        {isEmpty ? (
          /* ── Welcome hero ── */
          <div className="flex flex-col items-center justify-center h-full px-6 gap-8 pb-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center font-black text-2xl glow-red">
                  T
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0a0f] pulse-glow" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">TradeGPT</h2>
                <p className="text-gray-500 text-sm mt-1">Your AI trading assistant · powered by Deriv</p>
              </div>
            </div>

            {/* Capability pills */}
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {[
                "Check prices & trends",
                "Place trades naturally",
                "Monitor your portfolio",
                "AI-powered suggestions",
              ].map((cap) => (
                <span key={cap} className="text-xs bg-white/5 border border-white/8 text-gray-400 rounded-full px-3 py-1.5">
                  {cap}
                </span>
              ))}
            </div>

            <p className="text-gray-600 text-xs">Use the sidebar shortcuts or type below to get started</p>
          </div>
        ) : (
          /* ── Message thread ── */
          <div className="px-6 py-6 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 message-in ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

                {/* Avatar */}
                <div className="flex-shrink-0 mt-0.5">
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-[10px] font-bold glow-red">
                      AI
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-[10px] font-bold border border-white/10">
                      U
                    </div>
                  )}
                </div>

                {/* Bubble + meta */}
                <div className={`flex flex-col gap-1 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>

                  {msg.role === "assistant" ? (
                    <>
                      <div className="group relative flex items-start gap-2">
                        {/* Left accent bar */}
                        <div className="absolute -left-3 top-3 bottom-3 w-0.5 bg-red-500/40 rounded-full" />
                        <div className="bg-white/[0.04] border border-white/8 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-gray-100">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                              ul: ({ children }) => <ul className="space-y-1 mt-1.5 mb-1">{children}</ul>,
                              li: ({ children }) => (
                                <li className="flex gap-2 text-gray-300">
                                  <span className="text-red-400 mt-0.5 flex-shrink-0">›</span>
                                  <span>{children}</span>
                                </li>
                              ),
                              code: ({ children }) => (
                                <code className="bg-black/40 rounded-md px-1.5 py-0.5 text-xs font-mono text-red-300">
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        <CopyButton text={msg.content} />
                      </div>
                      {msg.suggestion && (
                        <SuggestionCard text={msg.suggestion} symbol={msg.suggestionSymbol} validCta={msg.validCta} onTrade={(prompt) => sendMessage(prompt)} />
                      )}
                    </>
                  ) : (
                    <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-red-900/20">
                      {msg.content}
                    </div>
                  )}

                  <span className="text-gray-700 text-[11px] px-1">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 message-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0 glow-red">
                  AI
                </div>
                <div className="bg-white/[0.04] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3.5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    {[0, 160, 320].map((delay) => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 bg-red-400/70 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pending proposal banner */}
            {pendingProposal && (
              <div className="flex justify-center message-in">
                <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-3 text-amber-300 text-xs">
                  <span className="text-base">⚡</span>
                  <span>Trade ready — type <strong className="text-amber-200 font-semibold">confirm</strong> to execute</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 border-t border-white/5 bg-black/20 backdrop-blur-md px-4 pt-3 pb-4">

        {/* Listening banner */}
        {voiceState === "listening" && (
          <div className="flex items-center justify-center gap-2.5 mb-3 bg-red-500/10 border border-red-500/25 rounded-2xl py-2.5 px-4">
            <div className="flex items-center gap-1">
              {[0, 150, 300, 150, 0].map((delay, i) => (
                <div key={i} className="w-0.5 bg-red-400 rounded-full animate-pulse" style={{ height: `${8 + i * 3}px`, animationDelay: `${delay}ms` }} />
              ))}
            </div>
            <span className="text-red-300 text-xs font-medium">Listening — speak your trade now</span>
            <div className="flex items-center gap-1">
              {[300, 150, 0, 150, 300].map((delay, i) => (
                <div key={i} className="w-0.5 bg-red-400 rounded-full animate-pulse" style={{ height: `${8 + (4 - i) * 3}px`, animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Input row */}
        <div className={`flex items-center gap-2 bg-white/5 border rounded-2xl px-4 py-2.5 transition-all ${voiceState === "listening" ? "border-red-500/60 shadow-[0_0_16px_rgba(239,68,68,0.15)]" : "border-white/10 focus-within:border-red-500/40"}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={voiceState === "listening" ? "Listening… speak your trade" : 'Ask anything — "EUR/USD price", "buy $10 rise on V100"…'}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
            disabled={loading}
          />

          {/* Mic button */}
          {voiceState !== "unsupported" && (
            <button
              onClick={toggleVoice}
              disabled={loading}
              title={voiceState === "listening" ? "Stop listening" : "Speak a trade"}
              className={`w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${
                voiceState === "listening"
                  ? "bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {voiceState === "listening" ? (
                /* Stop / waveform icon */
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              ) : (
                /* Mic icon */
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all glow-red"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        <p className="text-gray-700 text-[11px] mt-2 text-center">
          Powered by Deriv API · Real money at risk · Trade responsibly
        </p>
      </div>
    </div>
  );
}
