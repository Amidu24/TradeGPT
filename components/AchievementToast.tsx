"use client";

import { useEffect } from "react";
import type { Achievement } from "@/lib/gameState";

export default function AchievementToast({
  achievement,
  onDismiss,
}: {
  achievement: Achievement;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [achievement, onDismiss]);

  return (
    <div
      className="fixed top-20 right-4 z-50 w-72"
      style={{ animation: "achievementSlide 0.4s cubic-bezier(0.16,1,0.3,1) forwards" }}
    >
      <div className="bg-gradient-to-br from-yellow-950/80 to-amber-950/60 border border-yellow-500/40 rounded-2xl px-4 py-3 backdrop-blur-md shadow-2xl shadow-black/40">
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none mt-0.5 flex-shrink-0">{achievement.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">
              Achievement Unlocked · +100 XP
            </p>
            <p className="text-white font-bold text-sm leading-tight">{achievement.name}</p>
            <p className="text-yellow-200/50 text-xs mt-0.5 leading-snug">{achievement.desc}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-yellow-700 hover:text-yellow-400 flex-shrink-0 transition-colors mt-0.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mt-2.5 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      </div>
    </div>
  );
}
