"use client";

import { useState, useEffect, useCallback } from "react";

// Cumulative XP required to reach each level (index 0 = level 1)
const LEVEL_XP = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
  4000, 4900, 5900, 7000, 8200, 9500, 10900, 12400, 14000, 15700,
  17500, 19400, 21400, 23500, 25700, 28000, 30400, 32900, 35500, 38200,
  41000, 43900, 46900, 50000, 53200, 56500, 59900, 63400, 67000, 70700,
  74500, 78400, 82400, 86500, 90700, 95000, 99400, 103900, 108500, 113200,
];

const LEVEL_TITLES: [number, string][] = [
  [50, "God Mode"], [40, "Legend"], [35, "Grandmaster"], [30, "Elite"],
  [25, "Strategist"], [20, "Pro"], [15, "Expert"], [10, "Analyst"],
  [6, "Trader"], [3, "Apprentice"], [1, "Rookie"],
];

function getLevelTitle(level: number): string {
  for (const [threshold, title] of LEVEL_TITLES) {
    if (level >= threshold) return title;
  }
  return "Rookie";
}

export function getLevelInfo(xp: number) {
  let level = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) { level = i + 1; break; }
  }
  level = Math.min(level, 50);
  const floor = LEVEL_XP[level - 1] ?? 0;
  const ceil = LEVEL_XP[level] ?? LEVEL_XP[LEVEL_XP.length - 1];
  const progress = level >= 50 ? 100 : Math.round(((xp - floor) / (ceil - floor)) * 100);
  return { level, title: getLevelTitle(level), progress, xpToNext: Math.max(0, ceil - xp) };
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood",     name: "First Blood",     desc: "Win your first trade",              icon: "🩸" },
  { id: "bull_run",        name: "Bull Run",         desc: "Win 3 trades in a row",             icon: "🐂" },
  { id: "on_fire",         name: "On Fire!",         desc: "Win 5 trades in a row",             icon: "🔥" },
  { id: "volatility_king", name: "Volatility King",  desc: "Trade Volatility 75 or 100",        icon: "⚡" },
  { id: "veteran",         name: "Veteran",          desc: "Complete 10 trades",                icon: "🎖️" },
  { id: "risk_taker",      name: "Risk Taker",       desc: "Stake $50 or more on one trade",    icon: "🎲" },
  { id: "rising_star",     name: "Rising Star",      desc: "Reach Level 5",                     icon: "⭐" },
  { id: "century",         name: "Century",          desc: "Earn 1000 XP total",                icon: "💯" },
];

export interface DailyQuest {
  id: string;
  name: string;
  desc: string;
  icon: string;
  progress: number;
  target: number;
  done: boolean;
  xpReward: number;
}

export interface WeeklyQuest {
  id: string;
  name: string;
  desc: string;
  icon: string;
  progress: number;
  target: number;
  done: boolean;
  xpReward: number;
}

export interface MilestoneQuest {
  id: string;
  name: string;
  desc: string;
  icon: string;
  progress: number;
  target: number;
  done: boolean;
  xpReward: number;
}

const DAILY_QUEST_DEFS: Omit<DailyQuest, "progress" | "done">[] = [
  { id: "three_trades", name: "Triple Play",    desc: "Complete 3 trades",          icon: "🎯", target: 3, xpReward: 200 },
  { id: "first_win",    name: "First Win",      desc: "Win a trade today",          icon: "🏆", target: 1, xpReward: 150 },
  { id: "vol_trade",    name: "Volatility Rush",desc: "Trade Volatility 100",       icon: "⚡", target: 1, xpReward: 100 },
  { id: "ai_consult",   name: "AI Consult",     desc: "Ask the AI for advice",      icon: "💬", target: 1, xpReward: 50  },
  { id: "daily_login",  name: "Daily Login",    desc: "Open the app today",         icon: "🔁", target: 1, xpReward: 30  },
  { id: "big_swing",    name: "Big Swing",      desc: "Place a trade over $10",     icon: "📈", target: 1, xpReward: 75  },
];

const WEEKLY_QUEST_DEFS: Omit<WeeklyQuest, "progress" | "done">[] = [
  { id: "hot_streak",    name: "Hot Streak",    desc: "Win 5 trades in a row",           icon: "🔥", target: 5,  xpReward: 500 },
  { id: "strategy_week", name: "Strategy Week", desc: "Send 10 AI messages this week",   icon: "🧠", target: 10, xpReward: 400 },
  { id: "profit_hunter", name: "Profit Hunter", desc: "End the week with positive PnL",  icon: "💰", target: 1,  xpReward: 600 },
  { id: "diversifier",   name: "Diversifier",   desc: "Trade 3 different symbols",       icon: "🎲", target: 3,  xpReward: 300 },
  { id: "grinder",       name: "Grinder",       desc: "Complete 20 trades this week",    icon: "👑", target: 20, xpReward: 350 },
];

