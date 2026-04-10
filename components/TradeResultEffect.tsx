"use client";

import { useEffect, useRef } from "react";

export type ResultType = "win" | "loss";

interface Props {
  type: ResultType;
  xp: number;
  onDone: () => void;
}

export default function TradeResultEffect({ type, xp, onDone }: Props) {
  const particleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = particleRef.current;
    if (!el) return;

    if (type === "win") {
      const colors = ["#22c55e", "#86efac", "#4ade80", "#bbf7d0", "#16a34a"];
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const distance = 70 + Math.random() * 110;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const size = 5 + Math.random() * 6;
        const color = colors[i % colors.length];

        const dot = document.createElement("div");
        dot.style.cssText = `
          position: absolute; width: ${size}px; height: ${size}px;
          border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
          background: ${color}; left: 50%; top: 50%;
          margin: ${-size / 2}px 0 0 ${-size / 2}px;
          pointer-events: none;
          box-shadow: 0 0 6px ${color};
        `;
        el.appendChild(dot);

        dot.animate(
          [
            { opacity: 1, transform: `translate(0, 0) scale(1) rotate(0deg)` },
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0) rotate(${Math.random() * 360}deg)` },
          ],
          {
            duration: 700 + Math.random() * 300,
            delay: i * 15,
            easing: "ease-out",
            fill: "forwards",
          }
        );
      }
    }

    const t = setTimeout(onDone, 2000);
    return () => {
      clearTimeout(t);
      if (el) el.innerHTML = "";
    };
  }, [type, onDone]);

  const isWin = type === "win";

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      {/* Flash overlay */}
      <div
        className={`absolute inset-0 ${isWin ? "bg-green-500/10" : "bg-red-500/12"}`}
        style={{ animation: `resultFlash 0.8s ease-out forwards${!isWin ? ", lossShake 0.4s ease-out" : ""}` }}
      />

      {/* Particles */}
      <div ref={particleRef} className="absolute inset-0 overflow-hidden" />

      {/* WIN label */}
      {isWin && (
        <div
          className="absolute font-black text-5xl text-green-400 select-none tracking-tight"
          style={{
            animation: "winLabel 1.8s ease-out forwards",
            textShadow: "0 0 40px rgba(34,197,94,0.8), 0 0 80px rgba(34,197,94,0.3)",
            top: "38%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          WIN!
        </div>
      )}

      {/* LOSS label */}
      {!isWin && (
        <div
          className="absolute font-black text-4xl text-red-400 select-none tracking-tight"
          style={{
            animation: "lossLabel 1.6s ease-out forwards",
            textShadow: "0 0 30px rgba(239,68,68,0.7)",
            top: "38%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          KEEP GOING
        </div>
      )}

      {/* XP float */}
      <div
        className={`absolute font-black text-xl select-none whitespace-nowrap ${isWin ? "text-green-300" : "text-red-400"}`}
        style={{
          animation: "xpFloat 1.8s ease-out forwards",
          textShadow: isWin ? "0 0 16px rgba(34,197,94,0.6)" : "0 0 16px rgba(239,68,68,0.5)",
          top: "52%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {isWin ? `+${xp} XP` : `+${xp} XP`}
      </div>
    </div>
  );
}
