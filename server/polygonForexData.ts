/**
 * Polygon.io Forex Data Service
 * Fetches real-time and historical forex data from Polygon.io API
 * Supports all 156 currency pairs (28 major + 38 minor + 90 exotic)
 */

import axios from "axios";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "";
const POLYGON_BASE_URL = "https://api.polygon.io";

export interface OHLCData {
  timestamps: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface ForexPairData {
  pair: string;
  currentPrice: number;
  ohlc: OHLCData;
  lastUpdate: Date;
}

/**
 * Convert currency pair format from "EUR/USD" to Polygon format "C:EURUSD"
 */
function formatPairForPolygon(pair: string): string {
  const cleaned = pair.replace("/", "");
  return `C:${cleaned}`;
}

/**
 * Fetch current forex quote from Polygon.io
 */
export async function fetchPolygonQuote(pair: string): Promise<number | null> {
  try {
    const ticker = formatPairForPolygon(pair);
    const url = `${POLYGON_BASE_URL}/v2/last/nbbo/${ticker}`;
    
    const response = await axios.get(url, {
      params: {
        apiKey: POLYGON_API_KEY,
      },
    });

    if (response.data && response.data.results) {
      // Use mid-price between bid and ask
      const { bid, ask } = response.data.results;
      return (bid + ask) / 2;
    }

    return null;
  } catch (error) {
    console.error(`[Polygon] Error fetching quote for ${pair}:`, error);
    return null;
  }
}

/**
 * Fetch historical OHLC data from Polygon.io
 */
export async function fetchPolygonOHLC(
  pair: string,
  timespan: "minute" | "hour" | "day" | "minute5" = "hour",
  from: string, // YYYY-MM-DD
  to: string    // YYYY-MM-DD
): Promise<OHLCData | null> {
  try {
    const ticker = formatPairForPolygon(pair);
    // "minute5" is a convenience alias for 5-minute candles (multiplier=5, timespan=minute)
    const multiplier = timespan === "minute5" ? 5 : 1;
    const actualTimespan = timespan === "minute5" ? "minute" : timespan;
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/${multiplier}/${actualTimespan}/${from}/${to}`;
    
    const response = await axios.get(url, {
      params: {
        apiKey: POLYGON_API_KEY,
        adjusted: true,
        sort: "asc",
        limit: 50000, // real-time plan supports up to 50,000 results per request
      },
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      const results = response.data.results;
      
      return {
        timestamps: results.map((r: any) => r.t),
        open: results.map((r: any) => r.o),
        high: results.map((r: any) => r.h),
        low: results.map((r: any) => r.l),
        close: results.map((r: any) => r.c),
        volume: results.map((r: any) => r.v || 0),
      };
    }

    return null;
  } catch (error) {
    console.error(`[Polygon] Error fetching OHLC for ${pair}:`, error);
    return null;
  }
}

/**
 * Fetch complete forex data for a specific pair
 */
export async function fetchPolygonForexData(
  pair: string,
  timespan: "minute" | "hour" | "day" = "hour",
  daysBack: number = 5
): Promise<ForexPairData | null> {
  try {
    // Calculate date range
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - daysBack);

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    // Fetch OHLC data
    const ohlc = await fetchPolygonOHLC(pair, timespan, fromStr, toStr);
    
    if (!ohlc || ohlc.close.length === 0) {
      console.warn(`[Polygon] No OHLC data for ${pair}`);
      return null;
    }

    // Get current price (last close or fetch real-time quote)
    let currentPrice = ohlc.close[ohlc.close.length - 1];
    
    // Try to get real-time quote
    const quote = await fetchPolygonQuote(pair);
    if (quote) {
      currentPrice = quote;
    }

    return {
      pair,
      currentPrice,
      ohlc,
      lastUpdate: new Date(),
    };
  } catch (error) {
    console.error(`[Polygon] Error fetching forex data for ${pair}:`, error);
    return null;
  }
}

/**
 * Fetch multiple forex pairs in parallel
 */
export async function fetchMultipleForexData(
  pairs: string[],
  timespan: "minute" | "hour" | "day" = "hour",
  daysBack: number = 5
): Promise<Map<string, ForexPairData>> {
  const results = new Map<string, ForexPairData>();

  // Fetch all pairs in parallel
  const promises = pairs.map(pair => fetchPolygonForexData(pair, timespan, daysBack));
  const data = await Promise.all(promises);

  // Store successful results
  data.forEach((pairData, index) => {
    if (pairData) {
      results.set(pairs[index], pairData);
    }
  });

  return results;
}

/**
 * Check if Polygon.io API is configured
 */
export function isPolygonConfigured(): boolean {
  return !!POLYGON_API_KEY && POLYGON_API_KEY.length > 0;
}