const MILESTONE_QUEST_DEFS: Omit<MilestoneQuest, "progress" | "done">[] = [
  { id: "first_trade",     name: "First Trade",     desc: "Place your first ever trade",      icon: "🌱", target: 1,  xpReward: 100  },
  { id: "trusted",         name: "Trusted",         desc: "Complete 50 lifetime trades",      icon: "🤝", target: 50, xpReward: 1000 },
  { id: "shark_territory", name: "Shark Territory", desc: "Reach Shark rank (700 XP)",        icon: "🦈", target: 1,  xpReward: 800  },
  { id: "on_a_roll",       name: "On a Roll",       desc: "Achieve a 10-trade win streak",    icon: "🔟", target: 10, xpReward: 1000 },
  { id: "chatterbox",      name: "Chatterbox",      desc: "Send 20 messages to the AI",       icon: "💬", target: 20, xpReward: 200  },
];

export interface PowerCard {
  id: string;
  name: string;
  desc: string;
  icon: string;
  prompt: string;
  used: boolean;
}

export const POWER_CARD_DEFS: Omit<PowerCard, "used">[] = [
  {
    id: "signal_boost",
    name: "AI Signal Boost",
    desc: "Force a high-conviction directional call",
    icon: "🧠",
    prompt:
      "Signal boost activated — give me your single highest-conviction trade right now. Pick one symbol, one direction (rise or fall), a stake amount, and explain why in 2 sentences. Be decisive, no hedging.",
  },
  {
    id: "market_scan",
    name: "Market Scan",
    desc: "Scan 5 markets for the best setup",
    icon: "📡",
    prompt:
      "Run a market scan: check Volatility 100, Volatility 75, EUR/USD, GBP/USD, and Bitcoin. For each give me current trend direction and a trade-readiness score 1–5. Then tell me which one to trade right now and why.",
  },
  {
    id: "double_down",
    name: "Double Down",
    desc: "Go 2× your last trade on the same symbol",
    icon: "💥",
    prompt:
      "I want to double down — look at my most recent trade from my statement history and suggest the same symbol with exactly twice the stake. Should I go rise or fall right now based on current price action?",
  },
];

interface GameState {
  xp: number;
  streak: number;
  maxStreak: number;
  totalTrades: number;
  totalWins: number;
  unlockedAchievements: string[];
  dailyQuests: DailyQuest[];
  weeklyQuests: WeeklyQuest[];
  milestoneQuests: MilestoneQuest[];
  powerCards: PowerCard[];
  lastQuestReset: string;
  lastWeeklyReset: string;
  totalAiMessages: number;
  weeklyAiMessages: number;
  weeklyTradesCount: number;
  weeklyTradedSymbols: string[];
  weeklyPnL: number;
  weeklyMaxStreak: number;
}

const DEFAULT_STATE: GameState = {
  xp: 0, streak: 0, maxStreak: 0, totalTrades: 0, totalWins: 0,
  unlockedAchievements: [],
  dailyQuests: DAILY_QUEST_DEFS.map((q) => ({ ...q, progress: 0, done: false })),
  weeklyQuests: WEEKLY_QUEST_DEFS.map((q) => ({ ...q, progress: 0, done: false })),
  milestoneQuests: MILESTONE_QUEST_DEFS.map((q) => ({ ...q, progress: 0, done: false })),
  powerCards: POWER_CARD_DEFS.map((p) => ({ ...p, used: false })),
  lastQuestReset: "",
  lastWeeklyReset: "",
  totalAiMessages: 0,
  weeklyAiMessages: 0,
  weeklyTradesCount: 0,
  weeklyTradedSymbols: [],
  weeklyPnL: 0,
  weeklyMaxStreak: 0,
};

const STORAGE_KEY = "tradegpt_game_v1";

