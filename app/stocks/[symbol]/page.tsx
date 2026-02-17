import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import {
  SYMBOL_INFO_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

interface StockDetailsProps {
  params: Promise<{ symbol: string }>;
}

export default async function StockDetails({ params }: StockDetailsProps) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  const base =
    "https://s3.tradingview.com/external-embedding/embed-widget-";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          {upperSymbol}
        </h1>

        {/* FIXED — only pass symbol */}
        <WatchlistButton symbol={upperSymbol} />
      </div>

      <TradingViewWidget
        scriptUrl={`${base}symbol-info.js`}
        config={SYMBOL_INFO_WIDGET_CONFIG(upperSymbol)}
        height={170}
      />

      <TradingViewWidget
        title="Price Chart"
        scriptUrl={`${base}advanced-chart.js`}
        config={CANDLE_CHART_WIDGET_CONFIG(upperSymbol)}
        height={600}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <TradingViewWidget
          title="Technical Analysis"
          scriptUrl={`${base}technical-analysis.js`}
          config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(upperSymbol)}
        />

        <TradingViewWidget
          title="Company Profile"
          scriptUrl={`${base}company-profile.js`}
          config={COMPANY_PROFILE_WIDGET_CONFIG(upperSymbol)}
        />
      </div>

      <TradingViewWidget
        title="Financials"
        scriptUrl={`${base}financials.js`}
        config={COMPANY_FINANCIALS_WIDGET_CONFIG(upperSymbol)}
      />
    </div>
  );
}
