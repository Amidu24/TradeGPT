"use client";

interface SidebarProps {
  onSuggestion: (text: string) => void;
}

const quickActions = [
  { label: "Balance", icon: "💰", prompt: "What's my balance?" },
  { label: "EUR/USD", icon: "📈", prompt: "EUR/USD price" },
  { label: "BTC Price", icon: "₿", prompt: "Bitcoin price" },
  { label: "Portfolio", icon: "📊", prompt: "Show my portfolio" },
  { label: "History", icon: "🕐", prompt: "Show trade history" },
  { label: "Markets", icon: "🌐", prompt: "Show available markets" },
];

const tradeTemplates = [
  { label: "Rise · V100 · $10", prompt: "Buy $10 rise on Volatility 100 for 5 minutes" },
  { label: "Fall · V100 · $10", prompt: "Buy $10 fall on Volatility 100 for 5 minutes" },
  { label: "Rise · EUR/USD · $20", prompt: "Buy $20 rise on EUR/USD for 1 hour" },
  { label: "Rise · BTC · $50", prompt: "Buy $50 rise on Bitcoin for 1 hour" },
];

export default function Sidebar({ onSuggestion }: SidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-sm flex flex-col overflow-y-auto">
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

      <div className="px-4 pb-4">
        <div className="h-px bg-white/5 mb-4" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Trade Templates</p>
        <div className="flex flex-col gap-2">
          {tradeTemplates.map((t) => (
            <button
              key={t.label}
              onClick={() => onSuggestion(t.prompt)}
              className="text-left bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 rounded-xl px-3 py-2.5 transition-all group"
            >
              <span className="text-xs text-gray-400 group-hover:text-red-300 transition-colors leading-relaxed">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom info */}
      <div className="mt-auto p-4 border-t border-white/5">
        <div className="bg-white/5 rounded-xl p-3 text-xs text-gray-500 leading-relaxed">
          <p className="text-yellow-400/80 font-medium mb-1">⚠️ Risk Warning</p>
          Trading involves risk. Only trade what you can afford to lose.
        </div>
      </div>
    </aside>
  );
}
