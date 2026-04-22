import { ENV } from './_core/env';

/**
 * Polygon.io API service for real-time forex prices
 * Uses the POLYGON_API_KEY from environment variables
 *
 * Price source: /v2/snapshot/locale/global/markets/forex/tickers/{ticker}
 *   → returns lastQuote.a (ask) + lastQuote.b (bid); we use the midpoint as the live price.
 *   This is the true real-time price, unlike /prev which returns yesterday's close.
 *
 * Cache: 30-second in-memory TTL per pair to avoid rate-limiting with many signals.
 */

// ── In-memory price cache ─────────────────────────────────────────────────────
interface CacheEntry {
  price: number;
  expiresAt: number; // ms timestamp
}
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// ── Polygon snapshot response types ──────────────────────────────────────────
interface PolygonSnapshotResponse {
  status: string;
  ticker?: {
    lastQuote?: {
      a: number; // ask
      b: number; // bid
      t: number; // timestamp (ms)
    };
    day?: {
      c: number; // today's latest close (fallback)
    };
    prevDay?: {
      c: number; // yesterday's close (last-resort fallback)
    };
  };
  error?: string;
}

/**
 * Convert forex pair format from "EUR/USD" to Polygon format "C:EURUSD"
 */
function formatForexPair(pair: string): string {
  const cleanPair = pair.replace('/', '');
  return `C:${cleanPair}`;
}

/**
 * Get the live mid-price for a single forex pair from Polygon's snapshot endpoint.
 * Falls back through: lastQuote mid → day close → prevDay close → null
 * Results are cached for 30 seconds to avoid rate-limiting.
 */
export async function getForexPrice(pair: string): Promise<number | null> {
  // Check cache first
  const cached = priceCache.get(pair);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.price;
  }

  try {
    const polygonPair = formatForexPair(pair);
    const apiKey = ENV.polygonApiKey;

    if (!apiKey) {
      console.warn('[Polygon] API key not configured');
      return null;
    }

    // Use snapshot endpoint — returns real-time bid/ask, not yesterday's close
    const url = `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers/${polygonPair}?apiKey=${apiKey}`;
    const response = await fetch(url);
    const data: PolygonSnapshotResponse = await response.json();

    if (data.status === 'OK' && data.ticker) {
      const ticker = data.ticker;
      let price: number | null = null;

      // Prefer real-time bid/ask midpoint
      if (ticker.lastQuote && ticker.lastQuote.a && ticker.lastQuote.b) {
        price = (ticker.lastQuote.a + ticker.lastQuote.b) / 2;
      }
      // Fallback: today's latest close candle
      else if (ticker.day?.c) {
        price = ticker.day.c;
      }
      // Last resort: previous day's close
      else if (ticker.prevDay?.c) {
        price = ticker.prevDay.c;
      }

      if (price !== null) {
        // Cache the result
        priceCache.set(pair, { price, expiresAt: Date.now() + CACHE_TTL_MS });
        return price;
      }
    }

    console.warn(`[Polygon] No snapshot price for ${pair}:`, data.error || data.status || 'Unknown error');
    return null;
  } catch (error) {
    console.error(`[Polygon] Error fetching snapshot for ${pair}:`, error);
    return null;
  }
}

/**
 * Get current prices for multiple forex pairs.
 * Fetches in parallel; cached pairs are served instantly.
 */
export async function getForexPrices(pairs: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();

  // Deduplicate pairs before fetching
  const uniquePairs = Array.from(new Set(pairs));

  await Promise.all(
    uniquePairs.map(async (pair) => {
      const price = await getForexPrice(pair);
      if (price !== null) {
        priceMap.set(pair, price);
      }
    })
  );

  return priceMap;
}

/**
 * Calculate P/L for a signal using a live price.
 * Uses 0.01 lot size (micro lot = 1,000 units) for realistic retail P/L display.
 * For most pairs: 1 pip = 0.0001; for JPY pairs: 1 pip = 0.01.
 */
export function calculatePL(
  signal: {
    signalType: string;
    entryPrice: string;
    pair: string;
  },
  currentPrice: number
) {
  const entryPrice = parseFloat(signal.entryPrice);

  // Price difference in the direction of the trade
  const priceDiff = signal.signalType === 'BUY'
    ? currentPrice - entryPrice
    : entryPrice - currentPrice;

  // Pip value
  const pipValue = signal.pair.includes('JPY') ? 0.01 : 0.0001;
  const plPips = priceDiff / pipValue;

  // P/L in USD using 0.01 lot (micro lot: 1,000 units)
  // For most USD-quoted pairs: 1 pip ≈ $0.10 per micro lot
  const plDollars = plPips * 0.10;

  // Percentage move
  const plPercentage = (priceDiff / entryPrice) * 100;

  return {
    plDollars,
    plPips,
    plPercentage,
    currentPrice,
  };
}

/**
 * Determine signal status based on current price vs take-profit / stop-loss.
 */
export function getSignalStatus(
  signal: {
    signalType: string;
    entryPrice: string;
    takeProfit: string;
    stopLoss: string;
  },
  currentPrice: number
): 'target_hit' | 'stop_loss_hit' | 'active' {
  const targetPrice = parseFloat(signal.takeProfit);
  const stopLoss = parseFloat(signal.stopLoss);

  if (signal.signalType === 'BUY') {
    if (currentPrice >= targetPrice) return 'target_hit';
    if (currentPrice <= stopLoss) return 'stop_loss_hit';
  } else {
    if (currentPrice <= targetPrice) return 'target_hit';
    if (currentPrice >= stopLoss) return 'stop_loss_hit';
  }

  return 'active';
}

/**
 * Get 24-hour price history for a forex pair (hourly candles).
 * Returns an array of { t: timestamp_ms, c: close_price } sorted oldest → newest.
 * Falls back to an empty array if the API is unavailable.
 */
export async function getPriceHistory(
  pair: string,
  hours: number = 24
): Promise<Array<{ t: number; c: number }>> {
  try {
    const polygonPair = formatForexPair(pair);
    const apiKey = ENV.polygonApiKey;

    if (!apiKey) {
      console.warn('[Polygon] API key not configured — skipping price history');
      return [];
    }

    const to = new Date();
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000);

    const toStr = to.toISOString().split('T')[0];
    const fromStr = from.toISOString().split('T')[0];

    const url =
      `https://api.polygon.io/v2/aggs/ticker/${polygonPair}/range/1/hour/${fromStr}/${toStr}` +
      `?adjusted=true&sort=asc&limit=50&apiKey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json() as {
      status: string;
      results?: Array<{ t: number; c: number }>;
    };

    if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      return data.results.map((r) => ({ t: r.t, c: r.c }));
    }

    console.warn(`[Polygon] No history data for ${pair}:`, (data as any).error || data.status);
    return [];
  } catch (error) {
    console.error(`[Polygon] Error fetching price history for ${pair}:`, error);
    return [];
  }
}
