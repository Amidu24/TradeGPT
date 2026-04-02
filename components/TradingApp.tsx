"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MarketTicker from "@/components/MarketTicker";
import Sidebar from "@/components/Sidebar";
import PnLDashboard from "@/components/PnLDashboard";

const ChatInterface = dynamic(() => import("@/components/ChatInterface"), { ssr: false });

export default function TradingApp({ accountId, accountType }: { accountId: string; accountType: string }) {
  const [pendingInput, setPendingInput] = useState<string | undefined>();
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <main className="h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden grid-bg">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
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

        {/* Right side */}
        <div className="flex items-center gap-3">
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
        <Sidebar onSuggestion={(text) => setPendingInput(text)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface
            pendingInput={pendingInput}
            onPendingInputConsumed={() => setPendingInput(undefined)}
          />
        </div>

        {showDashboard && (
          <div className="w-72 flex-shrink-0 border-l border-white/5 bg-black/20 backdrop-blur-sm flex flex-col overflow-hidden">
            <PnLDashboard />
          </div>
        )}
      </div>
    </main>
  );
}
