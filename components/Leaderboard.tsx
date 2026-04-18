"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLeaderboard,
  getUserStats,
  calculateRank,
  calculateScore,
  type LeaderboardEntry,
  type Period,
} from "@/lib/leaderboard";

interface Props {
  userId: string;
  username: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  weekly:  "Weekly",
  monthly: "Monthly",
  alltime: "All Time",
};

const MEDAL = ["🥇", "🥈", "🥉"];

function fmtXP(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtPnL(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  return `${n >= 0 ? "+" : "-"}$${abs}`;
}

// ── Row medal / position indicator ───────────────────────────────────────────
function Position({ pos, isUser }: { pos: number; isUser: boolean }) {
  if (pos <= 3) {
    return (
      <span className="text-lg leading-none w-7 text-center flex-shrink-0">
        {MEDAL[pos - 1]}
      </span>
    );
  }
  return (
    <span className={`text-xs font-bold w-7 text-center flex-shrink-0 ${isUser ? "text-red-400" : "text-gray-500"}`}>
      #{pos}
    </span>
  );
}

// ── Rank badge pill ───────────────────────────────────────────────────────────
function RankBadge({ entry }: { entry: LeaderboardEntry }) {
  const rank = calculateRank(calculateScore(entry.totalXP));
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
      style={{ color: rank.color, borderColor: `${rank.color}40`, background: `${rank.color}18` }}
    >
      {rank.emoji} {rank.tier}
    </span>
  );
}

// ── Summary card shown at the top for the current user ───────────────────────
function SummaryCard({
  userId, username, entries,
}: {
  userId: string;
  username: string;
  entries: LeaderboardEntry[];
}) {
  const pos   = entries.findIndex((e) => e.userId === userId) + 1;
  const stats = getUserStats(userId);
  const xp    = stats?.totalXP ?? 0;
  const rank  = calculateRank(calculateScore(xp));

  return (
    <div
      className="rounded-2xl border p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ background: `${rank.color}0d`, borderColor: `${rank.color}30` }}
    >
      {/* Left: rank & position */}
      <div className="flex items-center gap-3 flex-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border"
          style={{ background: `${rank.color}20`, borderColor: `${rank.color}40` }}
        >
          {rank.emoji}
        </div>
        <div>
          <p className="text-white text-sm font-bold leading-tight">
            {username.length > 14 ? username.slice(0, 14) + "…" : username}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: rank.color }}>
            {rank.tier} · #{pos > 0 ? pos : "—"} on leaderboard
          </p>
        </div>
      </div>

      {/* Right: stats */}
      <div className="flex items-center gap-4 text-center sm:text-right flex-wrap">
        <div>
          <p className="text-sm font-mono font-bold text-yellow-400">
            {xp.toLocaleString()} XP
          </p>
          <p className="text-gray-600 text-[10px] uppercase tracking-wide">Total XP</p>
        </div>
        <div>
          <p className={`text-sm font-bold ${(stats?.winRate ?? 0) >= 50 ? "text-green-400" : "text-red-400"}`}>
            {stats?.winRate ?? 0}%
          </p>
          <p className="text-gray-600 text-[10px] uppercase tracking-wide">Win Rate</p>
        </div>
        <div>
          <p className="text-sm font-bold text-orange-400">
            {stats?.currentStreak ? `🔥${stats.currentStreak}` : "—"}
          </p>
          <p className="text-gray-600 text-[10px] uppercase tracking-wide">Streak</p>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-300">{stats?.totalTrades ?? 0}</p>
          <p className="text-gray-600 text-[10px] uppercase tracking-wide">Trades</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Leaderboard component ────────────────────────────────────────────────
export default function Leaderboard({ userId, username }: Props) {
  const [period,  setPeriod]  = useState<Period>("alltime");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setEntries(getLeaderboard(period, userId, username));
  }, [period, userId, username]);

  // Mount guard — avoids SSR localStorage access
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    refresh();
  }, [mounted, refresh]);

  // Refresh whenever a new trade settles (user may be watching the leaderboard)
  useEffect(() => {
    if (!mounted) return;
    const handler = () => refresh();
    window.addEventListener("tradeSettled", handler);
    return () => window.removeEventListener("tradeSettled", handler);
  }, [mounted, refresh]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <style>{`
        @keyframes lb-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-none">

        {/* ── Page heading ── */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🏆</span>
          <h2 className="text-white font-bold text-base">Leaderboard</h2>
          <span className="text-gray-600 text-xs ml-1">· {entries.length} traders</span>
          <span className="ml-auto text-[10px] text-gray-600 uppercase tracking-widest">Ranked by XP</span>
        </div>

        {/* ── Summary card ── */}
        <SummaryCard userId={userId} username={username} entries={entries} />

        {/* ── Period tabs ── */}
        <div className="flex gap-1 mb-4 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1">
          {(["weekly", "monthly", "alltime"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                period === p
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* ── Column headers ── */}
        <div className="grid grid-cols-[2rem_1fr_auto_auto_auto_auto] gap-x-2 px-3 mb-2">
          <span />
          <span className="text-[10px] text-gray-600 uppercase tracking-widest">Trader</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">XP</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">P&L</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">Win%</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">🔥</span>
        </div>

        {/* ── Rows ── */}
        <div className="space-y-1.5">
          {entries.map((entry, i) => {
            const pos    = i + 1;
            const isUser = entry.userId === userId;
            const rank   = calculateRank(calculateScore(entry.totalXP));

            const rowBg =
              pos === 1 ? "bg-yellow-500/[0.07] border-yellow-500/25" :
              pos === 2 ? "bg-gray-400/[0.07]   border-gray-400/20"   :
              pos === 3 ? "bg-orange-700/[0.07] border-orange-700/20" :
              isUser    ? "bg-red-500/[0.08]    border-red-500/30"     :
                          "bg-white/[0.03]      border-white/[0.06]";

            return (
              <div
                key={entry.userId}
                className={`grid grid-cols-[2rem_1fr_auto_auto_auto_auto] gap-x-2 items-center border rounded-xl px-3 py-2.5 transition-all ${rowBg}`}
                style={{ animation: `lb-in 0.3s ease-out ${i * 0.035}s both` }}
              >
                {/* Position */}
                <Position pos={pos} isUser={isUser} />

                {/* Username + rank badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-semibold truncate ${isUser ? "text-white" : "text-gray-300"}`}>
                    {entry.username.length > 12
                      ? entry.username.slice(0, 12) + "…"
                      : entry.username}
                  </span>
                  {isUser && (
                    <span className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1 flex-shrink-0">
                      you
                    </span>
                  )}
                  <RankBadge entry={entry} />
                </div>

                {/* XP — primary rank metric */}
                <span
                  className="text-xs font-mono font-bold text-right"
                  style={{ color: rank.color }}
                >
                  {fmtXP(entry.totalXP)}
                </span>

                {/* P&L — secondary */}
                <span
                  className={`text-[10px] font-mono text-right opacity-60 ${
                    entry.totalPnL >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {fmtPnL(entry.totalPnL)}
                </span>

                {/* Win rate — secondary */}
                <span
                  className={`text-[10px] text-right opacity-60 ${
                    entry.winRate >= 50 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {entry.winRate}%
                </span>

                {/* Streak — secondary */}
                <span className="text-[10px] text-right text-orange-400 opacity-70">
                  {entry.currentStreak > 0 ? entry.currentStreak : "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
}
