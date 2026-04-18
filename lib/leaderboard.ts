// Leaderboard data layer — localStorage prototype (no "use client" needed; guard all window access)

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  totalPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  winRate: number;       // 0-100
  totalTrades: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  lastUpdated: number;   // epoch ms
  weekStart: string;     // "YYYY-MM-DD" of Monday
  monthStart: string;    // "YYYY-MM"
}

export interface RankInfo {
  tier: string;
  emoji: string;
  color: string;
  minScore: number;
}

// ── Rank tiers (score = XP) ───────────────────────────────────────────────────
const RANKS: RankInfo[] = [
  { tier: "Legend", emoji: "👑", color: "#eab308", minScore: 1500 },
  { tier: "Shark",  emoji: "🦈", color: "#a855f7", minScore: 700  },
  { tier: "Pro",    emoji: "🔥", color: "#f97316", minScore: 300  },
  { tier: "Trader", emoji: "⚡", color: "#3b82f6", minScore: 100  },
  { tier: "Rookie", emoji: "🌱", color: "#6b7280", minScore: 0    },
];

export function calculateRank(score: number): RankInfo {
  for (const r of RANKS) {
    if (score >= r.minScore) return r;
  }
  return RANKS[RANKS.length - 1];
}

// Score is now purely XP — rank is earned by playing, not by PnL
export function calculateScore(totalXP: number): number {
  return Math.max(0, totalXP);
}

// ── Week / month helpers ──────────────────────────────────────────────────────
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();                   // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;     // offset to Monday
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

function getMonthStart(): string {
  return new Date().toISOString().slice(0, 7);
}

// ── Seeded competitor pool ────────────────────────────────────────────────────
// XP values calibrated to their tier: Legend 3500-5000, Shark 1500-2500, Pro 700-1400, Trader 300-699, Rookie 50-299
const SEEDED: LeaderboardEntry[] = [
  {
    userId: "seed_1", username: "TradeGod_X",
    totalXP: 4800,
    totalPnL: 3200, weeklyPnL: 390, monthlyPnL: 1100,
    winRate: 76, totalTrades: 145, wins: 110,
    currentStreak: 8, bestStreak: 14,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_2", username: "VolatilityKing",
    totalXP: 3600,
    totalPnL: 2180, weeklyPnL: 260, monthlyPnL: 760,
    winRate: 71, totalTrades: 98, wins: 70,
    currentStreak: 5, bestStreak: 11,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_3", username: "QuickFingers22",
    totalXP: 2200,
    totalPnL: 1050, weeklyPnL: 130, monthlyPnL: 370,
    winRate: 66, totalTrades: 72, wins: 48,
    currentStreak: 2, bestStreak: 8,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_4", username: "AlphaTrader_X",
    totalXP: 1600,
    totalPnL: 780, weeklyPnL: 90, monthlyPnL: 270,
    winRate: 62, totalTrades: 54, wins: 34,
    currentStreak: 3, bestStreak: 6,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_5", username: "NightOwlTrader",
    totalXP: 1100,
    totalPnL: 420, weeklyPnL: 50, monthlyPnL: 150,
    winRate: 58, totalTrades: 35, wins: 20,
    currentStreak: 1, bestStreak: 4,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_6", username: "RiseFallPro",
    totalXP: 820,
    totalPnL: 340, weeklyPnL: 40, monthlyPnL: 120,
    winRate: 55, totalTrades: 28, wins: 15,
    currentStreak: 0, bestStreak: 3,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_7", username: "CryptoRider99",
    totalXP: 420,
    totalPnL: 140, weeklyPnL: 15, monthlyPnL: 50,
    winRate: 52, totalTrades: 19, wins: 10,
    currentStreak: 2, bestStreak: 3,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_8", username: "FreshMeat99",
    totalXP: 180,
    totalPnL: 5, weeklyPnL: 5, monthlyPnL: 5,
    winRate: 44, totalTrades: 9, wins: 4,
    currentStreak: 0, bestStreak: 1,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
];

// ── localStorage persistence ──────────────────────────────────────────────────
const STORAGE_KEY    = "tradegpt_leaderboard_v1";
const GAME_STATE_KEY = "tradegpt_game_v1";

function loadAll(): Record<string, LeaderboardEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LeaderboardEntry>) : {};
  } catch {
    return {};
  }
}

