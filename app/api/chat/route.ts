import { NextRequest, NextResponse } from "next/server";
import { formatResponse, parseIntentWithClaude, generateTradeSuggestion, generateConversationalReply, type TradeIntent, type ChatMessage } from "@/lib/ai";
import { callPublic, callAuth } from "@/lib/derivV2Client";
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
    accountId: req.cookies.get("deriv_account_id")?.value,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { message, pendingProposal, history } = await req.json() as {
      message: string;
      pendingProposal?: Record<string, unknown>;
      history?: ChatMessage[];
    };
    const intent = await parseIntentWithClaude(message);

    const { accessToken, accountId } = getSession(req);

    // Trade confirmation
    if (pendingProposal && message.toLowerCase().includes("confirm")) {
      if (!accessToken || !accountId) return NextResponse.json({ reply: "Please log in to execute trades." });
      const proposal = pendingProposal.proposal as Record<string, unknown>;
      const result = await callAuth(accessToken, accountId, { buy: proposal?.id, price: proposal?.ask_price });
      const contract = result.buy as Record<string, unknown>;
      return NextResponse.json({
        reply: `✅ Trade executed!\n\n**Contract ID:** ${contract?.contract_id}\n**Paid:** $${contract?.buy_price}\n**Start:** ${new Date(Number(contract?.start_time) * 1000).toLocaleTimeString()}\n\nGood luck! 🚀`,
        clearProposal: true,
      });
    }

    if (intent.action === "converse") {
      const reply = await generateConversationalReply(message, history);
      return NextResponse.json({ reply });
    }

    const v2Symbol = intent.symbol ? toV2(intent.symbol) : undefined;
    let data: Record<string, unknown> = {};

    switch (intent.action) {
      case "get_balance": {
        if (!accessToken || !accountId) return NextResponse.json({ reply: "Please log in to check your balance." });
        data = await callAuth(accessToken, accountId, { balance: 1 });
        break;
      }
      case "get_price": {
        const [tickData, history, validCta] = await Promise.all([
          callPublic({ ticks: v2Symbol }),
          getTickHistory(v2Symbol!),
          getValidCta(v2Symbol!),
        ]);
        data = tickData;
        const tick = tickData.tick as Record<string, unknown>;
        const price = Number(tick?.quote);
        const symbol = String(tick?.symbol);
        const suggestion = await generateTradeSuggestion(symbol, price, history) || undefined;
        return NextResponse.json({
          reply: formatResponse("get_price", data),
          priceData: { symbol, price, history, validCta, suggestion },
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
        data = await callAuth(accessToken, accountId, {
          proposal: 1,
          amount: intent.amount || 10,
          basis: "stake",
          contract_type: intent.contract_type || "CALL",
          currency: "USD",
          duration: intent.duration || 5,
          duration_unit: intent.duration_unit || "m",
          underlying_symbol: v2Symbol || "1HZ100V",
        });
        break;
      }
      default:
        return NextResponse.json({ reply: formatResponse("unknown", {}) });
    }

    const reply = formatResponse(intent.action, data);
    const proposalData = intent.action === "propose_trade" ? data : null;

    return NextResponse.json({ reply, proposal: proposalData });
  } catch (err) {
    const error = err as { message?: string };
    return NextResponse.json(
      { reply: `❌ Error: ${error?.message || "Something went wrong. Please try again."}` },
      { status: 500 }
    );
  }
}
