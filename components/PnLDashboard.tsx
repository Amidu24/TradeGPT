"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface DashboardData {
  balance: { amount: number; currency: string };
  portfolio: { contracts: Array<Record<string, unknown>> };
  stats: {
    todayPnl: number;
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    todayTrades: number;
  };
  recentTrades: Array<{
    contract_id: number;
    shortcode: string;
    buy_price: number;
    sell_price: number;
    pnl: number;
    purchase_time: number;
    sell_time: number;
  }>;
  equityCurve: number[];
  recentStatement: Array<Record<string, unknown>>;
}

function EquityCurve({ data }: { data: number[] }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-full text-gray-600 text-xs">No trade data yet</div>
  );

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 80;
  const pad = 8;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const isPositive = data[data.length - 1] >= 0;
  const color = isPositive ? "#22c55e" : "#ef4444";
  const fillId = `fill-${isPositive ? "green" : "red"}`;

  const last = points[points.length - 1]?.split(",") ?? [w - pad, h / 2];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Zero line */}
      {min < 0 && max > 0 && (
        <line
          x1={pad} y1={h - pad - ((0 - min) / range) * (h - pad * 2)}
          x2={w - pad} y2={h - pad - ((0 - min) / range) * (h - pad * 2)}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4,4"
        />
      )}
      {/* Fill */}
      <path
        d={`M ${points.join(" L ")} L ${last[0]},${h - pad} L ${pad},${h - pad} Z`}
        fill={`url(#${fillId})`}
      />
      {/* Line */}
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* End dot */}
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

function StatCard({
  label, value, sub, positive, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  icon: string;
}) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${positive === undefined ? "text-white" : positive ? "text-green-400" : "text-red-400"}`}>
        {value}
      </div>
      {sub && <div className="text-gray-500 text-xs">{sub}</div>}
    </div>
  );
}

function extractSymbol(shortcode: string): string {
  // shortcode format: "CALL_R_100_2.00_..." or "CALL_frxEURUSD_..."
  const parts = shortcode?.split("_") ?? [];
  if (parts.length >= 3) return parts.slice(1, 3).join("_");
  return shortcode ?? "";
}

export default function PnLDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevContractIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json() as DashboardData;
      setData(json);
      setLastUpdated(new Date());

      // Detect newly settled trades and fire game events
      const trades = json.recentTrades ?? [];
      if (isFirstLoad.current) {
        // Baseline — don't fire for existing trades
        prevContractIds.current = new Set(trades.map((t) => t.contract_id));
        isFirstLoad.current = false;
      } else {
        for (const trade of trades) {
          if (!prevContractIds.current.has(trade.contract_id)) {
            window.dispatchEvent(
              new CustomEvent("tradeSettled", {
                detail: {
                  win: trade.pnl > 0,
                  pnl: trade.pnl,
                  stake: trade.buy_price,
                  symbol: extractSymbol(trade.shortcode),
                },
              })
            );
          }
        }
        prevContractIds.current = new Set(trades.map((t) => t.contract_id));
      }
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetch_]);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 text-sm">
        Failed to load dashboard. Check your connection.
      </div>
    );
  }

  const { balance, stats, recentTrades, equityCurve, portfolio } = data;
  const openPositions = portfolio.contracts;

  return (
    <div className="h-full overflow-y-auto px-5 py-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Live Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-glow" />
          <span className="text-gray-500 text-xs">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Updating..."}
          </span>
          <button onClick={fetch_} className="text-gray-600 hover:text-gray-400 transition-colors ml-1" title="Refresh">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Balance"
          value={`${Number(balance.amount).toFixed(2)}`}
          sub={balance.currency}
          icon="💰"
        />
        <StatCard
          label="Today's P&L"
          value={`${stats.todayPnl >= 0 ? "+" : ""}${stats.todayPnl.toFixed(2)}`}
          sub={`${stats.todayTrades} trade${stats.todayTrades !== 1 ? "s" : ""} today`}
          positive={stats.todayPnl >= 0}
          icon="📅"
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.totalTrades} total trades`}
          positive={stats.winRate >= 50}
          icon="🎯"
        />
        <StatCard
          label="Total P&L"
          value={`${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`}
          sub="All time"
          positive={stats.totalPnl >= 0}
          icon="📈"
        />
      </div>

      {/* Equity Curve */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Equity Curve</span>
          <span className="text-gray-600 text-xs">Last {equityCurve.length} trades</span>
        </div>
        <div className="h-20">
          <EquityCurve data={equityCurve} />
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Open Positions</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${openPositions.length > 0 ? "bg-green-500/20 text-green-400" : "bg-white/5 text-gray-600"}`}>
            {openPositions.length} open
          </span>
        </div>
        {openPositions.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">No open positions</p>
        ) : (
          <div className="space-y-2">
            {openPositions.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-white text-xs font-medium">{String(c.contract_type)} · {String(c.symbol)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Stake: ${String(c.buy_price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-xs font-mono font-semibold">Payout: ${String(c.payout)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Recent Trades</span>
        </div>
        {recentTrades.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">No completed trades yet</p>
        ) : (
          <div className="space-y-2">
            {recentTrades.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.pnl >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                  <div>
                    <p className="text-white text-xs font-mono truncate max-w-[120px]">{t.shortcode?.split("_")[0] ?? "TRADE"}</p>
                    <p className="text-gray-600 text-xs">
                      {new Date(Number(t.purchase_time) * 1000).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-mono font-semibold ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                  </p>
                  <p className="text-gray-600 text-xs">Stake ${Number(t.buy_price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-2" />
    </div>
  );
}
