"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import MarketTicker from "@/components/MarketTicker";
import Sidebar from "@/components/Sidebar";
import PnLDashboard from "@/components/PnLDashboard";
import AchievementToast from "@/components/AchievementToast";
import TradeResultEffect, { type ResultType } from "@/components/TradeResultEffect";
import { useGameState } from "@/lib/gameState";
import {
  recordTrade as recordLeaderboardTrade,
  getLeaderboard,
  getUserStats,
  calculateRank,
  calculateScore,
  type RankInfo,
} from "@/lib/leaderboard";
import { buildAppContext, type AppSnapshot } from "@/lib/appContext";

const ChatInterface = dynamic(() => import("@/components/ChatInterface"), { ssr: false });
const Leaderboard   = dynamic(() => import("@/components/Leaderboard"),   { ssr: false });

interface TradeSettledDetail {
  win: boolean;
  pnl: number;
  stake: number;
  symbol: string;
}

export default function TradingApp({ accountId, accountType }: { accountId: string; accountType: string }) {
  const [pendingInput,   setPendingInput]   = useState<string | undefined>();
  const [showDashboard,  setShowDashboard]  = useState(false);
  const [activeView,     setActiveView]     = useState<"chat" | "leaderboard">("chat");
  const [tradeResult,    setTradeResult]    = useState<{ type: ResultType; xp: number } | null>(null);
  const [userRank,       setUserRank]       = useState<RankInfo | null>(null);

  const { state, levelInfo, recordTrade, recordAiMessage, usePowerCard, pendingToasts, dismissToast } = useGameState();

  // Compute leaderboard rank on mount and after each trade
  const refreshRank = useCallback(() => {
    const stats = getUserStats(accountId);
    const score = stats ? calculateScore(stats.totalXP) : calculateScore(state.xp);
    setUserRank(calculateRank(score));
  }, [accountId, state.xp]);

  useEffect(() => { refreshRank(); }, [refreshRank]);

  // Listen for trade settlement events fired by PnLDashboard
  useEffect(() => {
    const handler = (e: CustomEvent<TradeSettledDetail>) => {
      const { win, pnl, stake, symbol } = e.detail;
      recordTrade({ win, symbol, stake, pnl });
      recordLeaderboardTrade(accountId, accountId, pnl, win);
      refreshRank();
      setTradeResult({ type: win ? "win" : "loss", xp: win ? 150 : 25 });
    };
    window.addEventListener("tradeSettled", handler as EventListener);
    return () => window.removeEventListener("tradeSettled", handler as EventListener);
  }, [recordTrade, accountId, refreshRank]);

  const clearTradeResult = useCallback(() => setTradeResult(null), []);

  // Build a full app snapshot whenever game state changes — sent to the AI on every request
  const appSnapshot = useMemo<AppSnapshot>(() => {
    const entries = getLeaderboard("alltime", accountId, accountId);
    const pos     = entries.findIndex(e => e.userId === accountId) + 1;
    const topTraders = entries.slice(0, 3).map(e => {
      const r = calculateRank(calculateScore(e.totalXP));
      return { username: e.username, xp: e.totalXP, rankTier: r.tier, rankEmoji: r.emoji };
    });
    const stats   = getUserStats(accountId);
    const winRate = state.totalTrades > 0
      ? Math.round((state.totalWins / state.totalTrades) * 100)
      : (stats?.winRate ?? 0);
    return {
      xp:                   state.xp,
      level:                levelInfo.level,
      streak:               state.streak,
      maxStreak:            state.maxStreak,
      totalTrades:          state.totalTrades,
      totalWins:            state.totalWins,
      winRate,
      weeklyPnL:            state.weeklyPnL ?? 0,
      totalPnL:             stats?.totalPnL ?? 0,
      dailyQuests:          state.dailyQuests,
      weeklyQuests:         state.weeklyQuests,
      milestoneQuests:      state.milestoneQuests,
      leaderboardPosition:  pos > 0 ? pos : entries.length,
      leaderboardTotal:     entries.length,
      topTraders,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, levelInfo.level, accountId]);

  const { level, title, progress } = levelInfo;
  const showStreak = state.streak >= 2;

  return (
    <main className="h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden grid-bg">

      {/* ── Header ── */}
      <header className="flex-shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center font-black text-sm glow-red">
              T
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#0a0a0f] pulse-glow" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight">TradeGPT</h1>
            <p className="text-gray-500 text-xs">AI Trading · Powered by Deriv</p>
          </div>
        </div>

        {/* Centre — Level + Streak */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Level badge */}
          <div className="flex flex-col items-start bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 min-w-[110px]">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-yellow-400 text-xs">⚡</span>
              <span className="text-white text-xs font-bold">LVL {level}</span>
              <span className="text-gray-500 text-[10px]">·</span>
              <span className="text-gray-400 text-[10px] font-medium">{title}</span>
            </div>
            {/* XP progress bar */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Win streak */}
          {showStreak && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-1.5">
              <span className="text-base leading-none">🔥</span>
              <span className="text-orange-300 text-sm font-black">{state.streak}</span>
              <span className="text-orange-500/60 text-[10px]">streak</span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Leaderboard toggle */}
          <button
            onClick={() => setActiveView((v) => (v === "leaderboard" ? "chat" : "leaderboard"))}
            className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 text-xs transition-all ${
              activeView === "leaderboard"
                ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                : "bg-white/5 border-white/8 text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="text-sm leading-none">🏆</span>
            Leaderboard
          </button>

          <button
            onClick={() => setShowDashboard((v) => !v)}
            className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 text-xs transition-all ${
              showDashboard
                ? "bg-red-500/20 border-red-500/40 text-red-300"
                : "bg-white/5 border-white/8 text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-glow" />
            <span className="text-gray-400 text-xs">Live</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5">
            <span className="text-gray-400 text-xs">{accountId}</span>
            <span className={`text-xs rounded-md px-1.5 py-0.5 ${accountType === "demo" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
              {accountType.toUpperCase()}
            </span>
          </div>

          <a
            href="/api/auth/logout"
            className="hidden sm:flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl px-3 py-1.5 text-gray-500 hover:text-gray-300 text-xs transition-all"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </a>
        </div>
      </header>

      <MarketTicker />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onSuggestion={(text) => setPendingInput(text)}
          dailyQuests={state.dailyQuests}
          weeklyQuests={state.weeklyQuests}
          milestoneQuests={state.milestoneQuests}
          powerCards={state.powerCards}
          onUsePowerCard={usePowerCard}
          userRank={userRank}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {activeView === "leaderboard" ? (
            <Leaderboard userId={accountId} username={accountId} />
          ) : (
            <ChatInterface
              pendingInput={pendingInput}
              onPendingInputConsumed={() => setPendingInput(undefined)}
              onAiMessage={recordAiMessage}
              appSnapshot={appSnapshot}
            />
          )}
        </div>

        {showDashboard && (
          <div className="w-72 flex-shrink-0 border-l border-white/5 bg-black/20 backdrop-blur-sm flex flex-col overflow-hidden">
            <PnLDashboard />
          </div>
        )}
      </div>

      {/* ── Game overlays ── */}
      {tradeResult && (
        <TradeResultEffect
          type={tradeResult.type}
          xp={tradeResult.xp}
          onDone={clearTradeResult}
        />
      )}

      {pendingToasts[0] && (
        <AchievementToast
          achievement={pendingToasts[0]}
          onDismiss={dismissToast}
        />
      )}
    </main>
  );
}
