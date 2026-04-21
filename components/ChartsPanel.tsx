"use client";

import { useEffect, useRef, useState } from "react";

interface Candle {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const SYMBOLS = [
  { symbol: "1HZ100V",   display: "VOL 100",   defaultGranularity: 60 },
  { symbol: "1HZ75V",    display: "VOL 75",    defaultGranularity: 60 },
  { symbol: "1HZ50V",    display: "VOL 50",    defaultGranularity: 60 },
  { symbol: "cryBTCUSD", display: "BTC/USD",   defaultGranularity: 3600 },
  { symbol: "cryETHUSD", display: "ETH/USD",   defaultGranularity: 3600 },
  { symbol: "frxEURUSD", display: "EUR/USD",   defaultGranularity: 3600 },
  { symbol: "BOOM1000",  display: "BOOM 1000", defaultGranularity: 60 },
  { symbol: "CRASH1000", display: "CRASH 1000",defaultGranularity: 60 },
];

const TIMEFRAMES = [
  { label: "1m",  granularity: 60 },
  { label: "5m",  granularity: 300 },
  { label: "15m", granularity: 900 },
  { label: "1h",  granularity: 3600 },
  { label: "4h",  granularity: 14400 },
  { label: "1d",  granularity: 86400 },
];

function fmtPrice(p: number) {
  if (p >= 10000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p >= 100)   return p.toFixed(2);
  if (p >= 1)     return p.toFixed(4);
  return p.toFixed(5);
}

function fmtTime(epoch: number, granularity: number) {
  const d = new Date(epoch * 1000);
  if (granularity >= 86400) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  if (granularity >= 3600)  return d.toLocaleTimeString([], { month: "short", day: "numeric", hour: "2-digit" });
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CandlestickChart({ candles, livePrice, granularity }: {
  candles: Candle[];
  livePrice: number | null;
  granularity: number;
}) {
  if (candles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-xs">Loading chart…</span>
        </div>
      </div>
    );
  }

  const W = 800, H = 380;
  const PAD = { top: 16, right: 72, bottom: 28, left: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allPrices = candles.flatMap(c => [c.high, c.low]);
  if (livePrice !== null) allPrices.push(livePrice);
  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const rawRange = rawMax - rawMin || rawMax * 0.001 || 1;
  const pad = rawRange * 0.08;
  const min = rawMin - pad;
  const max = rawMax + pad;
  const range = max - min;

  const toY = (p: number) => PAD.top + chartH - ((p - min) / range) * chartH;
  const slotW = chartW / candles.length;
  const bodyW = Math.max(2, Math.min(14, slotW * 0.65));
  const toX = (i: number) => PAD.left + (i + 0.5) * slotW;

  const priceLevels = Array.from({ length: 5 }, (_, i) => {
    const price = min + (i / 4) * range;
    return { price, y: toY(price) };
  });

  const step = Math.ceil(candles.length / 6);
  const timeLabels = candles
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i % step === 0)
    .map(({ c, i }) => ({ x: toX(i), label: fmtTime(c.epoch, granularity) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      {/* Horizontal grid */}
      {priceLevels.map(({ y }, i) => (
        <line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {/* Price axis */}
      {priceLevels.map(({ price, y }, i) => (
        <text key={i} x={W - PAD.right + 5} y={y + 3.5}
          fill="rgba(255,255,255,0.22)" fontSize="9" fontFamily="monospace">
          {fmtPrice(price)}
        </text>
      ))}
      {/* Time axis */}
      {timeLabels.map(({ x, label }, i) => (
        <text key={i} x={x} y={H - 6}
          fill="rgba(255,255,255,0.22)" fontSize="9" textAnchor="middle" fontFamily="monospace">
          {label}
        </text>
      ))}
      {/* Candles */}
      {candles.map((c, i) => {
        const x = toX(i);
        const bull = c.close >= c.open;
        const col = bull ? "#22c55e" : "#ef4444";
        const top = toY(Math.max(c.open, c.close));
        const bot = toY(Math.min(c.open, c.close));
        const bh = Math.max(1, bot - top);
        return (
          <g key={i}>
            <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={col} strokeWidth="1" opacity="0.6" />
            <rect x={x - bodyW / 2} y={top} width={bodyW} height={bh} fill={col} opacity="0.85" rx="0.5" />
          </g>
        );
      })}
      {/* Live price line */}
      {livePrice !== null && (() => {
        const ly = toY(livePrice);
        return (
          <g>
            <line x1={PAD.left} y1={ly} x2={W - PAD.right} y2={ly}
              stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" opacity="0.9" />
            <rect x={W - PAD.right + 1} y={ly - 9} width={PAD.right - 3} height={18} fill="#f59e0b" rx="3" />
            <text x={W - PAD.right + 4} y={ly + 4}
              fill="#0a0a0f" fontSize="9" fontWeight="bold" fontFamily="monospace">
              {fmtPrice(livePrice)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

export default function ChartsPanel() {
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0]);
  const [granularity, setGranularity] = useState(60);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  const symRef = useRef(selectedSymbol.symbol);
  symRef.current = selectedSymbol.symbol;

  useEffect(() => {
    setCandles([]);
    setLivePrice(null);
    setConnected(false);

    const ws = new WebSocket("wss://api.derivws.com/trading/v1/options/ws/public");

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        ticks_history: selectedSymbol.symbol,
        end: "latest",
        count: 100,
        style: "candles",
        granularity,
        req_id: 1,
      }));
      ws.send(JSON.stringify({ ticks: selectedSymbol.symbol, subscribe: 1, req_id: 2 }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data) as Record<string, unknown>;
      // Initial candle history
      if (data.req_id === 1 && Array.isArray(data.candles)) {
        setCandles((data.candles as Array<Record<string, unknown>>).map(c => ({
          epoch: Number(c.epoch),
          open:  Number(c.open),
          high:  Number(c.high),
          low:   Number(c.low),
          close: Number(c.close),
        })));
      }
      // Live tick updates current price
      if (data.msg_type === "tick") {
        const tick = data.tick as Record<string, unknown>;
        if (tick?.symbol === symRef.current) setLivePrice(Number(tick.quote));
      }
      // Live candle updates (ohlc messages)
      if (data.msg_type === "ohlc") {
        const ohlc = data.ohlc as Record<string, unknown>;
        if (!ohlc) return;
        const updated: Candle = {
          epoch: Number(ohlc.epoch),
          open:  Number(ohlc.open),
          high:  Number(ohlc.high),
          low:   Number(ohlc.low),
          close: Number(ohlc.close),
        };
        setCandles(prev => {
          if (prev.length === 0) return [updated];
          const last = prev[prev.length - 1];
          if (last.epoch === updated.epoch) return [...prev.slice(0, -1), updated];
          return [...prev, updated].slice(-100);
        });
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => ws.close();
  }, [selectedSymbol, granularity]);

  const firstClose = candles[0]?.close ?? 0;
  const lastClose  = candles[candles.length - 1]?.close ?? 0;
  const currentPrice = livePrice ?? lastClose;
  const changeAbs = firstClose > 0 ? currentPrice - firstClose : 0;
  const changePct = firstClose > 0 ? (changeAbs / firstClose) * 100 : 0;
  const isUp = changeAbs >= 0;

  return (
    <div className="flex flex-col h-full bg-black/20 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 space-y-2.5">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className="text-white text-sm font-semibold">Live Charts</span>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${connected ? "bg-green-500/15 text-green-400" : "bg-white/5 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
              {connected ? "LIVE" : "Connecting…"}
            </span>
          </div>
          {currentPrice > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white font-mono font-bold text-sm">{fmtPrice(currentPrice)}</span>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-lg ${isUp ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                {isUp ? "+" : ""}{changePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Symbol selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SYMBOLS.map(s => (
            <button
              key={s.symbol}
              onClick={() => { setSelectedSymbol(s); setGranularity(s.defaultGranularity); }}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                selectedSymbol.symbol === s.symbol
                  ? "bg-red-500/25 text-red-300 border border-red-500/40"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
            >
              {s.display}
            </button>
          ))}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.granularity}
              onClick={() => setGranularity(tf.granularity)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                granularity === tf.granularity
                  ? "bg-white/15 text-white border border-white/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0 p-3">
        <CandlestickChart candles={candles} livePrice={livePrice} granularity={granularity} />
      </div>
    </div>
  );
}
