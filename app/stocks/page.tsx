import WelcomeHeader from "@/components/WelcomeHeader";
import WatchlistSection from "@/components/WatchlistSection";
import TradingViewWidget from "@/components/TradingViewWidget";
import {
  MARKET_OVERVIEW_WIDGET_CONFIG,
  HEATMAP_WIDGET_CONFIG,
  TOP_STORIES_WIDGET_CONFIG,
} from "@/lib/constants";

const TRADING_VIEW_SCRIPTS = {
  marketOverview:
    "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
  heatmap:
    "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js",
  timeline:
    "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js",
} as const;

export default function StocksPage() {
  return (
    <div className="min-h-screen bg-background">

      <main className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6">
        <WelcomeHeader title="Stock Panel" />
        <WatchlistSection />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TradingViewWidget
            title="Market Overview"
            scriptUrl={TRADING_VIEW_SCRIPTS.marketOverview}
            config={MARKET_OVERVIEW_WIDGET_CONFIG}
            height={560}
          />

          <TradingViewWidget
            title="Market Heatmap"
            scriptUrl={TRADING_VIEW_SCRIPTS.heatmap}
            config={HEATMAP_WIDGET_CONFIG}
            height={560}
          />
        </div>

        <TradingViewWidget
          title="Top Stories"
          scriptUrl={TRADING_VIEW_SCRIPTS.timeline}
          config={TOP_STORIES_WIDGET_CONFIG}
          height={520}
        />
      </main>
    </div>
  );
}