function load(): GameState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw) as Partial<GameState>;
    // Merge new quest defs if they are missing from saved state
    const merged = { ...DEFAULT_STATE, ...saved };
    // Ensure all daily quest defs are present
    const savedDailyIds = new Set((merged.dailyQuests ?? []).map((q) => q.id));
    for (const def of DAILY_QUEST_DEFS) {
      if (!savedDailyIds.has(def.id)) merged.dailyQuests.push({ ...def, progress: 0, done: false });
    }
    // Ensure all weekly quest defs are present
    if (!merged.weeklyQuests) merged.weeklyQuests = WEEKLY_QUEST_DEFS.map((q) => ({ ...q, progress: 0, done: false }));
    const savedWeeklyIds = new Set(merged.weeklyQuests.map((q) => q.id));
    for (const def of WEEKLY_QUEST_DEFS) {
      if (!savedWeeklyIds.has(def.id)) merged.weeklyQuests.push({ ...def, progress: 0, done: false });
    }
    // Ensure all milestone quest defs are present
    if (!merged.milestoneQuests) merged.milestoneQuests = MILESTONE_QUEST_DEFS.map((q) => ({ ...q, progress: 0, done: false }));
    const savedMilestoneIds = new Set(merged.milestoneQuests.map((q) => q.id));
    for (const def of MILESTONE_QUEST_DEFS) {
      if (!savedMilestoneIds.has(def.id)) merged.milestoneQuests.push({ ...def, progress: 0, done: false });
    }
    return merged;
  } catch { return DEFAULT_STATE; }
}

function persist(s: GameState) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getMondayStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

// Shark rank threshold in XP (mirrors leaderboard.ts RANKS)
const SHARK_XP_THRESHOLD = 700;

