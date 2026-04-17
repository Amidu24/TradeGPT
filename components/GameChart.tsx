"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

const SYMBOLS = [
  { symbol: "1HZ100V",   display: "VOL 100",    color: "#f43f5e" },
  { symbol: "1HZ75V",    display: "VOL 75",     color: "#f97316" },
  { symbol: "frxEURUSD", display: "EUR/USD",    color: "#38bdf8" },
  { symbol: "cryBTCUSD", display: "BTC/USD",    color: "#fbbf24" },
  { symbol: "BOOM1000",  display: "BOOM 1000",  color: "#34d399" },
  { symbol: "CRASH1000", display: "CRASH 1000", color: "#a78bfa" },
];

type Direction = "up" | "down" | "flat";

// ─────────────────────────────────────────────────────────────────────────────
// Temple Run–style human character
// Rendering order: back leg → back arm → torso/head → front arm → front leg
// ─────────────────────────────────────────────────────────────────────────────
function Runner({ direction, color }: { direction: Direction; color: string }) {
  return (
    <>
      <style>{`
        /* ── stride timing: 0.30 s per half-stride ── */
        @keyframes gc-rthigh { 0%,100%{transform:rotate(-34deg)} 50%{transform:rotate(34deg)} }
        @keyframes gc-lthigh { 0%,100%{transform:rotate( 34deg)} 50%{transform:rotate(-34deg)} }

        /* shin lags thigh — folds behind on back-swing, extends on forward-swing */
        @keyframes gc-rshin  {
          0%  {transform:rotate( 8deg)}
          28% {transform:rotate(-6deg)}
          60% {transform:rotate(44deg)}
          100%{transform:rotate( 8deg)}
        }
        @keyframes gc-lshin  {
          0%  {transform:rotate(44deg)}
          28% {transform:rotate( 8deg)}
          60% {transform:rotate(-6deg)}
          100%{transform:rotate(44deg)}
        }

        /* arms opposite to same-side leg */
        @keyframes gc-ruarm  { 0%,100%{transform:rotate( 30deg)} 50%{transform:rotate(-30deg)} }
        @keyframes gc-luarm  { 0%,100%{transform:rotate(-30deg)} 50%{transform:rotate( 30deg)} }
        @keyframes gc-rfarm  { 0%,100%{transform:rotate(-14deg)} 50%{transform:rotate( 24deg)} }
        @keyframes gc-lfarm  { 0%,100%{transform:rotate( 24deg)} 50%{transform:rotate(-14deg)} }

        /* hair bounce + body bob */
        @keyframes gc-hair   { 0%,100%{transform:rotate(-5deg) translateY(0)} 50%{transform:rotate(5deg) translateY(-1.5px)} }
        @keyframes gc-bob    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }

        .gc-rthigh{transform-origin:0 0;animation:gc-rthigh .30s linear infinite}
        .gc-lthigh{transform-origin:0 0;animation:gc-lthigh .30s linear infinite}
        .gc-rshin {transform-origin:0 0;animation:gc-rshin  .30s linear infinite}
        .gc-lshin {transform-origin:0 0;animation:gc-lshin  .30s linear infinite}
        .gc-ruarm {transform-origin:0 0;animation:gc-ruarm  .30s linear infinite}
        .gc-luarm {transform-origin:0 0;animation:gc-luarm  .30s linear infinite}
        .gc-rfarm {transform-origin:0 0;animation:gc-rfarm  .30s linear infinite}
        .gc-lfarm {transform-origin:0 0;animation:gc-lfarm  .30s linear infinite}
        .gc-hair  {transform-origin:28px 5px;animation:gc-hair .30s linear infinite}
        .gc-bob   {animation:gc-bob .15s linear infinite}
      `}</style>

      {/*
        viewBox 56 × 84 — layout top→bottom:
          hair    y  0– 8
          head    cy 13  r 10
          neck    y 22–27
          torso   y 25–50
          belt    y 50–54
          hips    y 54
          thigh   14 px  → knee y 68
          shin    13 px  → ankle y 81
          boot    3 px   → sole  y 84
      */}
      <svg
        width="56"
        height="84"
        viewBox="0 0 56 84"
        style={{
          filter: `drop-shadow(0 3px 10px rgba(0,0,0,.95))
                   drop-shadow(0 0 7px ${color}55)`,
          transform:
            direction === "up"
              ? "rotate(-13deg) translateY(-3px) scale(1.04)"
              : direction === "down"
              ? "rotate(13deg) translateY(3px)"
              : "rotate(0deg)",
          transition: "transform .12s ease-out",
        }}
      >
        <g className="gc-bob">

          {/* ══ BACK LEG (right — behind body) ══ */}
          <g transform="translate(31,54)">
            <g className="gc-rthigh">
              <rect x="-4.5" y="0" width="9" height="15" rx="3" fill="#1c4258" />
              <g transform="translate(0,15)">
                <g className="gc-rshin">
                  <rect x="-4" y="0" width="8" height="14" rx="3" fill="#183a50" />
                  {/* boot */}
                  <rect x="-5.5" y="11.5" width="11" height="4.5" rx="2" fill="#211008" />
                  <path d="M-6 15.5 Q0 19 6 15.5" fill="#2e160a" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ BACK ARM (left — behind body) ══ */}
          <g transform="translate(15,29)">
            <g className="gc-luarm">
              <rect x="-3" y="0" width="6" height="11" rx="3" fill="#cc7030" />
              <g transform="translate(0,11)">
                <g className="gc-lfarm">
                  <rect x="-2.5" y="0" width="5" height="9" rx="2.5" fill="#cc7030" />
                  <ellipse cx="0" cy="10" rx="3.5" ry="2.5" fill="#b55e22" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ TORSO — khaki shirt ══ */}
          <path d="M14 27 L13 50 L43 50 L42 27 L37 25 L28 26 L19 25 Z" fill="#c9a87a" />
          {/* left shading */}
          <path d="M14 27 L13 50 L19 50 L19 27 Z" fill="#a88850" opacity=".35" />
          {/* right shading */}
          <path d="M37 27 L37 50 L43 50 L42 27 Z" fill="#a88850" opacity=".25" />
          {/* centre button line */}
          <line x1="28" y1="26" x2="28" y2="50" stroke="#a08050" strokeWidth=".7" opacity=".5" />
          {/* collar */}
          <path d="M23 25 L20.5 29 L28 27 L35.5 29 L33 25 L28 28 Z" fill="#f4f0e8" />
          {/* sleeve roll cuffs */}
          <rect x="10" y="37" width="7"  height="2.5" rx="1" fill="#b89060" />
          <rect x="39" y="37" width="7"  height="2.5" rx="1" fill="#b89060" />

          {/* ══ BELT ══ */}
          <rect x="13" y="50" width="30" height="3.5" rx="1.2" fill="#38180a" />
          {/* buckle */}
          <rect x="24" y="49.5" width="8" height="4.5" rx=".8" fill="#c8900a" />
          <rect x="25.5" y="50.5" width="5" height="2.5" rx=".5" fill="#8a6208" />
          <rect x="26" y="51" width="2" height=".8" rx=".3" fill="#e8b820" opacity=".75" />

          {/* ══ NECK ══ */}
          <rect x="24" y="21" width="8" height="5.5" rx="3" fill="#e89050" />

          {/* ══ HEAD ══ */}
          <ellipse cx="28" cy="13" rx="10.5" ry="10" fill="#f0a060" />
          {/* jawline shadow */}
          <ellipse cx="28" cy="18" rx="8" ry="5.5" fill="#df8840" opacity=".22" />
          {/* ear */}
          <ellipse cx="38.5" cy="13.5" rx="2.5" ry="3" fill="#e89050" />
          <ellipse cx="38.8" cy="13.5" rx="1.2" ry="1.7" fill="#c07035" opacity=".5" />

          {/* ══ HAIR — orange spikes ══ */}
          <g className="gc-hair">
            <ellipse cx="27" cy="5" rx="10.5" ry="6" fill="#c03010" />
            <ellipse cx="24" cy="4" rx="5.5" ry="3.5" fill="#d44018" opacity=".7" />
            {/* spiky tips */}
            <polygon points="17,7 13,0 19,5"  fill="#b02a0a" />
            <polygon points="22,3 19,0 25,4"  fill="#c83010" />
            <polygon points="27,2 26,0 30,3"  fill="#d84518" />
            <polygon points="33,3 31,0 35,5"  fill="#c03010" />
            <polygon points="37,6 37,1 41,7"  fill="#a82808" />
            {/* forelock */}
            <path d="M19 9 Q22 14 23 17" stroke="#b82a0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>

          {/* ══ FACE ══ */}
          {/* eye whites */}
          <ellipse cx="23.5" cy="13" rx="2.2" ry="2.3" fill="white" />
          <ellipse cx="31.5" cy="13" rx="2.2" ry="2.3" fill="white" />
          {/* iris */}
          <ellipse cx="23.8" cy="13.3" rx="1.4" ry="1.5" fill="#3a1a08" />
          <ellipse cx="31.8" cy="13.3" rx="1.4" ry="1.5" fill="#3a1a08" />
          {/* pupil */}
          <circle cx="24"   cy="13.2" r=".6" fill="#120800" />
          <circle cx="32"   cy="13.2" r=".6" fill="#120800" />
          {/* highlight */}
          <circle cx="24.6" cy="12.5" r=".5" fill="rgba(255,255,255,.9)" />
          <circle cx="32.6" cy="12.5" r=".5" fill="rgba(255,255,255,.9)" />
          {/* eyebrows */}
          <path d="M21 10.2 Q23.5 9 26 10.5" stroke="#6a2808" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M29 10.2 Q31.5 9 34 10.5" stroke="#6a2808" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* nose */}
          <path d="M27.5 16.5 L26 19 L30 19" stroke="#c07038" strokeWidth=".8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* grin */}
          <path d="M23 21 Q28 23.5 33 21" stroke="#b85828" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M24.5 21.2 Q28 23 31.5 21.2" stroke="rgba(255,255,255,.55)" strokeWidth=".8" fill="none" strokeLinecap="round" />

          {/* ══ FRONT ARM (right — in front of body) ══ */}
          <g transform="translate(41,29)">
            <g className="gc-ruarm">
              <rect x="-3" y="0" width="6" height="11" rx="3" fill="#e89050" />
              <rect x="-3.5" y="9" width="7" height="2.5" rx="1" fill="#b89060" />
              <g transform="translate(0,11)">
                <g className="gc-rfarm">
                  <rect x="-2.5" y="0" width="5" height="9" rx="2.5" fill="#e89050" />
                  <ellipse cx="0" cy="10" rx="3.5" ry="2.5" fill="#cf7535" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ FRONT LEG (left — in front of body) ══ */}
          <g transform="translate(22,54)">
            <g className="gc-lthigh">
              {/* thigh */}
              <rect x="-4.5" y="0" width="9" height="15" rx="3" fill="#2d5f73" />
              <rect x="-2.5" y="0" width="3.5" height="15" rx="1.5" fill="#3a748a" opacity=".4" />
              <g transform="translate(0,15)">
                <g className="gc-lshin">
                  {/* shin */}
                  <rect x="-4" y="0" width="8" height="14" rx="3" fill="#285468" />
                  {/* boot */}
                  <rect x="-5.5" y="11.5" width="11" height="4.5" rx="2" fill="#2c1408" />
                  {/* boot toe cap */}
                  <path d="M-6 15.5 Q0 19 6 15.5" fill="#3d1c0c" />
                  {/* boot shine */}
                  <path d="M-3 12.5 Q0 11.5 3 12.5" stroke="#4a2812" strokeWidth=".8" fill="none" strokeLinecap="round" />
                </g>
              </g>
            </g>
          </g>

        </g>{/* gc-bob */}
      </svg>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GameChart
