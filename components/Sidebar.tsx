"use client";

import { useState, useEffect } from "react";
import type { DailyQuest, WeeklyQuest, MilestoneQuest, PowerCard } from "@/lib/gameState";
import type { RankInfo } from "@/lib/leaderboard";

interface SidebarProps {
  onSuggestion: (text: string) => void;
  dailyQuests: DailyQuest[];
  weeklyQuests: WeeklyQuest[];
  milestoneQuests: MilestoneQuest[];
  powerCards: PowerCard[];
  onUsePowerCard: (id: string) => void;
  userRank?: RankInfo | null;
}

const quickActions = [
  { label: "Balance",   icon: "💰", prompt: "What's my balance?" },
  { label: "EUR/USD",   icon: "📈", prompt: "EUR/USD price" },
  { label: "BTC Price", icon: "₿",  prompt: "Bitcoin price" },
  { label: "Portfolio", icon: "📊", prompt: "Show my portfolio" },
  { label: "History",   icon: "🕐", prompt: "Show trade history" },
  { label: "Markets",   icon: "🌐", prompt: "Show available markets" },
];

type QuestTab = "daily" | "weekly" | "milestones";

function getTimeUntilMidnight(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const ms = tomorrow.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function getTimeUntilMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day === 1 ? 7 : day === 0 ? 1 : 8 - day;
  const nextMon = new Date(now);
  nextMon.setDate(now.getDate() + daysUntil);
  nextMon.setHours(0, 0, 0, 0);
  const ms = nextMon.getTime() - now.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function QuestProgressBar({ progress, target, done }: { progress: number; target: number; done: boolean }) {
  return (
    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${done ? "bg-green-500" : "bg-red-500"}`}
        style={{ width: `${Math.round((progress / target) * 100)}%` }}
      />
    </div>
  );
}

export default function Sidebar({
  onSuggestion, dailyQuests, weeklyQuests, milestoneQuests, powerCards, onUsePowerCard, userRank,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<QuestTab>("daily");
  const [countdown, setCountdown] = useState({ daily: "", weekly: "" });

  useEffect(() => {
    function tick() {
      setCountdown({ daily: getTimeUntilMidnight(), weekly: getTimeUntilMonday() });
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const dailyDone    = dailyQuests.filter((q) => q.done).length;
  const weeklyDone   = weeklyQuests.filter((q) => q.done).length;
  const milestoneDone = milestoneQuests.filter((q) => q.done).length;

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-sm flex flex-col overflow-y-auto scrollbar-none">

      {/* Rank badge */}
      {userRank && (
        <div
          className="mx-4 mt-4 flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ background: `${userRank.color}0d`, borderColor: `${userRank.color}30` }}
        >
          <span className="text-base leading-none">{userRank.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold leading-tight" style={{ color: userRank.color }}>
              {userRank.tier}
            </p>
            <p className="text-gray-600 text-[9px] leading-tight">Competitive Rank</p>
          </div>
          <span className="text-gray-700 text-[9px] uppercase tracking-widest">Rank</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => onSuggestion(a.prompt)}
              className="flex flex-col items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 rounded-xl p-3 transition-all group"
            >
              <span className="text-lg">{a.icon}</span>
              <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div className="h-px bg-white/5" />

        {/* Quest section header + tabs */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Quests</p>

          {/* Tab bar */}
          <div className="flex gap-0.5 bg-white/[0.03] border border-white/[0.07] rounded-xl p-0.5 mb-3">
            {([
              { key: "daily",      label: "Daily",   done: dailyDone,     total: dailyQuests.length },
              { key: "weekly",     label: "Weekly",  done: weeklyDone,    total: weeklyQuests.length },
              { key: "milestones", label: "Miles.",  done: milestoneDone, total: milestoneQuests.length },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex flex-col items-center py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  activeTab === t.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-[9px] font-normal mt-0.5 ${t.done === t.total ? "text-green-400" : "text-gray-600"}`}>
                  {t.done}/{t.total}
                </span>
              </button>
            ))}
          </div>

          {/* ── Daily quests ── */}
          {activeTab === "daily" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-700 text-[10px]">Resets in {countdown.daily}</span>
              </div>
              {dailyQuests.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-xl border px-3 py-2.5 transition-all ${
                    q.done ? "bg-green-500/8 border-green-500/20" : "bg-white/[0.03] border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{q.icon}</span>
                      <span className={`text-xs font-medium leading-tight ${q.done ? "text-green-300 line-through opacity-60" : "text-gray-300"}`}>
                        {q.name}
                      </span>
                    </div>
                    {q.done ? (
                      <span className="text-green-400 text-xs">✓</span>
                    ) : (
                      <span className="text-yellow-400/70 text-[10px] font-bold">+{q.xpReward}</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-[10px] mb-1.5">{q.desc}</p>
                  <QuestProgressBar progress={q.progress} target={q.target} done={q.done} />
                  <p className="text-gray-700 text-[10px] mt-1">{q.progress}/{q.target}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Weekly quests ── */}
          {activeTab === "weekly" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-700 text-[10px]">Resets in {countdown.weekly}</span>
              </div>
              {weeklyQuests.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-xl border px-3 py-2.5 transition-all ${
                    q.done ? "bg-green-500/8 border-green-500/20" : "bg-white/[0.03] border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{q.icon}</span>
                      <span className={`text-xs font-medium leading-tight ${q.done ? "text-green-300 line-through opacity-60" : "text-gray-300"}`}>
                        {q.name}
                      </span>
                    </div>
                    {q.done ? (
                      <span className="text-green-400 text-xs">✓</span>
                    ) : (
                      <span className="text-yellow-400/70 text-[10px] font-bold">+{q.xpReward}</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-[10px] mb-1.5">{q.desc}</p>
                  <QuestProgressBar progress={q.progress} target={q.target} done={q.done} />
                  <p className="text-gray-700 text-[10px] mt-1">{q.progress}/{q.target}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Milestone quests ── */}
          {activeTab === "milestones" && (
            <div className="flex flex-col gap-2">
              {milestoneQuests.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-xl border px-3 py-2.5 transition-all ${
                    q.done
                      ? "bg-yellow-500/8 border-yellow-500/20"
                      : "bg-white/[0.03] border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{q.done ? q.icon : "🔒"}</span>
                      <span className={`text-xs font-medium leading-tight ${q.done ? "text-yellow-300" : "text-gray-400"}`}>
                        {q.name}
                      </span>
                    </div>
                    {q.done ? (
                      <span className="text-yellow-400 text-xs">★</span>
                    ) : (
                      <span className="text-yellow-400/70 text-[10px] font-bold">+{q.xpReward}</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-[10px] mb-1.5">{q.desc}</p>
                  <QuestProgressBar progress={q.progress} target={q.target} done={q.done} />
                  <p className="text-gray-700 text-[10px] mt-1">{q.progress}/{q.target}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-white/5" />

        {/* Power Cards */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Power Cards</p>
          <div className="flex flex-col gap-2">
            {powerCards.map((card) => (
              <button
                key={card.id}
                disabled={card.used}
                onClick={() => {
                  if (card.used) return;
                  onUsePowerCard(card.id);
                  onSuggestion(card.prompt);
                }}
                className={`text-left rounded-xl border px-3 py-2.5 transition-all group ${
                  card.used
                    ? "bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed"
                    : "bg-gradient-to-br from-red-950/30 to-transparent border-red-500/20 hover:border-red-500/40 hover:from-red-900/30 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{card.icon}</span>
                  <span className={`text-xs font-semibold ${card.used ? "text-gray-600" : "text-red-300 group-hover:text-red-200"}`}>
                    {card.name}
                  </span>
                  {card.used && (
                    <span className="ml-auto text-[9px] text-gray-600 uppercase tracking-wide">Used</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-600 leading-snug">{card.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-gray-700 text-[10px] mt-2 text-center">Resets daily at midnight</p>
        </div>
      </div>

      {/* Bottom risk warning */}
      <div className="mt-auto p-4 border-t border-white/5">
        <div className="bg-white/5 rounded-xl p-3 text-xs text-gray-500 leading-relaxed">
          <p className="text-yellow-400/80 font-medium mb-1">⚠️ Risk Warning</p>
          Trading involves risk. Only trade what you can afford to lose.
        </div>
      </div>
    </aside>
  );
}
