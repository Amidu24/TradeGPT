// Leaderboard data layer — localStorage prototype (no "use client" needed; guard all window access)

export interface LeaderboardEntry {
  userId: string;
  username: string;
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

// ── Rank tiers ────────────────────────────────────────────────────────────────
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

export function calculateScore(totalPnL: number, winRate: number): number {
  return Math.max(0, totalPnL) + winRate * 2;
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
// Static — gives the leaderboard life before real users accumulate stats.
const SEEDED: LeaderboardEntry[] = [
  {
    userId: "seed_1", username: "TradeGod_X",
    totalPnL: 3200, weeklyPnL: 390, monthlyPnL: 1100,
    winRate: 76, totalTrades: 145, wins: 110,
    currentStreak: 8, bestStreak: 14,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_2", username: "VolatilityKing",
    totalPnL: 2180, weeklyPnL: 260, monthlyPnL: 760,
    winRate: 71, totalTrades: 98, wins: 70,
    currentStreak: 5, bestStreak: 11,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_3", username: "QuickFingers22",
    totalPnL: 1050, weeklyPnL: 130, monthlyPnL: 370,
    winRate: 66, totalTrades: 72, wins: 48,
    currentStreak: 2, bestStreak: 8,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_4", username: "AlphaTrader_X",
    totalPnL: 780, weeklyPnL: 90, monthlyPnL: 270,
    winRate: 62, totalTrades: 54, wins: 34,
    currentStreak: 3, bestStreak: 6,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_5", username: "NightOwlTrader",
    totalPnL: 420, weeklyPnL: 50, monthlyPnL: 150,
    winRate: 58, totalTrades: 35, wins: 20,
    currentStreak: 1, bestStreak: 4,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_6", username: "RiseFallPro",
    totalPnL: 340, weeklyPnL: 40, monthlyPnL: 120,
    winRate: 55, totalTrades: 28, wins: 15,
    currentStreak: 0, bestStreak: 3,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_7", username: "CryptoRider99",
    totalPnL: 140, weeklyPnL: 15, monthlyPnL: 50,
    winRate: 52, totalTrades: 19, wins: 10,
    currentStreak: 2, bestStreak: 3,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
  {
    userId: "seed_8", username: "FreshMeat99",
    totalPnL: 5, weeklyPnL: 5, monthlyPnL: 5,
    winRate: 44, totalTrades: 9, wins: 4,
    currentStreak: 0, bestStreak: 1,
    lastUpdated: Date.now(), weekStart: getWeekStart(), monthStart: getMonthStart(),
  },
];

// ── localStorage persistence ──────────────────────────────────────────────────
const STORAGE_KEY = "tradegpt_leaderboard_v1";

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

function makeDefaultEntry(userId: string, username: string): LeaderboardEntry {
  return {
    userId,
    username,
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
  const combined: LeaderboardEntry[] = [...SEEDED, ...Object.values(all)];

  // Ensure the current user appears even if they haven't traded yet
  if (userId && !combined.find((e) => e.userId === userId)) {
    combined.push(makeDefaultEntry(userId, username ?? userId));
  }

  const sortKey = (e: LeaderboardEntry): number => {
    if (period === "weekly")  return e.weeklyPnL;
    if (period === "monthly") return e.monthlyPnL;
    return calculateScore(e.totalPnL, e.winRate);
  };

  return combined.sort((a, b) => sortKey(b) - sortKey(a));
}

/** Get a single user's stats (or null if no trades recorded yet). */
export function getUserStats(userId: string): LeaderboardEntry | null {
  const all = loadAll();
  return all[userId] ?? null;
}
