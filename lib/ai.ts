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

Symbol mapping:
- EUR/USD, eurusd → frxEURUSD
- GBP/USD, gbpusd → frxGBPUSD
- BTC, bitcoin → cryBTCUSD
- ETH, ethereum → cryETHUSD
- Volatility 100, V100 → R_100
- Volatility 75, V75 → R_75
- Volatility 50, V50 → R_50
- Volatility 25, V25 → R_25
- Step Index → stpRNG
- Boom 1000 → BOOM1000
- Crash 1000 → CRASH1000

Default symbol if none specified: R_100
Default amount if none specified: 10
Default duration if none specified: 5m

Return ONLY the raw JSON object, no markdown, no explanation.`;

export async function parseIntentWithClaude(message: string): Promise<TradeIntent> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_ANTHROPIC_BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY}`,
      "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-4-5-sonnet",
      max_tokens: 300,
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const raw = data.content?.[0]?.text ?? "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(text) as Omit<TradeIntent, "raw">;
  return { ...parsed, raw: message };
}

export async function generateTradeSuggestion(symbol: string, currentPrice: number, history: number[]): Promise<string> {
  if (history.length < 10) return "";

  const oldest = history[0];
  const pctChange = (((currentPrice - oldest) / oldest) * 100).toFixed(3);
  const direction = currentPrice > oldest ? "up" : "down";
  const recentSlice = history.slice(-10);
  const recentTrend = recentSlice[recentSlice.length - 1] > recentSlice[0] ? "rising" : "falling";

  const res = await fetch(`${process.env.NEXT_PUBLIC_ANTHROPIC_BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY}`,
      "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-4-5-sonnet",
      max_tokens: 120,
      system: `You are a sharp, concise trading assistant. Given market data, write a single short suggestion (2-3 sentences max) about whether the user should consider a CALL (rise) or PUT (fall) trade. Be direct and confident but include a brief reason. Never give financial advice disclaimers. Never use markdown.`,
      messages: [{
        role: "user",
        content: `Symbol: ${symbol}. Price has moved ${direction} ${pctChange}% over the last 60 ticks. Recent 10-tick trend is ${recentTrend}. Current price: ${currentPrice}.`,
      }],
    }),
  });

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content?.[0]?.text?.trim() ?? "";
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
      const list = symbols?.map(s => `• **${s.symbol}** — ${s.display_name}`).join("\n");
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