function saveAll(entries: Record<string, LeaderboardEntry>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Read the real user's XP from the game state store. */
function readUserXP(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) return 0;
    const gs = JSON.parse(raw) as { xp?: number };
    return gs.xp ?? 0;
  } catch {
    return 0;
  }
}

function makeDefaultEntry(userId: string, username: string): LeaderboardEntry {
  return {
    userId,
    username,
    totalXP: 0,
    totalPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastUpdated: Date.now(),
    weekStart: getWeekStart(),
    monthStart: getMonthStart(),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export type Period = "weekly" | "monthly" | "alltime";

/** Record a settled trade for a user. Returns a milestone message when a streak threshold is hit. */
export function recordTrade(
  userId: string,
  username: string,
  profit: number,
  win: boolean,
): { streakMilestone?: string } {
  const all = loadAll();
  let entry = all[userId] ?? makeDefaultEntry(userId, username);

  const weekStart  = getWeekStart();
  const monthStart = getMonthStart();

  // Reset weekly / monthly buckets on period rollover
  if (entry.weekStart  !== weekStart)  { entry.weeklyPnL  = 0; entry.weekStart  = weekStart;  }
  if (entry.monthStart !== monthStart) { entry.monthlyPnL = 0; entry.monthStart = monthStart; }

  entry.username       = username;
  entry.totalPnL      += profit;
  entry.weeklyPnL     += profit;
  entry.monthlyPnL    += profit;
  entry.totalTrades   += 1;
  if (win) entry.wins += 1;
  entry.winRate        = entry.totalTrades > 0
    ? Math.round((entry.wins / entry.totalTrades) * 100)
    : 0;
  entry.currentStreak  = win ? entry.currentStreak + 1 : 0;
  entry.bestStreak     = Math.max(entry.bestStreak, entry.currentStreak);
  entry.lastUpdated    = Date.now();

  // Sync XP from game state store
  entry.totalXP = readUserXP(userId);

  all[userId] = entry;
  saveAll(all);

  let streakMilestone: string | undefined;
  if (win) {
    if      (entry.currentStreak === 3)  streakMilestone = "🔥 3 trade win streak!";
    else if (entry.currentStreak === 5)  streakMilestone = "🔥 5 trade win streak! You're on fire!";
    else if (entry.currentStreak === 10) streakMilestone = "🏆 10 trade win streak! Unstoppable!";
  }

  return { streakMilestone };
}

/** Return the sorted leaderboard for a period, always including the given userId even with 0 trades. */
export function getLeaderboard(period: Period, userId?: string, username?: string): LeaderboardEntry[] {
  const all = loadAll();

  // Sync the real user's XP before building the board
  if (userId && all[userId]) {
    all[userId].totalXP = readUserXP(userId);
  }

  const combined: LeaderboardEntry[] = [...SEEDED, ...Object.values(all)];

  // Ensure the current user appears even if they haven't traded yet
  if (userId && !combined.find((e) => e.userId === userId)) {
    const entry = makeDefaultEntry(userId, username ?? userId);
    entry.totalXP = readUserXP(userId);
    combined.push(entry);
  }

  // Always sort by XP (score)
  return combined.sort((a, b) => calculateScore(b.totalXP) - calculateScore(a.totalXP));
}

/** Get a single user's stats (or null if no trades recorded yet). */
export function getUserStats(userId: string): LeaderboardEntry | null {
  const all = loadAll();
  const entry = all[userId] ?? null;
  if (entry) {
    // Always return fresh XP
    entry.totalXP = readUserXP(userId);
  }
  return entry;
}
