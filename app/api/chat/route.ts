import { NextRequest, NextResponse } from "next/server";
import {
  formatResponse, parseIntentWithClaude, generateTradeSuggestion,
  generateConversationalReply, type TradeIntent, type ChatMessage,
} from "@/lib/ai";
import { buildAppContext, type AppSnapshot } from "@/lib/appContext";
import { callPublic, callAuth, callAuthPipeline, callAuthMulti } from "@/lib/derivV2Client";
import { toV2, isSyntheticV2 } from "@/lib/derivV2Symbols";

interface ValidCta { duration: number; durationUnit: string; durationLabel: string; }

async function getTickHistory(symbol: string): Promise<number[]> {
  try {
    const data = await callPublic({ ticks_history: symbol, end: "latest", count: 60, style: "ticks" });
    const prices = (data.history as { prices: number[] })?.prices;
    return prices ?? [];
  } catch { return []; }
}

async function getValidCta(symbol: string): Promise<ValidCta> {
  const fallback: ValidCta = isSyntheticV2(symbol)
    ? { duration: 5, durationUnit: "m", durationLabel: "5 min" }
    : { duration: 1, durationUnit: "d", durationLabel: "1 day" };
  try {
    const data = await callPublic({ contracts_for: symbol, currency: "USD", product_type: "basic" });
    const available = (data.contracts_for as Record<string, unknown>)?.available as Array<Record<string, unknown>>;
    const callContract = available?.find(c => c.contract_type === "CALL");
    if (!callContract) return fallback;
    const match = String(callContract.min_contract_duration ?? "").match(/^(\d+)([tsmhd])$/);
    if (!match) return fallback;
    const [, num, unit] = match;
    const labelMap: Record<string, string> = { t: "tick", s: "sec", m: "min", h: "hr", d: "day" };
    const n = parseInt(num);
    return { duration: n, durationUnit: unit, durationLabel: `${n} ${labelMap[unit] ?? unit}${n > 1 && unit !== "m" ? "s" : ""}` };
  } catch { return fallback; }
}

function getSession(req: NextRequest) {
  return {
    accessToken: req.cookies.get("deriv_access_token")?.value,
    accountId:   req.cookies.get("deriv_account_id")?.value,
  };
}

