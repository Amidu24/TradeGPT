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

const INTENT_SYSTEM_PROMPT = `You are a trading assistant intent parser for a Deriv trading app.
Analyse the user's message and return a JSON object with this exact shape:
{
  "action": one of: "get_price" | "get_balance" | "get_symbols" | "propose_trade" | "get_portfolio" | "get_statement" | "converse",
  "symbol": Deriv symbol string (e.g. "frxEURUSD", "R_100", "cryBTCUSD") — only for get_price or propose_trade,
  "amount": number — only for propose_trade,
  "duration": number — only for propose_trade,
  "duration_unit": "m" | "s" | "t" — only for propose_trade,
  "contract_type": "CALL" | "PUT" — only for propose_trade (CALL = rise/up, PUT = fall/down),
  "conversationalReply": string — only for action "converse", a friendly helpful response
}

Symbol mapping (use exact Deriv API V2 symbol names):
- EUR/USD, eurusd → frxEURUSD
- GBP/USD, gbpusd → frxGBPUSD
- BTC, bitcoin → cryBTCUSD
- ETH, ethereum → cryETHUSD
- Volatility 100, V100, VOL 100 → 1HZ100V
- Volatility 75, V75, VOL 75 → 1HZ75V
- Volatility 50, V50, VOL 50 → 1HZ50V
- Volatility 25, V25, VOL 25 → 1HZ25V
- Step Index → stpRNG
- Boom 1000 → BOOM1000
- Crash 1000 → CRASH1000

Default symbol if none specified: 1HZ100V
Default amount if none specified: 10
Default duration if none specified: 5m

Return ONLY the raw JSON object, no markdown, no explanation.`;

async function callClaude(system: string, userContent: string, maxTokens: number): Promise<string> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "x-api-key": apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-4-5-sonnet",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const body = await res.text();
  if (!res.ok || body.trimStart().startsWith("<")) {
    throw new Error(`Claude unavailable (${res.status})`);
  }
  const data = JSON.parse(body) as { content: Array<{ type: string; text: string }> };
  return data.content?.[0]?.text?.trim() ?? "";
}

// --- Local fallback parser (used when Claude is unreachable) ---

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

function parseIntentLocally(message: string): TradeIntent {
  const m = message.trim();
  if (/\bbalance\b|how much (do i have|money|funds)/i.test(m))
    return { action: "get_balance", raw: m };
  if (/\b(statement|transactions|transaction history|recent trades|trade history)\b/i.test(m))
    return { action: "get_statement", raw: m };
  if (/\b(portfolio|positions|open (trades|contracts|positions))\b/i.test(m))
    return { action: "get_portfolio", raw: m };
  if (/\b(symbols|markets|available markets|what can i trade|active symbols)\b/i.test(m))
    return { action: "get_symbols", raw: m };
  if (/\b(price|quote|how much is|current.*price|what.*price|rate)\b/i.test(m))
    return { action: "get_price", symbol: extractSymbol(m), raw: m };
  const isPut = /\b(sell|fall|put|down|lower|short|decline|drop|bearish)\b/i.test(m);
  const isCall = /\b(buy|rise|call|up|higher|long|bullish)\b/i.test(m);
  if (isPut || isCall) {
    const { duration, duration_unit } = extractDuration(m);
    return { action: "propose_trade", symbol: extractSymbol(m), amount: extractAmount(m), duration, duration_unit, contract_type: isPut ? "PUT" : "CALL", raw: m };
  }
  if (/\b(hi|hello|hey)\b/i.test(m))
    return { action: "converse", conversationalReply: "Hey! I'm TradeGPT — your AI trading assistant. Ask me about your balance, market prices, or say 'buy $10 rise on VOL 100 for 5 minutes' to place a trade.", raw: m };
  if (/\b(help|what can you do)\b/i.test(m))
    return { action: "converse", conversationalReply: "I can check your **balance**, get **market prices**, **place trades**, show your **portfolio** or **statement**, and list available **markets**. Just ask naturally!", raw: m };
  return { action: "converse", conversationalReply: "I can help you check your balance, get market prices, place trades, or view your portfolio. What would you like to do?", raw: m };
}

// --- Public API ---

export async function parseIntentWithClaude(message: string): Promise<TradeIntent & { _via?: string }> {
  try {
    const text = await callClaude(INTENT_SYSTEM_PROMPT, message, 300);
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean) as Omit<TradeIntent, "raw">;
    return { ...parsed, raw: message, _via: "claude" };
  } catch (err) {
    console.warn("[intent] Claude unavailable, using local parser:", err instanceof Error ? err.message : err);
    return { ...parseIntentLocally(message), _via: "local" };
  }
}

export async function generateTradeSuggestion(symbol: string, currentPrice: number, history: number[]): Promise<string> {
  if (history.length < 10) return "";

  const oldest = history[0];
  const pctChange = (((currentPrice - oldest) / oldest) * 100).toFixed(3);
  const direction = currentPrice > oldest ? "up" : "down";
  const recentSlice = history.slice(-10);
  const recentTrend = recentSlice[recentSlice.length - 1] > recentSlice[0] ? "rising" : "falling";

  try {
    return await callClaude(
      `You are a sharp, concise trading assistant. Given market data, write a single short suggestion (2-3 sentences max) about whether the user should consider a CALL (rise) or PUT (fall) trade. Be direct and confident but include a brief reason. Never give financial advice disclaimers. Never use markdown.`,
      `Symbol: ${symbol}. Price has moved ${direction} ${pctChange}% over the last 60 ticks. Recent 10-tick trend is ${recentTrend}. Current price: ${currentPrice}.`,
      120
    );
  } catch {
    // Fallback to local rule-based suggestion
    const displayName: Record<string, string> = {
      "1HZ100V": "Volatility 100", "1HZ75V": "Volatility 75", "1HZ50V": "Volatility 50",
      "1HZ25V": "Volatility 25", "frxEURUSD": "EUR/USD", "frxGBPUSD": "GBP/USD",
      "frxUSDJPY": "USD/JPY", "cryBTCUSD": "BTC/USD", "cryETHUSD": "ETH/USD",
      "BOOM1000": "Boom 1000", "CRASH1000": "Crash 1000",
    };
    const name = displayName[symbol] ?? symbol;
    const pct = Math.abs(parseFloat(pctChange)).toFixed(3);
    if (recentTrend === "rising" && direction === "up")
      return `${name} is trending up ${pct}% with recent ticks confirming momentum. A CALL (rise) trade aligns with the current trend.`;
    if (recentTrend === "falling" && direction === "down")
      return `${name} has dropped ${pct}% with recent ticks showing continued pressure. A PUT (fall) trade aligns with the downward momentum.`;
    if (recentTrend === "rising" && direction === "down")
      return `${name} is down ${pct}% overall but the last 10 ticks show a recovery. A CALL could work if momentum continues upward.`;
    return `${name} is up ${pct}% overall but recent ticks show fading momentum. A PUT could be worth considering if the pullback continues.`;
  }
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
