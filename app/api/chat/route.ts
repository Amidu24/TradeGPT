import { NextRequest, NextResponse } from "next/server";
import { formatResponse, TradeIntent } from "@/lib/ai";
import WebSocket from "ws";

const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";
const DERIV_TOKEN = process.env.DERIV_API_TOKEN!;

async function callDeriv(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS_URL);
    let authorized = false;

    ws.on("open", () => {
      ws.send(JSON.stringify({ authorize: DERIV_TOKEN, req_id: 1 }));
    });

    ws.on("message", (raw: Buffer) => {
      const data = JSON.parse(raw.toString());

      if (data.msg_type === "authorize" && !authorized) {
        authorized = true;
        ws.send(JSON.stringify({ ...payload, req_id: 2 }));
        return;
      }

      if (data.req_id === 2) {
        ws.close();
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
      }
    });

    ws.on("error", reject);
    setTimeout(() => { ws.close(); reject(new Error("Timeout")); }, 10000);
  });
}

async function getTickHistory(symbol: string): Promise<number[]> {
  try {
    const data = await callDeriv({
      ticks_history: symbol,
      end: "latest",
      count: 60,
      style: "ticks",
    });
    const prices = data.history as { prices: number[] };
    return prices?.prices ?? [];
  } catch {
    return [];
  }
}

interface ValidCta {
  duration: number;
  durationUnit: string;
  durationLabel: string;
}

async function getValidCta(symbol: string): Promise<ValidCta> {
  // Fallback defaults per market type
  const isSynthetic = /^R_|BOOM|CRASH|stpRNG/i.test(symbol);
  const fallback: ValidCta = isSynthetic
    ? { duration: 5, durationUnit: "m", durationLabel: "5 min" }
    : { duration: 1, durationUnit: "d", durationLabel: "1 day" };

  try {
    const data = await callDeriv({ contracts_for: symbol, currency: "USD", product_type: "basic" });
    const available = (data.contracts_for as Record<string, unknown>)?.available as Array<Record<string, unknown>>;
    if (!available?.length) return fallback;

    // Find a CALL contract and parse its minimum duration
    const callContract = available.find(c => c.contract_type === "CALL");
    if (!callContract) return fallback;

    const minDur = String(callContract.min_contract_duration ?? "");
    const match = minDur.match(/^(\d+)([tsmhd])$/);
    if (!match) return fallback;

    const [, num, unit] = match;
    const labelMap: Record<string, string> = { t: "tick", s: "sec", m: "min", h: "hr", d: "day" };
    const n = parseInt(num);
    return {
      duration: n,
      durationUnit: unit,
      durationLabel: `${n} ${labelMap[unit] ?? unit}${n > 1 && unit !== "m" ? "s" : ""}`,
    };
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, intent, pendingProposal } = await req.json() as {
      message: string;
      intent: TradeIntent;
      pendingProposal?: Record<string, unknown>;
    };

    // Handle trade confirmation
    if (pendingProposal && message.toLowerCase().includes("confirm")) {
      const proposal = pendingProposal.proposal as Record<string, unknown>;
      const result = await callDeriv({ buy: proposal?.id, price: proposal?.ask_price });
      const contract = result.buy as Record<string, unknown>;
      return NextResponse.json({
        reply: `✅ Trade executed!\n\n**Contract ID:** ${contract?.contract_id}\n**Paid:** $${contract?.buy_price}\n**Start:** ${new Date(Number(contract?.start_time) * 1000).toLocaleTimeString()}\n\nGood luck! 🚀`,
        clearProposal: true,
      });
    }

    if (intent.action === "converse") {
      return NextResponse.json({ reply: intent.conversationalReply });
    }

    let data: Record<string, unknown> = {};

    switch (intent.action) {
      case "get_balance":
        data = await callDeriv({ balance: 1, account: "current" });
        break;
      case "get_price": {
        const [tickData, history, validCta] = await Promise.all([
          callDeriv({ ticks: intent.symbol }),
          getTickHistory(intent.symbol!),
          getValidCta(intent.symbol!),
        ]);
        data = tickData;
        const tick = tickData.tick as Record<string, unknown>;
        return NextResponse.json({
          reply: formatResponse("get_price", data),
          priceData: { symbol: String(tick?.symbol), price: Number(tick?.quote), history, validCta },
        });
      }
      case "get_symbols":
        data = await callDeriv({ active_symbols: "brief", product_type: "basic" });
        break;
      case "get_portfolio":
        data = await callDeriv({ portfolio: 1 });
        break;
      case "get_statement":
        data = await callDeriv({ statement: 1, limit: 10 });
        break;
      case "propose_trade":
        data = await callDeriv({
          proposal: 1,
          amount: intent.amount || 10,
          basis: "stake",
          contract_type: intent.contract_type || "CALL",
          currency: "USD",
          duration: intent.duration || 5,
          duration_unit: intent.duration_unit || "m",
          symbol: intent.symbol || "R_100",
        });
        break;
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
