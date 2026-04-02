"use client";

export default function LoginPage({ error }: { error?: string }) {
  return (
    <main className="h-screen bg-[#0a0a0f] text-white flex items-center justify-center grid-bg">
      <div className="flex flex-col items-center gap-8 text-center px-6">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center font-black text-3xl glow-red">
            T
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0a0a0f] pulse-glow" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TradeGPT</h1>
          <p className="text-gray-500 mt-2">AI-powered trading · Deriv API V2</p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {["Natural language trading", "Live market data", "AI trade suggestions", "Voice trading"].map((f) => (
            <span key={f} className="text-xs bg-white/5 border border-white/8 text-gray-400 rounded-full px-3 py-1.5">
              {f}
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-2xl px-5 py-3">
            Authentication failed: {error.replace(/_/g, " ")}. Please try again.
          </div>
        )}

        {/* CTA */}
        <a
          href="/api/auth/login"
          className="flex items-center gap-3 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold rounded-2xl px-8 py-4 transition-all shadow-lg glow-red text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Connect Deriv Account
        </a>

        <p className="text-gray-700 text-xs">
          Uses Deriv OAuth2 · Secure · Real money at risk — trade responsibly
        </p>
      </div>
    </main>
  );
}
