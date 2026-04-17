import { ENV } from './_core/env';
import { callDataApi } from './_core/dataApi';

/**
 * Polygon.io API service for real-time forex prices
 * Uses the POLYGON_API_KEY from environment variables
 */

interface PolygonTickerResponse {
  status: string;
  results?: {
    c: number; // Close price
    h: number; // High price
    l: number; // Low price
    o: number; // Open price
    v: number; // Volume
    t: number; // Timestamp
  };
  error?: string;
}

/**
 * Convert forex pair format from "EUR/USD" to Polygon format "C:EURUSD"
 */
function formatForexPair(pair: string): string {
  // Remove slash and add C: prefix for Polygon forex format
  const cleanPair = pair.replace('/', '');
  return `C:${cleanPair}`;
}

/**
 * Get current forex price from Polygon API
 * @param pair - Forex pair in format "EUR/USD"
 * @returns Current price or null if unavailable
 */
export async function getForexPrice(pair: string): Promise<number | null> {
  try {
    const polygonPair = formatForexPair(pair);
    const apiKey = ENV.polygonApiKey;
    
    if (!apiKey) {
      console.warn('[Polygon] API key not configured');
      return null;
    }

    // Get previous day's close price (most reliable for forex)
    const url = `https://api.polygon.io/v2/aggs/ticker/${polygonPair}/prev?apiKey=${apiKey}`;
    
    const response = await fetch(url);
    const data: PolygonTickerResponse = await response.json();

    if (data.status === 'OK' && data.results) {
      return data.results.c; // Return close price
    }

    console.warn(`[Polygon] No price data for ${pair}:`, data.error || 'Unknown error');
    return null;
  } catch (error) {
    console.error(`[Polygon] Error fetching price for ${pair}:`, error);
    return null;
  }
}

/**
 * Get current prices for multiple forex pairs
 * @param pairs - Array of forex pairs in format ["EUR/USD", "GBP/USD"]
 * @returns Map of pair to current price
 */
export async function getForexPrices(pairs: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  
  // Fetch prices in parallel
  const promises = pairs.map(async (pair) => {
    const price = await getForexPrice(pair);
    if (price !== null) {
      priceMap.set(pair, price);
    }
  });

  await Promise.all(promises);
  return priceMap;
}

/**
 * Calculate P/L for a signal using real-time price
 * @param signal - Signal data with entry price and type
 * @param currentPrice - Current market price
 * @returns P/L in dollars, pips, and percentage
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
  
  // Calculate price difference based on signal type
  const priceDiff = signal.signalType === "BUY" 
    ? currentPrice - entryPrice
    : entryPrice - currentPrice;
  
  // Calculate P/L metrics
  // Standard lot size = 100,000 units, but we'll use 10,000 for more realistic retail trading
  const plDollars = priceDiff * 10000;
  
  // Convert to pips (for most pairs, 1 pip = 0.0001)
  const pipValue = signal.pair.includes('JPY') ? 0.01 : 0.0001;
  const plPips = priceDiff / pipValue;
  
  // Calculate percentage
  const plPercentage = (priceDiff / entryPrice) * 100;

  return {
    plDollars,
    plPips,
    plPercentage,
    currentPrice,
  };
}


/**
 * Determine signal status based on current price vs target/stop loss
 * @param signal - Signal data
 * @param currentPrice - Current market price
 * @returns Signal status: target_hit, stop_loss_hit, or active
 */
export function getSignalStatus(
  signal: {
    signalType: string;
    entryPrice: string;
    takeProfit: string;
    stopLoss: string;
  },
  currentPrice: number
): "target_hit" | "stop_loss_hit" | "active" {
  const entryPrice = parseFloat(signal.entryPrice);
  const targetPrice = parseFloat(signal.takeProfit);
  const stopLoss = parseFloat(signal.stopLoss);

  if (signal.signalType === "BUY") {
    // For BUY signals: target is above entry, stop loss is below
    if (currentPrice >= targetPrice) {
      return "target_hit";
    } else if (currentPrice <= stopLoss) {
      return "stop_loss_hit";
    }
  } else {
    // For SELL signals: target is below entry, stop loss is above
    if (currentPrice <= targetPrice) {
      return "target_hit";
    } else if (currentPrice >= stopLoss) {
      return "stop_loss_hit";
    }
  }

  return "active";
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

    // Use Polygon aggregates endpoint: 1-hour candles for the last `hours` hours
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

    // Polygon free tier may return 'DELAYED' or empty results on weekends/holidays
    console.warn(`[Polygon] No history data for ${pair}:`, (data as any).error || data.status);
    return [];
  } catch (error) {
    console.error(`[Polygon] Error fetching price history for ${pair}:`, error);
    return [];
  }
}
