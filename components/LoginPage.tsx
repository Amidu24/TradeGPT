"use client";

import { useState, useEffect } from "react";

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(lines: string[], typeMs = 55, pauseMs = 2200, deleteMs = 28) {
  const [text, setText] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = lines[lineIdx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting) {
      if (charIdx < current.length) {
        t = setTimeout(() => { setText(current.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, typeMs);
      } else {
        t = setTimeout(() => setDeleting(true), pauseMs);
      }
    } else {
      if (charIdx > 0) {
        t = setTimeout(() => { setText(current.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, deleteMs);
      } else {
        setDeleting(false);
        setLineIdx(i => (i + 1) % lines.length);
      }
    }
    return () => clearTimeout(t);
  }, [text, charIdx, deleting, lineIdx, lines, typeMs, pauseMs, deleteMs]);

  return text;
}

// ── Animated chat demo ────────────────────────────────────────────────────────
const DEMO_MESSAGES = [
  { role: "user",      text: "Buy $10 rise on Volatility 100 for 5 mins" },
  { role: "assistant", text: "Trade proposal ready!\n**Cost:** $10.00  |  **Payout:** $18.45\nType \"confirm\" to execute." },
  { role: "user",      text: "confirm" },
  { role: "assistant", text: "✅ Trade executed!\nContract #2847561 · Paid $10.00\nGood luck! 🚀" },
];
const DEMO_DELAYS = [400, 1800, 3800, 5200];
const DEMO_CYCLE  = 8500;

function ChatDemo() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    function schedule(offset = 0) {
      DEMO_DELAYS.forEach((d, i) => {
        timers.push(setTimeout(() => setCount(i + 1), offset + d));
      });
      timers.push(setTimeout(() => { setCount(0); schedule(200); }, offset + DEMO_CYCLE));
    }
    schedule();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full max-w-xs flex flex-col gap-3 px-1">
      {/* "Live" badge */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-glow" />
        <span className="text-gray-500 text-[10px] uppercase tracking-widest font-medium">Live demo</span>
      </div>

      {DEMO_MESSAGES.map((msg, i) => (
        <div
          key={i}
          className={`transition-all duration-500 ${i < count ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"} flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {msg.role === "assistant" && (
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-[9px] font-bold mr-2 flex-shrink-0 mt-0.5 glow-red">AI</div>
          )}
          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
            msg.role === "user"
              ? "bg-gradient-to-br from-red-600 to-red-700 text-white rounded-tr-sm"
              : "bg-white/[0.06] border border-white/10 text-gray-200 rounded-tl-sm backdrop-blur-sm"
          }`}>
            {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
          </div>
        </div>
      ))}

      {/* Typing indicator when last user message done but AI hasn't replied yet */}
      {count === 1 && (
        <div className="flex items-center gap-2 opacity-100">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-[9px] font-bold flex-shrink-0 glow-red">AI</div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-1.5 h-1.5 bg-red-400/70 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {count === 3 && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-[9px] font-bold flex-shrink-0 glow-red">AI</div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-1.5 h-1.5 bg-red-400/70 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Floating stat cards ───────────────────────────────────────────────────────
const FLOAT_CARDS = [
  { label: "Demo Balance", value: "$10,247.80", sub: "USD · Live", color: "border-green-500/25 bg-green-500/5", dot: "bg-green-500", style: { animation: "floatA 7s ease-in-out infinite" } },
  { label: "Today's P&L",  value: "+$127.50",   sub: "8 trades",   color: "border-blue-500/25 bg-blue-500/5",  dot: "bg-blue-400",  style: { animation: "floatB 9s ease-in-out infinite 1s" } },
  { label: "Win Streak",   value: "🔥 5",        sub: "+50 XP each", color: "border-orange-500/25 bg-orange-500/5", dot: "bg-orange-400", style: { animation: "floatC 8s ease-in-out infinite 2s" } },
];

const COMMANDS = [
  "Buy $10 rise on Volatility 100 for 5 minutes",
  "What is my current balance?",
  "Show EUR/USD price",
  "Sell $25 fall on Bitcoin for 1 minute",
  "How am I doing today?",
];

const FEATURES = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
    title: "Voice & Text Trading",
    desc: "Speak or type naturally. The AI parses your intent, validates the trade, and executes — no form filling.",
    glow: "group-hover:shadow-red-500/20",
    accent: "text-red-400", border: "group-hover:border-red-500/30",
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    title: "Live Market Data",
    desc: "Real-time prices from Deriv's WebSocket API. Ask for any market and get a quote with AI trend commentary.",
    glow: "group-hover:shadow-blue-500/20",
    accent: "text-blue-400", border: "group-hover:border-blue-500/30",
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
    title: "AI Trading Coach",
    desc: "Knows your real balance, P&L, open trades, win streak and quests. Coaches you — not a generic chatbot.",
    glow: "group-hover:shadow-purple-500/20",
    accent: "text-purple-400", border: "group-hover:border-purple-500/30",
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>,
    title: "Ranked & Gamified",
    desc: "XP, levels, 16 quests, win streaks, power cards, and a global leaderboard. Demo trading feels like a ranked ladder.",
    glow: "group-hover:shadow-yellow-500/20",
    accent: "text-yellow-400", border: "group-hover:border-yellow-500/30",
  },
];

const STEPS = [
  { num: "01", title: "Connect your Deriv account", desc: "One-click OAuth. Your credentials never touch our servers." },
  { num: "02", title: "Talk to the AI", desc: "Ask about prices, check your balance, or just say the trade you want to make." },
  { num: "03", title: "Confirm & execute", desc: "The AI shows you cost and payout. Say \"confirm\" — it executes on the real Deriv API." },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function LoginPage({ error }: { error?: string }) {
  const command = useTypewriter(COMMANDS);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes floatA { 0%,100%{transform:translateY(0px) rotate(-1deg)} 50%{transform:translateY(-18px) rotate(1deg)} }
        @keyframes floatB { 0%,100%{transform:translateY(0px) rotate(1deg)}  50%{transform:translateY(-14px) rotate(-1deg)} }
        @keyframes floatC { 0%,100%{transform:translateY(-8px) rotate(0deg)} 50%{transform:translateY(8px) rotate(1.5deg)} }
        @keyframes orbDrift1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.08)} 66%{transform:translate(-30px,50px) scale(0.95)} }
        @keyframes orbDrift2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,60px) scale(1.05)} 66%{transform:translate(40px,-30px) scale(0.97)} }
        @keyframes orbDrift3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-50px) scale(1.1)} }
        @keyframes gridPulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes beamSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes particleDrift {
          0%  { transform: translate(0,0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100%{ transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #ef4444, #f97316, #ef4444, #dc2626, #ef4444);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .feature-card { transition: all 0.3s ease; }
        .feature-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* ── Background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "linear-gradient(#ffffff22 1px, transparent 1px), linear-gradient(90deg, #ffffff22 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "gridPulse 6s ease-in-out infinite",
        }} />
        {/* Orbs */}
        <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full opacity-[0.12]" style={{
          background: "radial-gradient(circle, #ef4444 0%, #991b1b 40%, transparent 70%)",
          filter: "blur(80px)",
          animation: "orbDrift1 18s ease-in-out infinite",
        }} />
        <div className="absolute bottom-[5%] left-[-15%] w-[600px] h-[600px] rounded-full opacity-[0.08]" style={{
          background: "radial-gradient(circle, #7c3aed 0%, #4c1d95 40%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orbDrift2 22s ease-in-out infinite",
        }} />
        <div className="absolute top-[40%] left-[35%] w-[400px] h-[400px] rounded-full opacity-[0.06]" style={{
          background: "radial-gradient(circle, #2563eb 0%, #1e3a8a 40%, transparent 70%)",
          filter: "blur(70px)",
          animation: "orbDrift3 14s ease-in-out infinite",
        }} />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-50 border-b border-white/5 bg-[#0a0a0f]/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center font-black text-sm glow-red">T</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0a0a0f] pulse-glow" />
          </div>
          <span className="font-bold text-base tracking-tight">TradeGPT</span>
        </div>
        <a href="/api/auth/login" className="flex items-center gap-2 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold rounded-xl px-5 py-2 text-sm transition-all glow-red">
          Connect Deriv
        </a>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left — copy */}
            <div className="flex-1 flex flex-col items-start" style={{ animation: "fadeUp 0.7s ease both" }}>
              {/* Badge */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-400 mb-8">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-glow" />
                Live · Powered by Deriv API V2 & Claude AI
              </div>

              {/* Logo */}
              <div className="relative mb-7">
                {/* Spinning ring */}
                <div className="absolute inset-[-8px] rounded-3xl border border-red-500/30" style={{ animation: "beamSpin 8s linear infinite" }} />
                <div className="absolute inset-[-16px] rounded-3xl border border-red-500/10 border-dashed" style={{ animation: "beamSpin 14s linear infinite reverse" }} />
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center font-black text-2xl glow-red relative z-10">T</div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0a0f] pulse-glow z-10" />
              </div>

              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-4">
                Trade with your<br />
                <span className="shimmer-text">voice.</span>
                <span className="text-white"> Or just type.</span>
              </h1>

              <p className="text-gray-400 text-lg leading-relaxed mb-6 max-w-md">
                TradeGPT turns natural language into real Deriv trades. No charts to stare at. No buttons to click. Just talk.
              </p>

              {/* Typewriter */}
              <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 mb-8 w-full max-w-md">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 flex-shrink-0">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
                <span className="text-gray-300 text-sm flex-1 min-h-[20px]">
                  {command}
                  <span className="inline-block w-0.5 h-4 bg-red-400 ml-0.5 animate-pulse align-middle" />
                </span>
              </div>

              {error && (
                <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-2xl px-5 py-3 w-full max-w-md">
                  Auth failed: {error.replace(/_/g, " ")}. Please try again.
                </div>
              )}

              <div className="flex items-center gap-3">
                <a href="/api/auth/login" className="flex items-center gap-2.5 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold rounded-2xl px-8 py-4 transition-all shadow-lg glow-red text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Connect Deriv Account
                </a>
                <a href="#features" className="text-gray-500 hover:text-gray-300 text-sm transition-colors px-2">
                  See features ↓
                </a>
              </div>

              <p className="text-gray-700 text-xs mt-4">Deriv OAuth2 · No passwords stored · Demo account by default</p>
            </div>

            {/* Right — demo chat + floating cards */}
            <div className="flex-1 relative flex items-center justify-center min-h-[420px] w-full max-w-sm lg:max-w-none" style={{ animation: "fadeUp 0.7s ease 0.2s both" }}>

              {/* Floating stat cards */}
              {FLOAT_CARDS.map((card, i) => (
                <div
                  key={i}
                  className={`absolute hidden lg:flex flex-col gap-0.5 border ${card.color} rounded-2xl px-4 py-3 backdrop-blur-sm bg-[#0a0a0f]/60 min-w-[140px] shadow-lg`}
                  style={{
                    ...card.style,
                    top:   i === 0 ? "0%"   : i === 1 ? "60%" : "30%",
                    left:  i === 0 ? "-12%" : i === 1 ? "72%" : "-18%",
                    zIndex: 20,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${card.dot}`} />
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">{card.label}</span>
                  </div>
                  <span className="text-white font-bold text-base">{card.value}</span>
                  <span className="text-gray-600 text-[10px]">{card.sub}</span>
                </div>
              ))}

              {/* Glow behind chat */}
              <div className="absolute inset-0 rounded-3xl opacity-20" style={{
                background: "radial-gradient(ellipse at center, #ef4444 0%, transparent 70%)",
                filter: "blur(40px)",
              }} />

              {/* Chat card */}
              <div className="relative z-10 w-full max-w-[300px] bg-[#0d0d14]/90 border border-white/10 rounded-3xl p-5 backdrop-blur-xl shadow-2xl">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-gray-600 text-[10px]">TradeGPT</span>
                </div>
                <ChatDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Everything you need.</h2>
            <p className="text-gray-500 text-sm">Nothing you don&apos;t. Built on Deriv API V2 with live WebSocket connections.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className={`feature-card group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/8 ${f.border} p-6 shadow-lg hover:shadow-xl ${f.glow}`}>
                {/* Animated gradient corner */}
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
                }} />
                <div className={`mb-4 ${f.accent}`}>{f.icon}</div>
                <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Up and trading in 30 seconds.</h2>
            <p className="text-gray-500 text-sm">No setup. No API keys. Just your Deriv account.</p>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-10 bottom-10 w-px bg-gradient-to-b from-red-500/40 via-white/10 to-transparent hidden sm:block" />
            <div className="flex flex-col gap-6">
              {STEPS.map((step) => (
                <div key={step.num} className="flex gap-5 items-start group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-900/20 border border-red-500/25 flex items-center justify-center text-xs font-bold text-red-400 group-hover:border-red-500/50 transition-colors relative z-10">
                    {step.num}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="font-semibold text-white text-sm mb-1">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-transparent to-purple-500/5 p-12">
            {/* Glow */}
            <div className="absolute inset-0 opacity-30" style={{
              background: "radial-gradient(ellipse at 50% 100%, #ef4444 0%, transparent 60%)",
              filter: "blur(40px)",
            }} />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                Ready to trade<br /><span className="shimmer-text">differently?</span>
              </h2>
              <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Connect your Deriv demo account and place your first AI-powered trade in under a minute.
              </p>
              <a href="/api/auth/login" className="inline-flex items-center gap-2.5 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold rounded-2xl px-10 py-4 transition-all shadow-xl glow-red text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Connect Deriv Account
              </a>
              <p className="text-gray-700 text-xs mt-5">Real money at risk · Trade responsibly</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center font-black text-[9px]">T</div>
          <span className="text-gray-600 text-xs">TradeGPT · Powered by Deriv API V2 & Anthropic Claude</span>
        </div>
        <span className="text-gray-700 text-xs">Real money at risk · Trade responsibly</span>
      </footer>

    </main>
  );
}
