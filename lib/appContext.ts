import { calculateRank, calculateScore } from "@/lib/leaderboard";

// Minimal quest shape — matches DailyQuest / WeeklyQuest / MilestoneQuest from gameState.ts
interface Quest {
  name: string;
  icon: string;
  progress: number;
  target: number;
  done: boolean;
  xpReward: number;
}

export interface TopTrader {
  username: string;
  xp: number;
  rankTier: string;
  rankEmoji: string;
}

export interface AppSnapshot {
  xp: number;
  level: number;
  streak: number;
  maxStreak: number;
  totalTrades: number;
  totalWins: number;
  winRate: number;
  weeklyPnL: number;
  totalPnL: number;
  dailyQuests: Quest[];
  weeklyQuests: Quest[];
  milestoneQuests: Quest[];
  leaderboardPosition: number;
  leaderboardTotal: number;
  topTraders: TopTrader[];
}

// Maps the CURRENT rank tier → XP threshold to reach the NEXT rank
const NEXT_RANK_XP: Record<string, number | null> = {
  Rookie: 100,
  Trader: 300,
  Pro:    700,
  Shark:  1500,
  Legend: null,
};

const NEXT_RANK_NAME: Record<string, string | null> = {
  Rookie: "Trader",
  Trader: "Pro",
  Pro:    "Shark",
  Shark:  "Legend",
  Legend: null,
};

function timeUntilMidnight(): string {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function timeUntilMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day === 1 ? 7 : day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export function buildAppContext(_userId: string, snap: AppSnapshot): string {
  const rank      = calculateRank(calculateScore(snap.xp));
  const nextName  = NEXT_RANK_NAME[rank.tier];
  const nextXp    = NEXT_RANK_XP[rank.tier];
  const xpNeeded  = nextXp != null ? Math.max(0, nextXp - snap.xp) : null;

  const lines: string[] = [];

  // ── 1. User Profile & Rank ────────────────────────────────────────────────
  lines.push("## User Profile & Rank");
  lines.push(`- XP: ${snap.xp.toLocaleString()} | Rank: ${rank.emoji} ${rank.tier} | Level: ${snap.level}`);
  if (xpNeeded != null && nextName) {
    lines.push(`- Next rank: ${nextName} in ${xpNeeded} XP`);
  } else {
    lines.push("- Maximum rank achieved (Legend 👑)");
  }
  lines.push(`- Leaderboard: #${snap.leaderboardPosition} of ${snap.leaderboardTotal} traders`);
  lines.push("");

  // ── 2. Trading Stats ──────────────────────────────────────────────────────
  lines.push("## Trading Stats");
  lines.push(
    `- Trades: ${snap.totalTrades} | Win rate: ${snap.winRate}% | ` +
    `Streak: ${snap.streak}${snap.streak >= 3 ? " 🔥" : ""} | Best streak: ${snap.maxStreak}`
  );
  lines.push(
    `- Weekly P&L: ${snap.weeklyPnL >= 0 ? "+" : ""}$${snap.weeklyPnL.toFixed(2)} | ` +
    `All-time P&L: ${snap.totalPnL >= 0 ? "+" : ""}$${snap.totalPnL.toFixed(2)}`
  );
  lines.push("");

  // ── 3. Daily Quests ───────────────────────────────────────────────────────
  const dailyDone = snap.dailyQuests.filter(q => q.done).length;
  lines.push(`## Daily Quests (${dailyDone}/${snap.dailyQuests.length} done — resets in ${timeUntilMidnight()})`);
  for (const q of snap.dailyQuests) {
    const status = q.done ? "✅" : `${q.progress}/${q.target} incomplete`;
    lines.push(`- ${q.icon} ${q.name}: ${status} (+${q.xpReward} XP)`);
  }
  lines.push("");

  // ── 4. Weekly Quests ──────────────────────────────────────────────────────
  const weeklyDone = snap.weeklyQuests.filter(q => q.done).length;
  lines.push(`## Weekly Quests (${weeklyDone}/${snap.weeklyQuests.length} done — resets in ${timeUntilMonday()})`);
  for (const q of snap.weeklyQuests) {
    const status = q.done ? "✅" : `${q.progress}/${q.target} incomplete`;
    lines.push(`- ${q.icon} ${q.name}: ${status} (+${q.xpReward} XP)`);
  }
  lines.push("");

  // ── 5. Milestone Quests ───────────────────────────────────────────────────
  const mDone = snap.milestoneQuests.filter(q => q.done).length;
  lines.push(`## Milestones (${mDone}/${snap.milestoneQuests.length} earned)`);
  for (const q of snap.milestoneQuests) {
    const status = q.done ? "★ earned" : `🔒 ${q.progress}/${q.target}`;
    lines.push(`- ${q.icon} ${q.name}: ${status} (+${q.xpReward} XP)`);
  }
  lines.push("");

  // ── 6. Leaderboard Snapshot ───────────────────────────────────────────────
  lines.push("## Leaderboard");
  snap.topTraders.slice(0, 3).forEach((t, i) => {
    const medal = ["🥇", "🥈", "🥉"][i];
    lines.push(`- ${medal} ${t.username} (${t.rankEmoji} ${t.rankTier}) — ${t.xp.toLocaleString()} XP`);
  });
  lines.push(`- You (#${snap.leaderboardPosition}): ${rank.emoji} ${rank.tier} — ${snap.xp.toLocaleString()} XP`);
  lines.push("");

  // ── 7. App Features Guide (static) ───────────────────────────────────────
  lines.push("## TradeGPT Features");
  lines.push(`- **Place trades**: Say "buy $10 rise on VOL 100 for 5 minutes" to place a real Deriv trade`);
  lines.push(`- **Check balance**: Ask "what is my balance"`);
  lines.push(`- **Market prices**: Ask "what is the current price of VOL 100"`);
  lines.push(`- **Daily quests**: Complete quests to earn XP and climb the leaderboard`);
  lines.push(`- **Leaderboard**: Click the 🏆 trophy icon to see trader rankings`);
  lines.push(`- **Rank system**: Earn XP to progress from Rookie 🌱 → Trader ⚡ → Pro 🔥 → Shark 🦈 → Legend 👑`);
  lines.push(`- **Streaks**: Win consecutive trades to build a streak and earn bonus XP`);
  lines.push(`- **Weekly & Milestone quests**: Longer-term challenges with bigger XP rewards`);

  return lines.join("\n");
}
