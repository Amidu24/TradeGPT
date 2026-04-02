import { NextRequest, NextResponse } from "next/server";
import { callAuthMulti } from "@/lib/derivV2Client";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("deriv_access_token")?.value;
  const accountId = req.cookies.get("deriv_account_id")?.value;

  if (!accessToken || !accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await callAuthMulti(accessToken, accountId, [
      { balance: 1, account: "current" },        // req_id 1
      { portfolio: 1 },                           // req_id 2
      { statement: 1, limit: 50 },               // req_id 3
      { profit_table: 1, limit: 50, sort: "DESC" }, // req_id 4
    ]);

    const balance = results[1]?.balance as Record<string, unknown>;
    const portfolio = results[2]?.portfolio as Record<string, unknown>;
    const statement = results[3]?.statement as Record<string, unknown>;
    const profitTable = results[4]?.profit_table as Record<string, unknown>;

    const now = Date.now() / 1000;
    const todayStart = now - (now % 86400);
    const trades = (profitTable?.transactions as Array<Record<string, unknown>>) || [];

    const todayTrades = trades.filter((t) => Number(t.purchase_time) >= todayStart);
    const todayPnl = todayTrades.reduce((sum, t) => sum + (Number(t.sell_price) - Number(t.buy_price)), 0);
    const allWins = trades.filter((t) => Number(t.sell_price) > Number(t.buy_price));
    const winRate = trades.length > 0 ? Math.round((allWins.length / trades.length) * 100) : 0;
    const totalPnl = trades.reduce((sum, t) => sum + (Number(t.sell_price) - Number(t.buy_price)), 0);

    const last10 = trades.slice(0, 10).reverse();
    let running = 0;
    const equityCurve = last10.map((t) => {
      running += Number(t.sell_price) - Number(t.buy_price);
      return parseFloat(running.toFixed(2));
    });

    return NextResponse.json({
      balance: { amount: balance?.balance ?? 0, currency: balance?.currency ?? "USD" },
      portfolio: { contracts: portfolio?.contracts ?? [] },
      stats: {
        todayPnl: parseFloat(todayPnl.toFixed(2)),
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        winRate,
        totalTrades: trades.length,
        todayTrades: todayTrades.length,
      },
      recentTrades: trades.slice(0, 8).map((t) => ({
        contract_id: t.contract_id,
        shortcode: t.shortcode,
        buy_price: t.buy_price,
        sell_price: t.sell_price,
        pnl: parseFloat((Number(t.sell_price) - Number(t.buy_price)).toFixed(2)),
        purchase_time: t.purchase_time,
        sell_time: t.sell_time,
      })),
      equityCurve,
      recentStatement: (statement?.transactions as Array<Record<string, unknown>> ?? []).slice(0, 5),
    });
  } catch (err) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
