"use client";

import { useEffect, useRef, useState } from "react";

const CHART_SYMBOLS = [
  { symbol: "1HZ100V",   display: "VOL 100",    color: "#ef4444" },
  { symbol: "1HZ75V",    display: "VOL 75",     color: "#f97316" },
  { symbol: "frxEURUSD", display: "EUR/USD",    color: "#60a5fa" },
  { symbol: "cryBTCUSD", display: "BTC/USD",    color: "#fbbf24" },
  { symbol: "BOOM1000",  display: "BOOM 1000",  color: "#34d399" },
  { symbol: "CRASH1000", display: "CRASH 1000", color: "#a78bfa" },
];

const MAX_TICKS = 80;

type Direction = "up" | "down" | "flat";

// ── Animated Runner Character ─────────────────────────────────────────

function Runner({ direction, color }: { direction: Direction; color: string }) {
  return (
    <>
      <style>{`
        @keyframes gc-leg-swing {
          0%, 100% { transform: rotate(-28deg); }
          50%       { transform: rotate(28deg); }
        }
        @keyframes gc-arm-swing {
          0%, 100% { transform: rotate(-22deg); }
          50%       { transform: rotate(22deg); }
        }
        .gc-leg-l { transform-origin: 0 0; animation: gc-leg-swing 0.28s linear infinite; }
        .gc-leg-r { transform-origin: 0 0; animation: gc-leg-swing 0.28s linear infinite reverse; }
        .gc-arm-l { transform-origin: 0 0; animation: gc-arm-swing 0.28s linear infinite reverse; }
        .gc-arm-r { transform-origin: 0 0; animation: gc-arm-swing 0.28s linear infinite; }
      `}</style>

      <svg
        width="42"
        height="60"
        viewBox="0 0 42 60"
        style={{
          filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 16px ${color}50)`,
          // tilt forward on rise, backward on fall — matches the Y movement
          transform:
            direction === "up"
              ? "rotate(-14deg) translateY(-3px)"
              : direction === "down"
              ? "rotate(14deg) translateY(3px)"
              : "rotate(0deg)",
          transition: "transform 0.14s ease-out",
        }}
      >
        {/* ── Head ── */}
        <circle cx="21" cy="9" r="8.5" fill="#FFDBA4" />
        {/* Helmet top */}
        <path d="M12.5 9 Q12.5 0.5 21 0.5 Q29.5 0.5 29.5 9 Z" fill={color} />
        {/* Visor strip */}
        <rect x="12.5" y="9" width="17" height="3.5" rx="1" fill={`${color}aa`} />
        {/* Eyes */}
        <circle cx="17.5" cy="10.5" r="1.4" fill="#0f172a" />
        <circle cx="24.5" cy="10.5" r="1.4" fill="#0f172a" />

        {/* ── Torso ── */}
        <rect x="14" y="18" width="14" height="14" rx="3" fill={color} />
        {/* Chest number/stripe */}
        <rect x="19" y="18" width="4" height="14" rx="1.5" fill={`${color}55`} />

        {/* Shorts */}
        <rect x="14" y="30" width="14" height="7" rx="2.5" fill="#0f172a" />

        {/* ── Left arm — pivoted at shoulder (14, 22) ── */}
        <g transform="translate(14,22)">
          <g className="gc-arm-l">
            <line x1="0" y1="0" x2="-8" y2="9" stroke="#FFDBA4" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </g>

        {/* ── Right arm — pivoted at shoulder (28, 22) ── */}
        <g transform="translate(28,22)">
          <g className="gc-arm-r">
            <line x1="0" y1="0" x2="8" y2="9" stroke="#FFDBA4" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </g>

        {/* ── Left leg — pivoted at hip (17.5, 37) ── */}
        <g transform="translate(17.5,37)">
          <g className="gc-leg-l">
            <line x1="0" y1="0" x2="-4" y2="14" stroke="#FFDBA4" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="-5.5" cy="15.5" rx="6" ry="2.8" fill={color} />
          </g>
        </g>

        {/* ── Right leg — pivoted at hip (24.5, 37) ── */}
        <g transform="translate(24.5,37)">
          <g className="gc-leg-r">
            <line x1="0" y1="0" x2="4" y2="14" stroke="#FFDBA4" strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="5.5" cy="15.5" rx="6" ry="2.8" fill={color} />
          </g>
        </g>
      </svg>
    </>
  );
}

// ── Main GameChart Component ───────────────────────────────────────────

export default function GameChart() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const prevPriceRef  = useRef<number | null>(null);

  const [selected,     setSelected]     = useState(CHART_SYMBOLS[0]);
  const [history,      setHistory]      = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [direction,    setDirection]    = useState<Direction>("flat");
  const [charYPct,     setCharYPct]     = useState(50);
  const [connected,    setConnected]    = useState(false);

  // ── WebSocket ──────────────────────────────────────────────────────
  useEffect(() => {
    setHistory([]);
    setCurrentPrice(null);
    setDirection("flat");
    prevPriceRef.current = null;

    const ws = new WebSocket("wss://api.derivws.com/trading/v1/options/ws/public");

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ ticks: selected.symbol, subscribe: 1 }));
    };

    ws.onmessage = (ev: MessageEvent) => {
      const data = JSON.parse(ev.data as string) as {
        msg_type: string;
        tick?: { symbol: string; quote: number };
      };
      if (data.msg_type === "tick" && data.tick) {
        const price = data.tick.quote;
        const prev  = prevPriceRef.current;
        const dir: Direction =
          prev === null ? "flat" : price > prev ? "up" : price < prev ? "down" : "flat";
        prevPriceRef.current = price;
        setCurrentPrice(price);
        setDirection(dir);
        setHistory((h) => [...h, price].slice(-MAX_TICKS));
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    return () => ws.close();
  }, [selected]);

  // ── Canvas Draw ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || history.length < 2) return;

    const raf = requestAnimationFrame(() => {
      const W = container.clientWidth;
      const H = container.clientHeight;
      if (W === 0 || H === 0) return;

      canvas.width  = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const min   = Math.min(...history);
      const max   = Math.max(...history);
      const range = max - min || min * 0.001 || 1;
      const padY  = H * 0.1;
      const padR  = 72; // room for the runner on the right

      const toY = (p: number) => H - padY - ((p - min) / range) * (H - 2 * padY);
      const toX = (idx: number) => {
        const slotW = (W - padR) / (MAX_TICKS - 1);
        return (idx + MAX_TICKS - history.length) * slotW;
      };

      ctx.clearRect(0, 0, W, H);

      // ── Horizontal grid + price labels ──
      ctx.lineWidth   = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.font        = "10px monospace";
      ctx.fillStyle   = "rgba(255,255,255,0.18)";
      for (let r = 0; r <= 4; r++) {
        const y     = padY + (r / 4) * (H - 2 * padY);
        const label = max - (r / 4) * range;
        const str   = label > 1000 ? label.toFixed(2) : label.toFixed(5);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.fillText(str, 4, y - 3);
      }

      // ── Vertical guide lines ──
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      for (let c = 1; c < 8; c++) {
        const x = (c / 8) * (W - padR);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // ── Area fill ──
      const areaGrad = ctx.createLinearGradient(0, 0, 0, H);
      areaGrad.addColorStop(0, `${selected.color}28`);
      areaGrad.addColorStop(1, `${selected.color}04`);

      ctx.beginPath();
      history.forEach((p, i) => {
        const x = toX(i);
        const y = toY(p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineTo(toX(history.length - 1), H);
      ctx.lineTo(toX(0), H);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // ── Price line ──
      const lineGrad = ctx.createLinearGradient(0, 0, W - padR, 0);
      lineGrad.addColorStop(0, `${selected.color}50`);
      lineGrad.addColorStop(1, selected.color);

      ctx.beginPath();
      history.forEach((p, i) => {
        const x = toX(i);
        const y = toY(p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth   = 2;
      ctx.lineJoin    = "round";
      ctx.shadowColor = selected.color;
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // ── Tip dot (where runner stands) ──
      const tipX = toX(history.length - 1);
      const tipY = toY(history[history.length - 1]);

      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fillStyle   = selected.color;
      ctx.shadowColor = selected.color;
      ctx.shadowBlur  = 14;
      ctx.fill();
      ctx.shadowBlur  = 0;

      // ── Update runner vertical position ──
      setCharYPct((tipY / H) * 100);
    });

    return () => cancelAnimationFrame(raf);
  }, [history, selected]);

  // ── Helpers ────────────────────────────────────────────────────────
  const formatPrice = (p: number) =>
    p > 1000
      ? p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : p.toFixed(5);

  const pctChange =
    history.length >= 2
      ? (((history[history.length - 1] - history[0]) / history[0]) * 100).toFixed(3)
      : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4 min-h-0">

      {/* ── Symbol selector ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {CHART_SYMBOLS.map((s) => (
          <button
            key={s.symbol}
            onClick={() => setSelected(s)}
            style={
              selected.symbol === s.symbol
                ? { borderColor: s.color, color: s.color, background: `${s.color}18` }
                : {}
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              selected.symbol === s.symbol
                ? ""
                : "border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20"
            }`}
          >
            {s.display}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${connected ? "pulse-glow" : "bg-gray-600"}`}
            style={connected ? { backgroundColor: selected.color } : {}}
          />
          <span className="text-xs text-gray-400">{connected ? "Live" : "Connecting…"}</span>
        </div>
      </div>

      {/* ── Price display ── */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-mono font-bold" style={{ color: selected.color }}>
          {currentPrice !== null ? formatPrice(currentPrice) : "—"}
        </span>
        {pctChange !== null && (
          <span
            className={`text-sm font-semibold ${
              parseFloat(pctChange) >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {parseFloat(pctChange) >= 0 ? "▲" : "▼"} {Math.abs(parseFloat(pctChange))}%
          </span>
        )}
        <span className="text-gray-600 text-sm">{selected.display}</span>
        <span className="text-gray-700 text-xs ml-1">({history.length} ticks)</span>
      </div>

      {/* ── Canvas + Runner container ── */}
      <div
        ref={containerRef}
        className="relative flex-1 rounded-2xl overflow-hidden border border-white/5 bg-black/40 min-h-0"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Waiting overlay */}
        {history.length < 2 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${selected.color}60`, borderTopColor: "transparent" }}
            />
            <p className="text-gray-600 text-sm">Connecting to live market…</p>
          </div>
        )}

        {/* Runner character — sits at the tip of the price line */}
        {history.length >= 2 && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              right: 16,
              top: `${Math.max(8, Math.min(88, charYPct))}%`,
              transform: "translateY(-50%)",
              transition: "top 0.12s linear",
            }}
          >
            <Runner direction={direction} color={selected.color} />
          </div>
        )}
      </div>
    </div>
  );
}
