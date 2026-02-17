export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const SYMBOLS = [
  "AAPL",
  "NVDA",
  "TSLA",
  "MSFT",
  "SPY",
  "QQQ",
  "BINANCE:BTCUSDT",
  "BINANCE:ETHUSDT",
  "OANDA:EUR_USD",
];

export async function GET() {
  try {
    const key = process.env.FINNHUB_API_KEY;
    const base = process.env.FINNHUB_BASE_URL;

    const results = await Promise.all(
      SYMBOLS.map(async (symbol) => {
        const r = await fetch(`${base}/quote?symbol=${symbol}&token=${key}`, {
          cache: "no-store",
        });
        const j = await r.json();

        return {
          symbol: symbol.replace("BINANCE:", "").replace("OANDA:", ""),
          percent: j.dp ?? 0,
        };
      })
    );

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