export function useGameState() {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [pendingToasts, setPendingToasts] = useState<Achievement[]>([]);

  useEffect(() => {
    const s = load();
    const today = todayStr();
    const monday = getMondayStr();

    if (s.lastQuestReset !== today) {
      s.dailyQuests = DAILY_QUEST_DEFS.map((q) => ({ ...q, progress: 0, done: false }));
      s.powerCards = POWER_CARD_DEFS.map((p) => ({ ...p, used: false }));
      s.lastQuestReset = today;
    }

    if (s.lastWeeklyReset !== monday) {
      s.weeklyQuests = WEEKLY_QUEST_DEFS.map((q) => ({ ...q, progress: 0, done: false }));
      s.weeklyTradesCount = 0;
      s.weeklyTradedSymbols = [];
      s.weeklyPnL = 0;
      s.weeklyMaxStreak = 0;
      s.weeklyAiMessages = 0;
      s.lastWeeklyReset = monday;
    }

    // Trigger daily login quest on load
    s.dailyQuests = s.dailyQuests.map((q) => {
      if (q.id === "daily_login" && !q.done) {
        const p = Math.min(q.target, q.progress + 1);
        const done = p >= q.target;
        if (done) s.xp += q.xpReward;
        return { ...q, progress: p, done };
      }
      return q;
    });

    persist(s);
    setState(s);
  }, []);

  const recordTrade = useCallback((opts: { win: boolean; symbol?: string; stake?: number; pnl?: number }) => {
    setState((prev) => {
      const next = { ...prev };
      const baseXp = opts.win ? 150 : 25;
      next.xp = prev.xp + baseXp;
      next.totalTrades = prev.totalTrades + 1;
      next.streak = opts.win ? prev.streak + 1 : 0;
      if (opts.win) next.totalWins = prev.totalWins + 1;
      next.maxStreak = Math.max(next.streak, prev.maxStreak);

      // Weekly tracking
      next.weeklyTradesCount = prev.weeklyTradesCount + 1;
      next.weeklyPnL = prev.weeklyPnL + (opts.pnl ?? 0);
      next.weeklyMaxStreak = Math.max(next.weeklyMaxStreak ?? 0, next.streak);
      const sym = (opts.symbol ?? "").toLowerCase();
      if (sym && !prev.weeklyTradedSymbols.includes(sym)) {
        next.weeklyTradedSymbols = [...prev.weeklyTradedSymbols, sym];
      }

      const isVol = /vol|r_\d{2,3}|1hz/i.test(opts.symbol ?? "");

      // ── Daily quests ──
      next.dailyQuests = prev.dailyQuests.map((q) => {
        if (q.done) return q;
        let p = q.progress;
        if (q.id === "three_trades") p = Math.min(q.target, p + 1);
        if (q.id === "first_win" && opts.win) p = Math.min(q.target, p + 1);
        if (q.id === "vol_trade" && isVol) p = Math.min(q.target, p + 1);
        if (q.id === "big_swing" && (opts.stake ?? 0) > 10) p = Math.min(q.target, p + 1);
        const done = p >= q.target;
        if (done && !q.done) next.xp += q.xpReward;
        return { ...q, progress: p, done };
      });

      // ── Weekly quests ──
      next.weeklyQuests = prev.weeklyQuests.map((q) => {
        if (q.done) return q;
        let p = q.progress;
        if (q.id === "hot_streak") p = next.weeklyMaxStreak;
        if (q.id === "grinder") p = next.weeklyTradesCount;
        if (q.id === "diversifier") p = next.weeklyTradedSymbols.length;
        if (q.id === "profit_hunter" && next.weeklyPnL > 0) p = 1;
        const done = p >= q.target;
        if (done && !q.done) next.xp += q.xpReward;
        return { ...q, progress: p, done };
      });

      // ── Milestone quests ──
      next.milestoneQuests = prev.milestoneQuests.map((q) => {
        if (q.done) return q;
        let p = q.progress;
        if (q.id === "first_trade") p = next.totalTrades;
        if (q.id === "trusted") p = next.totalTrades;
        if (q.id === "on_a_roll") p = next.maxStreak;
        const done = p >= q.target;
        if (done && !q.done) next.xp += q.xpReward;
        return { ...q, progress: p, done };
      });

      // Check shark territory milestone after XP update
      next.milestoneQuests = next.milestoneQuests.map((q) => {
        if (q.id === "shark_territory" && !q.done && next.xp >= SHARK_XP_THRESHOLD) {
          next.xp += q.xpReward;
          return { ...q, progress: 1, done: true };
        }
        return q;
      });

      // ── Achievements ──
      const unlocked = [...prev.unlockedAchievements];
      const toasts: Achievement[] = [];
      const unlock = (id: string) => {
        if (unlocked.includes(id)) return;
        unlocked.push(id);
        const ach = ALL_ACHIEVEMENTS.find((a) => a.id === id);
        if (ach) { toasts.push(ach); next.xp += 100; }
      };

      if (opts.win && next.totalWins === 1) unlock("first_blood");
      if (next.streak >= 3) unlock("bull_run");
      if (next.streak >= 5) unlock("on_fire");
      if (isVol) unlock("volatility_king");
      if (next.totalTrades >= 10) unlock("veteran");
      if ((opts.stake ?? 0) >= 50) unlock("risk_taker");
      if (getLevelInfo(next.xp).level >= 5) unlock("rising_star");
      if (next.xp >= 1000) unlock("century");

      next.unlockedAchievements = unlocked;
      if (toasts.length) setPendingToasts((q) => [...q, ...toasts]);

      persist(next);
      return next;
    });
  }, []);

  const recordAiMessage = useCallback(() => {
    setState((prev) => {
      const next = { ...prev };
      next.totalAiMessages = prev.totalAiMessages + 1;
      next.weeklyAiMessages = prev.weeklyAiMessages + 1;

      // Daily: AI Consult
      next.dailyQuests = prev.dailyQuests.map((q) => {
        if (q.id === "ai_consult" && !q.done) {
          const p = Math.min(q.target, q.progress + 1);
          const done = p >= q.target;
          if (done) next.xp += q.xpReward;
          return { ...q, progress: p, done };
        }
        return q;
      });

      // Weekly: Strategy Week
      next.weeklyQuests = prev.weeklyQuests.map((q) => {
        if (q.id === "strategy_week" && !q.done) {
          const p = Math.min(q.target, next.weeklyAiMessages);
          const done = p >= q.target;
          if (done && !q.done) next.xp += q.xpReward;
          return { ...q, progress: p, done };
        }
        return q;
      });

      // Milestone: Chatterbox
      next.milestoneQuests = prev.milestoneQuests.map((q) => {
        if (q.id === "chatterbox" && !q.done) {
          const p = Math.min(q.target, next.totalAiMessages);
          const done = p >= q.target;
          if (done) next.xp += q.xpReward;
          return { ...q, progress: p, done };
        }
        return q;
      });

      persist(next);
      return next;
    });
  }, []);

  const usePowerCard = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, powerCards: prev.powerCards.map((c) => c.id === id ? { ...c, used: true } : c) };
      persist(next);
      return next;
    });
  }, []);

  const dismissToast = useCallback(() => setPendingToasts((q) => q.slice(1)), []);

  return { state, levelInfo: getLevelInfo(state.xp), recordTrade, recordAiMessage, usePowerCard, pendingToasts, dismissToast };
}