async function fetchLiveAccountStats(accessToken: string, accountId: string): Promise<string> {
  try {
    const results = await callAuthMulti(accessToken, accountId, [
      { balance: 1 },
      { profit_table: 1, limit: 20, sort: "DESC" },
    ]);
    const balance    = results[1]?.balance as Record<string, unknown>;
    const trades     = ((results[2]?.profit_table as Record<string, unknown>)?.transactions as Array<Record<string, unknown>>) ?? [];
    const now        = Date.now() / 1000;
    const todayStart = now - (now % 86400);
    const todayTrades = trades.filter(t => Number(t.purchase_time) >= todayStart);
    const todayPnl    = todayTrades.reduce((s, t) => s + (Number(t.sell_price) - Number(t.buy_price)), 0);
    const totalPnl    = trades.reduce((s, t) => s + (Number(t.sell_price) - Number(t.buy_price)), 0);
    const wins        = trades.filter(t => Number(t.sell_price) > Number(t.buy_price));
    const winRate     = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;

    const lines = [
      "## Live Account (authoritative — from Deriv)",
      `- Balance: ${balance?.balance} ${balance?.currency}`,
      `- Today's P&L: ${todayPnl >= 0 ? "+" : ""}$${todayPnl.toFixed(2)} across ${todayTrades.length} trade${todayTrades.length !== 1 ? "s" : ""}`,
      `- Recent P&L (last ${trades.length} trades): ${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`,
      `- Win rate (recent ${trades.length} trades): ${winRate}%`,
    ];
    if (todayTrades.length > 0) {
      lines.push("- Today's trades:");
      for (const t of todayTrades.slice(0, 5)) {
        const pnl = Number(t.sell_price) - Number(t.buy_price);
        lines.push(`  • ${t.shortcode ?? t.contract_id}: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);
      }
    }
    return "\n\n" + lines.join("\n");
  } catch {
    return "";
  }
}

async function handlePowerCard(
  cardId: string,
  accessToken: string | undefined,
  accountId: string | undefined,
): Promise<{ reply: string; proposal?: Record<string, unknown>; clearProposal?: boolean } | null> {
  if (cardId === "signal_boost") {
    if (!accessToken || !accountId) return { reply: "Please log in to use Signal Boost." };
    const symbols = ["1HZ100V", "1HZ75V", "1HZ50V"] as const;
    const histories = await Promise.all(symbols.map(s => getTickHistory(s)));
    let bestIdx = 0, bestMomentum = -Infinity;
    for (let i = 0; i < symbols.length; i++) {
      const h = histories[i];
      if (h.length < 5) continue;
      const momentum = Math.abs(h[h.length - 1] - h[h.length - 5]);
      if (momentum > bestMomentum) { bestMomentum = momentum; bestIdx = i; }
    }
    const sym = symbols[bestIdx];
    const h   = histories[bestIdx];
    const direction: "CALL" | "PUT" = (h.length >= 5 && h[h.length - 1] >= h[h.length - 5]) ? "CALL" : "PUT";
    const data = await callAuth(accessToken, accountId, {
      proposal: 1, amount: 10, basis: "stake",
      contract_type: direction, currency: "USD",
      duration: 5, duration_unit: "m", underlying_symbol: sym,
    });
    const proposal = data.proposal as Record<string, unknown>;
    const names: Record<string, string> = { "1HZ100V": "VOL 100", "1HZ75V": "VOL 75", "1HZ50V": "VOL 50" };
    const dir = direction === "CALL" ? "bullish ↑" : "bearish ↓";
    return {
      reply: `🧠 **Signal Boost** scanned VOL 100, 75, and 50.\n\n**Best signal: ${names[sym]}** — momentum is ${dir} right now.\n\n**${proposal?.longcode}**\n\nCost: **$${proposal?.ask_price}** | Payout: **$${proposal?.payout}**\n\nType "confirm" to execute.`,
      proposal: { ...data, _params: { symbol: sym, contract_type: direction, amount: 10, duration: 5, duration_unit: "m" } },
    };
  }

  if (cardId === "market_scan") {
    const symbols = [
      { sym: "1HZ100V", name: "VOL 100" },
      { sym: "1HZ75V",  name: "VOL 75" },
      { sym: "1HZ50V",  name: "VOL 50" },
      { sym: "frxEURUSD", name: "EUR/USD" },
      { sym: "cryBTCUSD", name: "BTC/USD" },
    ];
    const results = await Promise.allSettled(symbols.map(async ({ sym }) => {
      const h = await getTickHistory(sym);
      const price = h[h.length - 1] ?? 0;
      const trend = h.length >= 10 ? (h[h.length - 1] > h[h.length - 10] ? "↑" : "↓") : "—";
      const momentum = h.length >= 10 ? Math.abs(((h[h.length - 1] - h[h.length - 10]) / h[h.length - 10]) * 100) : 0;
      return { price, trend, momentum };
    }));
    let lines = ["📡 **Market Scan** — live snapshot:\n"];
    let bestSynth = "VOL 100", bestMom = -Infinity;
    for (let i = 0; i < symbols.length; i++) {
      const r = results[i];
      const s = symbols[i];
      if (r.status === "fulfilled") {
        const { price, trend, momentum } = r.value;
        const priceStr = price >= 100 ? price.toFixed(2) : price.toFixed(5);
        lines.push(`• **${s.name}** ${trend} ${priceStr} (${momentum.toFixed(3)}% move)`);
        if (i < 3 && momentum > bestMom) { bestMom = momentum; bestSynth = s.name; }
      } else {
        lines.push(`• **${s.name}** — unavailable`);
      }
    }
    lines.push(`\n💡 **Best opportunity:** ${bestSynth} has the strongest recent momentum. Say "buy $10 rise on ${bestSynth}" to trade.`);
    return { reply: lines.join("\n") };
  }

  if (cardId === "double_down") {
    if (!accessToken || !accountId) return { reply: "Please log in to use Double Down." };
    const tradeData = await callAuth(accessToken, accountId, { profit_table: 1, limit: 5, sort: "DESC" });
    const transactions = ((tradeData.profit_table as Record<string, unknown>)?.transactions as Array<Record<string, unknown>>) ?? [];
    const last = transactions[0];
    if (!last) return { reply: "💥 **Double Down** — no recent trades found. Place a trade first!" };

    const shortcode = String(last.shortcode ?? "");
    const parts = shortcode.split("_");
    const contractType: "CALL" | "PUT" = (parts[0] === "PUT") ? "PUT" : "CALL";
    // Extract symbol: could be "R_100" (V1) or "1HZ100V" (V2) or "frxEURUSD"
    const rawSym = parts.slice(1, 3).join("_");
    const sym = toV2(rawSym) || rawSym || "1HZ100V";
    const synthetic = isSyntheticV2(sym);
    const lastStake = Number(last.buy_price ?? 10);
    const doubleStake = Math.round(lastStake * 2 * 100) / 100;

    const data = await callAuth(accessToken, accountId, {
      proposal: 1, amount: doubleStake, basis: "stake",
      contract_type: contractType, currency: "USD",
      duration: synthetic ? 5 : 1, duration_unit: synthetic ? "m" : "d",
      underlying_symbol: sym,
    });
    const proposal = data.proposal as Record<string, unknown>;
    const names: Record<string, string> = {
      "1HZ100V": "VOL 100", "1HZ75V": "VOL 75", "1HZ50V": "VOL 50",
      "frxEURUSD": "EUR/USD", "cryBTCUSD": "BTC/USD",
    };
    const dirEmoji = contractType === "CALL" ? "↑ RISE" : "↓ FALL";
    return {
      reply: `💥 **Double Down** — last trade: ${dirEmoji} ${names[sym] ?? sym} at $${lastStake.toFixed(2)}.\n\nDoubling to **$${doubleStake.toFixed(2)}**:\n\n**${proposal?.longcode}**\n\nCost: **$${proposal?.ask_price}** | Payout: **$${proposal?.payout}**\n\nType "confirm" to execute.`,
      proposal: { ...data, _params: { symbol: sym, contract_type: contractType, amount: doubleStake, duration: synthetic ? 5 : 1, duration_unit: synthetic ? "m" : "d" } },
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { message, pendingProposal, chatHistory, appSnapshot, activePowerCard } = await req.json() as {
      message:          string;
      pendingProposal?: Record<string, unknown>;
      chatHistory?:     ChatMessage[];
      appSnapshot?:     AppSnapshot;
      activePowerCard?: string;
    };

    const { accessToken, accountId } = getSession(req);

    // Power card shortcuts — bypass normal intent parsing
    if (activePowerCard) {
      try {
        const result = await handlePowerCard(activePowerCard, accessToken, accountId);
        if (result) return NextResponse.json(result);
      } catch (err) {
        const error = err as { message?: string };
        return NextResponse.json({ reply: `❌ Power card failed: ${error?.message ?? "Unknown error"}` });
      }
    }

    // Build base context from client snapshot, then fetch live Deriv stats in parallel with intent parsing
    const baseContext = (accountId && appSnapshot) ? buildAppContext(accountId, appSnapshot) : undefined;

    const [intent, liveStats] = await Promise.all([
      parseIntentWithClaude(message, baseContext),
      (accessToken && accountId) ? fetchLiveAccountStats(accessToken, accountId) : Promise.resolve(""),
    ]);

    const context = baseContext != null ? baseContext + liveStats : undefined;

    // Trade confirmation — propose and buy on a single WebSocket connection (proposal IDs are session-scoped)
    if (pendingProposal && message.toLowerCase().includes("confirm")) {
      if (!accessToken || !accountId) return NextResponse.json({ reply: "Please log in to execute trades." });
      const params = pendingProposal._params as { symbol: string; contract_type: string; amount: number; duration: number; duration_unit: string } | undefined;
      if (!params) return NextResponse.json({ reply: "❌ No trade parameters found. Please request a new proposal." });
      const result   = await callAuthPipeline(accessToken, accountId, {
        proposal: 1, amount: params.amount, basis: "stake",
        contract_type: params.contract_type, currency: "USD",
        duration: params.duration, duration_unit: params.duration_unit,
        underlying_symbol: params.symbol,
      });
      const contract = result.buy as Record<string, unknown>;
      return NextResponse.json({
        reply: `✅ Trade executed!\n\n**Contract ID:** ${contract?.contract_id}\n**Paid:** $${contract?.buy_price}\n**Start:** ${new Date(Number(contract?.start_time) * 1000).toLocaleTimeString()}\n\nGood luck! 🚀`,
        clearProposal: true,
      });
    }

    if (intent.action === "converse") {
      const reply = await generateConversationalReply(message, chatHistory, context);
      return NextResponse.json({ reply });
    }

    const v2Symbol = intent.symbol ? toV2(intent.symbol) : undefined;
    let data: Record<string, unknown> = {};
    let finalDur  = intent.duration      || 5;
    let finalUnit = intent.duration_unit || "m";

    switch (intent.action) {
      case "get_balance": {
        if (!accessToken || !accountId) return NextResponse.json({ reply: "Please log in to check your balance." });
        data = await callAuth(accessToken, accountId, { balance: 1 });
        break;
      }
      case "get_price": {
        const [tickData, tickHistory, validCta] = await Promise.all([
          callPublic({ ticks: v2Symbol }),
          getTickHistory(v2Symbol!),
          getValidCta(v2Symbol!),
        ]);
        data = tickData;
        const tick       = tickData.tick as Record<string, unknown>;
        const price      = Number(tick?.quote);
        const symbol     = String(tick?.symbol);
        const suggestion = await generateTradeSuggestion(symbol, price, tickHistory) || undefined;
        return NextResponse.json({
          reply: formatResponse("get_price", data),
          priceData: { symbol, price, history: tickHistory, validCta, suggestion },
        });
      }
      case "get_symbols":
        data = await callPublic({ active_symbols: "brief" });
        break;
      case "get_portfolio": {
        if (!accessToken || !accountId) return NextResponse.json({ reply: "Please log in to see your portfolio." });
        data = await callAuth(accessToken, accountId, { portfolio: 1 });
        break;
      }
      case "get_statement": {
        if (!accessToken || !accountId) return NextResponse.json({ reply: "Please log in to see your statement." });
        data = await callAuth(accessToken, accountId, { statement: 1, limit: 10 });
        break;
      }
      case "propose_trade": {
        if (!accessToken || !accountId) return NextResponse.json({ reply: "Please log in to place trades." });
        const tradeSymbol = v2Symbol || "1HZ100V";
        const synthetic   = isSyntheticV2(tradeSymbol);
        // Crypto/forex only support day-based durations; override if user requested minutes/ticks
        const rawUnit = intent.duration_unit || (synthetic ? "m" : "d");
        finalUnit = (!synthetic && rawUnit !== "d") ? "d" : rawUnit;
        finalDur  = finalUnit === "d" ? (intent.duration && rawUnit === "d" ? intent.duration : 1) : (intent.duration || 5);
        data = await callAuth(accessToken, accountId, {
          proposal: 1,
          amount:            intent.amount        || 10,
          basis:             "stake",
          contract_type:     intent.contract_type || "CALL",
          currency:          "USD",
          duration:          finalDur,
          duration_unit:     finalUnit,
          underlying_symbol: tradeSymbol,
        });
        break;
      }
      default:
        return NextResponse.json({ reply: formatResponse("unknown", {}) });
    }

    const reply       = formatResponse(intent.action, data);
    const proposalData = intent.action === "propose_trade"
      ? { ...data, _params: { symbol: v2Symbol || "1HZ100V", contract_type: intent.contract_type || "CALL", amount: intent.amount || 10, duration: finalDur, duration_unit: finalUnit } }
      : null;

    return NextResponse.json({ reply, proposal: proposalData });
  } catch (err) {
    const error = err as { message?: string };
    return NextResponse.json(
      { reply: `❌ Error: ${error?.message || "Something went wrong. Please try again."}` },
      { status: 500 }
    );
  }
}
