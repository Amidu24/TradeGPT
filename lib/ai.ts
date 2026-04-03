export interface TradeIntent {
  action: "get_price" | "get_balance" | "get_symbols" | "propose_trade" | "buy_trade" | "get_portfolio" | "get_statement" | "converse" | "unknown";
  symbol?: string;
  amount?: number;
  duration?: number;
  duration_unit?: string;
  contract_type?: "CALL" | "PUT" | "DIGITEVEN" | "DIGITODD";
  conversationalReply?: string;
  raw: string;
}

function extractSymbol(message: string): string {
  if (/eur\/?usd|eurusd/i.test(message)) return "frxEURUSD";
  if (/gbp\/?usd|gbpusd/i.test(message)) return "frxGBPUSD";
  if (/usd\/?jpy|usdjpy/i.test(message)) return "frxUSDJPY";
  if (/btc|bitcoin/i.test(message)) return "cryBTCUSD";
  if (/eth|ethereum/i.test(message)) return "cryETHUSD";
  if (/boom\s*1000/i.test(message)) return "BOOM1000";
  if (/crash\s*1000/i.test(message)) return "CRASH1000";
  if (/step\s*index|stprng/i.test(message)) return "stpRNG";
  if (/vol(atility)?\s*25|v25\b|1hz25/i.test(message)) return "1HZ25V";
  if (/vol(atility)?\s*50|v50\b|1hz50/i.test(message)) return "1HZ50V";
  if (/vol(atility)?\s*75|v75\b|1hz75/i.test(message)) return "1HZ75V";
  if (/vol(atility)?\s*100|v100\b|1hz100/i.test(message)) return "1HZ100V";
  return "1HZ100V";
}

function extractAmount(message: string): number {
  const m = message.match(/\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:dollar|usd|\$)/i);
  return m ? parseFloat(m[1] ?? m[2]) : 10;
}

function extractDuration(message: string): { duration: number; duration_unit: string } {
  const m = message.match(/(\d+)\s*(tick|ticks|t|second|seconds|sec|s|minute|minutes|min|m|hour|hours|h|day|days|d)/i);
  if (!m) return { duration: 5, duration_unit: "m" };
  const n = parseInt(m[1]);
  const u = m[2].toLowerCase();
  if (/tick|^t$/i.test(u)) return { duration: n, duration_unit: "t" };
  if (/sec|^s$/i.test(u)) return { duration: n, duration_unit: "s" };
  if (/hour|^h$/i.test(u)) return { duration: n * 60, duration_unit: "m" };
  if (/day|^d$/i.test(u)) return { duration: n, duration_unit: "d" };
  return { duration: n, duration_unit: "m" };
}

const CONVERSE_REPLIES: Record<string, string> = {
  greet: "Hey! I'm TradeGPT — your AI trading assistant. Ask me about your balance, market prices, or just say 'buy $10 rise on VOL 100 for 5 minutes' to place a trade.",
  help: "Here's what I can do:\n• **Balance** — 'What's my balance?'\n• **Price** — 'Price of EUR/USD'\n• **Trade** — 'Buy $10 rise on VOL 100 for 5 minutes'\n• **Portfolio** — 'Show my open positions'\n• **Statement** — 'Show my recent transactions'\n• **Markets** — 'What markets are available?'",
  default: "I can help you check your balance, get market prices, place trades, or view your portfolio. What would you like to do?",
};