// ─────────────────────────────────────────────────────────────────────────────
export default function GameChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef          = useRef<IChartApi | null>(null);
  const seriesRef         = useRef<ISeriesApi<"Area"> | null>(null);
  const prevPriceRef      = useRef<number | null>(null);
  const lastTimeRef       = useRef<number>(0);

  const [selected,     setSelected]     = useState(SYMBOLS[0]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [direction,    setDirection]    = useState<Direction>("flat");
  const [runnerY,      setRunnerY]      = useState<number | null>(null);
  const [connected,    setConnected]    = useState(false);
  const [tickCount,    setTickCount]    = useState(0);
  const [firstPrice,   setFirstPrice]   = useState<number | null>(null);

  // ── Initialise chart once ────────────────────────────────────────────
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width:  el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor:  "rgba(156,163,175,1)",
        fontSize:   11,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, 'Courier New', monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255,255,255,0.18)", width: 1,
          style: LineStyle.Dashed, labelBackgroundColor: "#1a1a2e",
        },
        horzLine: {
          color: "rgba(255,255,255,0.18)", width: 1,
          style: LineStyle.Dashed, labelBackgroundColor: "#1a1a2e",
        },
      },
      rightPriceScale: {
        borderColor:   "rgba(255,255,255,0.06)",
        textColor:     "rgba(156,163,175,1)",
        scaleMargins:  { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor:    "rgba(255,255,255,0.06)",
        timeVisible:    true,
        secondsVisible: true,
        rightOffset:    8,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true },
    });

    const series = chart.addAreaSeries({
      lineColor:                    SYMBOLS[0].color,
      topColor:                     `${SYMBOLS[0].color}3a`,
      bottomColor:                  `${SYMBOLS[0].color}06`,
      lineWidth:                    2,
      crosshairMarkerVisible:       true,
      crosshairMarkerRadius:        5,
      crosshairMarkerBorderColor:   SYMBOLS[0].color,
      crosshairMarkerBackgroundColor: "#0a0a0f",
      lastValueVisible:             true,
      priceLineVisible:             true,
      priceLineColor:               `${SYMBOLS[0].color}70`,
      priceLineStyle:               LineStyle.Dashed,
      priceLineWidth:               1,
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // ── Restyle series when symbol changes ──────────────────────────────
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    s.applyOptions({
      lineColor:                    selected.color,
      topColor:                     `${selected.color}3a`,
      bottomColor:                  `${selected.color}06`,
      crosshairMarkerBorderColor:   selected.color,
      priceLineColor:               `${selected.color}70`,
    });
    s.setData([]);
    prevPriceRef.current = null;
    lastTimeRef.current  = 0;
    setCurrentPrice(null);
    setDirection("flat");
    setRunnerY(null);
    setTickCount(0);
    setFirstPrice(null);
  }, [selected]);

  // ── WebSocket live ticks ─────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket("wss://api.derivws.com/trading/v1/options/ws/public");

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ ticks: selected.symbol, subscribe: 1 }));
    };

    ws.onmessage = (ev: MessageEvent) => {
      const data = JSON.parse(ev.data as string) as {
        msg_type: string;
        tick?: { symbol: string; quote: number; epoch: number };
      };
      if (data.msg_type !== "tick" || !data.tick) return;

      const price = data.tick.quote;
      let   time  = (data.tick.epoch ?? Math.floor(Date.now() / 1000)) as UTCTimestamp;
      if (time <= lastTimeRef.current) time = (lastTimeRef.current + 1) as UTCTimestamp;
      lastTimeRef.current = time;

      const prev = prevPriceRef.current;
      const dir: Direction =
        prev === null ? "flat" : price > prev ? "up" : price < prev ? "down" : "flat";
      prevPriceRef.current = price;

      setCurrentPrice(price);
      setDirection(dir);
      setTickCount((n) => {
        if (n === 0) setFirstPrice(price);
        return n + 1;
      });

      seriesRef.current?.update({ time, value: price });

      // Position runner at the price line's pixel coordinate
      requestAnimationFrame(() => {
        // Coordinate is a branded number — treat it as number
        const coord = seriesRef.current?.priceToCoordinate(price);
        if (coord != null) setRunnerY(coord as unknown as number);
      });
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    return () => ws.close();
  }, [selected]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatPrice = (p: number) =>
    p > 1000
      ? p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : p.toFixed(5);

  const pctChange =
    firstPrice !== null && currentPrice !== null
      ? ((currentPrice - firstPrice) / firstPrice) * 100
      : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden gap-3 min-h-0 p-4">

      {/* ── Symbol tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {SYMBOLS.map((s) => (
          <button
            key={s.symbol}
            onClick={() => setSelected(s)}
            style={
              selected.symbol === s.symbol
                ? { borderColor: s.color, color: s.color, background: `${s.color}1a` }
                : {}
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selected.symbol === s.symbol
                ? ""
                : "border-white/[0.07] text-gray-500 hover:text-gray-300 hover:border-white/20"
            }`}
          >
            {s.display}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${connected ? "pulse-glow" : "bg-gray-700"}`}
            style={connected ? { backgroundColor: selected.color } : {}}
          />
          <span className="text-[11px] text-gray-500">
            {connected ? "Live" : "Connecting…"}
          </span>
        </div>
      </div>

      {/* ── Price + stats row ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-gray-600 tracking-widest uppercase mb-1">
            {selected.display} · Index
          </p>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span
              className="text-[2rem] font-mono font-bold tracking-tight tabular-nums leading-none"
              style={{ color: selected.color }}
            >
              {currentPrice !== null ? formatPrice(currentPrice) : "—"}
            </span>

            {pctChange !== null && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                  pctChange >= 0
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-red-500/10   text-red-400   border-red-500/20"
                }`}
              >
                {pctChange >= 0 ? "+" : ""}
                {pctChange.toFixed(3)}%
              </span>
            )}

            <span
              className={`text-sm font-bold ${
                direction === "up"   ? "text-green-400" :
                direction === "down" ? "text-red-400"   : "text-gray-600"
              }`}
            >
              {direction === "up" ? "▲" : direction === "down" ? "▼" : "─"}
            </span>
          </div>
        </div>

        <div className="text-right space-y-0.5 pt-0.5">
          <p className="text-gray-700 text-[10px]">{tickCount} ticks</p>
          <p className="text-gray-700 text-[10px]">scroll · zoom · drag</p>
        </div>
      </div>

      {/* ── Chart area ── */}
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0c0c14] min-h-0">

        {/* TradingView lightweight-charts mounts here */}
        <div ref={chartContainerRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {tickCount < 3 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#0c0c14]">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${selected.color}44`, borderTopColor: selected.color }}
            />
            <p className="text-gray-600 text-sm">Connecting to {selected.display}…</p>
          </div>
        )}

        {/* Runner — anchored to right edge at current price level */}
        {tickCount >= 3 && runnerY !== null && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              // 72 px from right = clear of the price-scale axis labels
              right: 72,
              // character is 84 px tall; feet are at ~80 px → offset 80 to land ON the line
              top:  Math.max(4, runnerY - 80),
              transition: "top .1s linear",
            }}
          >
            <Runner direction={direction} color={selected.color} />
          </div>
        )}
      </div>
    </div>
  );
}
