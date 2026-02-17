"use client";

import { useEffect, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { getWatchlist } from "@/lib/watchlist";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import { useDebounce } from "@/hooks/useDebounce";
import WatchlistButton from "@/components/WatchlistButton";

const US_EXCHANGES = ["NYSE", "NASDAQ", "NYSE ARCA"];

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
];

export default function SearchCommand() {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stocks, setStocks] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  const isSearchMode = searchTerm.trim().length > 0;

  /* auth */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      const list = await getWatchlist(u.uid);
      setWatchlist(list);
    });
  }, []);

  /* search */
  const runSearch = async () => {
    if (!isSearchMode) return;

    setLoading(true);
    try {
      const results = await searchStocks(searchTerm.trim());
      setStocks(results || []);
      setActiveIndex(0);
    } finally {
      setLoading(false);
    }
  };

  const debounced = useDebounce(runSearch, 300);

  useEffect(() => {
    debounced();
  }, [searchTerm]);

  /* sort US first */
  const sortedStocks = [...stocks].sort((a, b) => {
    const aUS = US_EXCHANGES.includes(a.exchange);
    const bUS = US_EXCHANGES.includes(b.exchange);
    return Number(bUS) - Number(aUS);
  });

  const displayStocks = isSearchMode
    ? sortedStocks
    : [
        ...sortedStocks.filter((s) => watchlist.includes(s.symbol)),
        ...POPULAR_STOCKS.filter((p) => !watchlist.includes(p.symbol)),
      ].slice(0, 10);

  /* ⌘K focus */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>(
            '[cmdk-input]'
          );
          input?.focus();
        }, 10);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* click outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* keyboard nav */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!displayStocks.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % displayStocks.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        i === 0 ? displayStocks.length - 1 : i - 1
      );
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const stock = displayStocks[activeIndex];
      router.push(`/stocks/${stock.symbol}`);
      setOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-[520px]">
      <Command className="rounded-md border bg-muted">
        <CommandInput
          value={searchTerm}
          onValueChange={(v) => {
            setSearchTerm(v);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search stocks...   ⌘K"
          className="h-11"
        />

        {open && (
          <div className="absolute left-0 top-12 z-50 w-full rounded-md border bg-background shadow-lg">
            <CommandList>
              {loading && (
                <CommandEmpty className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </CommandEmpty>
              )}

              {!loading &&
                displayStocks.map((stock, index) => {
                  const active = index === activeIndex;

                  return (
                    <div
                      key={stock.symbol}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        active ? "bg-muted" : "hover:bg-muted"
                      }`}
                    >
                      <Link
                        href={`/stocks/${stock.symbol}`}
                        onClick={() => setOpen(false)}
                        className="flex flex-1 items-center gap-3"
                      >
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{stock.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {stock.symbol} · {stock.exchange}
                          </div>
                        </div>
                      </Link>

                      {user && <WatchlistButton symbol={stock.symbol} />}
                    </div>
                  );
                })}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