export function parseIntentLocally(message: string): TradeIntent {
  const m = message.trim();

  if (/\bbalance\b|how much (do i have|money|funds)/i.test(m)) {
    return { action: "get_balance", raw: m };
  }

  if (/\b(statement|transactions|transaction history|recent trades|trade history)\b/i.test(m)) {
    return { action: "get_statement", raw: m };
  }

  if (/\b(portfolio|positions|open (trades|contracts|positions))\b/i.test(m)) {
    return { action: "get_portfolio", raw: m };
  }

  if (/\b(symbols|markets|available markets|what can i trade|active symbols)\b/i.test(m)) {
    return { action: "get_symbols", raw: m };
  }

  if (/\b(price|quote|how much is|current.*price|what.*price|rate)\b/i.test(m)) {
    return { action: "get_price", symbol: extractSymbol(m), raw: m };
  }

  const isPut = /\b(sell|fall|put|down|lower|short|decline|drop|bearish)\b/i.test(m);
  const isCall = /\b(buy|rise|call|up|higher|long|bullish)\b/i.test(m);
  if (isPut || isCall) {
    const { duration, duration_unit } = extractDuration(m);
    return {
      action: "propose_trade",
      symbol: extractSymbol(m),
      amount: extractAmount(m),
      duration,
      duration_unit,
      contract_type: isPut ? "PUT" : "CALL",
      raw: m,
    };
  }

  if (/\b(hi|hello|hey|sup|what('s| is) up)\b/i.test(m)) {
    return { action: "converse", conversationalReply: CONVERSE_REPLIES.greet, raw: m };
  }

  if (/\b(help|what can you do|commands|features)\b/i.test(m)) {
    return { action: "converse", conversationalReply: CONVERSE_REPLIES.help, raw: m };
  }

  return { action: "converse", conversationalReply: CONVERSE_REPLIES.default, raw: m };
}

export function generateTradeSuggestionLocally(symbol: string, currentPrice: number, history: number[]): string {
  if (history.length < 10) return "";

  const oldest = history[0];
  const pctChange = (((currentPrice - oldest) / oldest) * 100);
  const recentSlice = history.slice(-10);
  const recentTrend = recentSlice[recentSlice.length - 1] > recentSlice[0] ? "rising" : "falling";
  const direction = currentPrice > oldest ? "up" : "down";
  const displayName: Record<string, string> = {
    "1HZ100V": "Volatility 100", "1HZ75V": "Volatility 75", "1HZ50V": "Volatility 50",
    "1HZ25V": "Volatility 25", "frxEURUSD": "EUR/USD", "frxGBPUSD": "GBP/USD",
    "frxUSDJPY": "USD/JPY", "cryBTCUSD": "BTC/USD", "cryETHUSD": "ETH/USD",
    "BOOM1000": "Boom 1000", "CRASH1000": "Crash 1000",
  };
  const name = displayName[symbol] ?? symbol;
  const pct = Math.abs(pctChange).toFixed(3);

  if (recentTrend === "rising" && direction === "up") {
    return `${name} is trending up ${pct}% over the session with the recent 10 ticks confirming momentum. A CALL (rise) trade aligns with the current trend.`;
  }
  if (recentTrend === "falling" && direction === "down") {
    return `${name} has dropped ${pct}% with recent ticks showing continued selling pressure. A PUT (fall) trade aligns with the downward momentum.`;
  }
  if (recentTrend === "rising" && direction === "down") {
    return `${name} is down ${pct}% overall but the last 10 ticks show a recovery attempt. Watch for a reversal — a CALL could work if momentum continues upward.`;
  }
  return `${name} is up ${pct}% overall but recent ticks show fading momentum. A PUT could be worth considering if the pullback continues.`;
}

export function formatResponse(action: TradeIntent["action"], data: unknown): string {
  const d = data as Record<string, unknown>;

  switch (action) {
    case "get_balance": {
      const balance = (d.balance as Record<string, unknown>);
      return `Your current balance is **${balance?.balance} ${balance?.currency}**`;
    }
    case "get_price": {
      const tick = (d.tick as Record<string, unknown>);
      return `Current price for **${tick?.symbol}**: **${tick?.quote}**\n_Updated: ${new Date(Number(tick?.epoch) * 1000).toLocaleTimeString()}_`;
    }
    case "get_symbols": {
      const symbols = (d.active_symbols as Array<Record<string, unknown>>)?.slice(0, 15);
      const list = symbols?.map(s => `• **${s.underlying_symbol ?? s.symbol}** — ${s.underlying_symbol_name ?? s.display_name}`).join("\n");
      return `Available markets:\n${list}\n\n_...and more. Ask me about a specific one!_`;
    }
    case "get_portfolio": {
      const contracts = (d.portfolio as Record<string, unknown>)?.contracts as Array<Record<string, unknown>>;
      if (!contracts?.length) return "You have no open positions.";
      const list = contracts.map(c => `• **${c.contract_type}** on ${c.symbol} — $${c.buy_price} | Payout: $${c.payout}`).join("\n");
      return `Your open positions:\n${list}`;
    }
    case "get_statement": {
      const transactions = (d.statement as Record<string, unknown>)?.transactions as Array<Record<string, unknown>>;
      if (!transactions?.length) return "No recent transactions found.";
      const list = transactions.slice(0, 5).map(t =>
        `• **${t.action_type}** — $${t.amount} | ${new Date(Number(t.transaction_time) * 1000).toLocaleDateString()}`
      ).join("\n");
      return `Your recent transactions:\n${list}`;
    }
    case "propose_trade": {
      const proposal = d.proposal as Record<string, unknown>;
      return `Trade proposal ready!\n\n**${proposal?.longcode}**\n\nCost: **$${proposal?.ask_price}** | Payout: **$${proposal?.payout}**\n\nType "confirm" to execute this trade.`;
    }
    default:
      return "Hmm, I didn't quite get that. Try asking about your balance, a market price, or placing a trade.";
  }
}
