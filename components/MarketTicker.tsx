"use client";

import { useEffect, useRef, useState } from "react";

interface TickerItem {
  symbol: string;
  display: string;
  price: number | null;
  prevPrice: number | null;
}

const SYMBOLS: TickerItem[] = [
  { symbol: "frxEURUSD", display: "EUR/USD", price: null, prevPrice: null },
  { symbol: "frxGBPUSD", display: "GBP/USD", price: null, prevPrice: null },
  { symbol: "frxUSDJPY", display: "USD/JPY", price: null, prevPrice: null },
  { symbol: "cryBTCUSD", display: "BTC/USD", price: null, prevPrice: null },
  { symbol: "cryETHUSD", display: "ETH/USD", price: null, prevPrice: null },
  { symbol: "R_100", display: "VOL 100", price: null, prevPrice: null },
  { symbol: "R_75", display: "VOL 75", price: null, prevPrice: null },
  { symbol: "R_50", display: "VOL 50", price: null, prevPrice: null },
  { symbol: "BOOM1000", display: "BOOM 1000", price: null, prevPrice: null },
  { symbol: "CRASH1000", display: "CRASH 1000", price: null, prevPrice: null },
];

export default function MarketTicker() {
  const [tickers, setTickers] = useState<TickerItem[]>(SYMBOLS);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Subscribe to all symbols
      SYMBOLS.forEach(({ symbol }, i) => {
        setTimeout(() => {
          ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        }, i * 100); // stagger slightly to avoid flood
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.msg_type === "tick" && data.tick) {
        const { symbol, quote } = data.tick;
        setTickers((prev) =>
          prev.map((t) =>
            t.symbol === symbol
              ? { ...t, prevPrice: t.price, price: quote }
              : t
          )
        );
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
    };
  }, []);

  const formatPrice = (symbol: string, price: number) => {
    if (symbol.startsWith("cry") || price > 1000) {
      return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(symbol === "frxUSDJPY" ? 3 : 5);
  };

  const getDirection = (t: TickerItem) => {
    if (t.prevPrice === null || t.price === null) return "neutral";
    if (t.price > t.prevPrice) return "up";
    if (t.price < t.prevPrice) return "down";
    return "neutral";
  };

  const doubled = [...tickers, ...tickers];

  return (
    <div className="overflow-hidden border-b border-white/5 bg-black/30 backdrop-blur-sm relative">
      {/* Live badge */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-md px-2 py-0.5">
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 pulse-glow" : "bg-red-500"}`} />
        <span className="text-gray-500 text-[10px] font-medium">{connected ? "LIVE" : "..."}</span>
      </div>

      <div className="flex ticker-scroll whitespace-nowrap py-2 pl-20">
        {doubled.map((t, i) => {
          const dir = getDirection(t);
          return (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-xs">
              <span className="text-gray-400 font-medium">{t.display}</span>
              <span
                className={`font-mono transition-colors duration-300 ${
                  dir === "up" ? "text-green-400" : dir === "down" ? "text-red-400" : "text-white"
                }`}
              >
                {t.price !== null ? formatPrice(t.symbol, t.price) : "—"}
              </span>
              {dir !== "neutral" && (
                <span className={dir === "up" ? "text-green-500" : "text-red-500"}>
                  {dir === "up" ? "▲" : "▼"}
                </span>
              )}
              <span className="text-white/10 ml-1">|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
