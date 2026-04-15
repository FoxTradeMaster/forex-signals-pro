/**
 * Unified Forex Data Service - Polygon.io (Currencies Starter Plan)
 * Real-time data, unlimited API calls, 10+ years history
 * 5-day hourly range returns 95+ candles — well above the 60-candle minimum
 */

import { fetchPolygonForexData, fetchMultipleForexData, isPolygonConfigured } from "./polygonForexData";
import { FREE_PAIRS, PREMIUM_PAIRS, PRO_PAIRS, CurrencyPair } from "./currencyPairs";

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
 * Get all currency pairs for a specific tier
 */
export function getPairsForTier(tier: 'free' | 'premium' | 'pro'): CurrencyPair[] {
  switch (tier) {
    case 'free':    return FREE_PAIRS;
    case 'premium': return PREMIUM_PAIRS;
    case 'pro':     return PRO_PAIRS;
    default:        return FREE_PAIRS;
  }
}

/**
 * Get all available pair symbols for a tier
 */
export function getPairSymbolsForTier(tier: 'free' | 'premium' | 'pro'): string[] {
  return getPairsForTier(tier).map(p => p.symbol);
}

/**
 * Convert interval + range to Polygon parameters
 * Always uses at least 5 days to ensure 60+ candles for the signal engine
 */
function toPolygonParams(
  interval: "15m" | "1h" | "1d",
  range: "1d" | "5d" | "1mo"
): { timespan: "minute" | "hour" | "day"; daysBack: number } {
  const timespan: "minute" | "hour" | "day" =
    interval === "15m" ? "minute" :
    interval === "1d"  ? "day"    : "hour";

  // Always fetch at least 5 days to guarantee 60+ hourly candles
  let daysBack = 5;
  if (range === "1mo") daysBack = 30;
  // "1d" and "5d" both use 5 days minimum

  return { timespan, daysBack };
}

/**
 * Fetch forex data for a specific pair using Polygon.io
 */
export async function fetchForexData(
  pair: string,
  interval: "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" = "5d"
): Promise<ForexPairData | null> {
  if (!isPolygonConfigured()) {
    console.error("[Forex] Polygon.io API key not configured");
    return null;
  }

  const { timespan, daysBack } = toPolygonParams(interval, range);

  try {
    return await fetchPolygonForexData(pair, timespan, daysBack);
  } catch (error) {
    console.error(`[Forex] Error fetching data for ${pair}:`, error);
    return null;
  }
}

/**
 * Fetch multiple forex pairs
 */
export async function fetchMultipleForexDataWrapper(
  pairs: string[],
  interval: "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" = "5d"
): Promise<ForexPairData[]> {
  if (!isPolygonConfigured()) {
    console.error("[Forex] Polygon.io API key not configured");
    return [];
  }

  const { timespan, daysBack } = toPolygonParams(interval, range);

  try {
    const dataMap = await fetchMultipleForexData(pairs, timespan, daysBack);
    return Array.from(dataMap.values());
  } catch (error) {
    console.error("[Forex] Error fetching multiple pairs:", error);
    return [];
  }
}

/**
 * Fetch all forex pairs for a specific tier
 */
export async function fetchAllForexData(
  tier: 'free' | 'premium' | 'pro' = 'pro',
  interval: "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" = "5d"
): Promise<ForexPairData[]> {
  const pairs = getPairSymbolsForTier(tier);
  return fetchMultipleForexDataWrapper(pairs, interval, range);
}

/**
 * Fetch tier-specific forex data based on user subscription
 */
export async function fetchForexDataForUser(
  userTier: 'free' | 'premium' | 'pro',
  interval: "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" = "5d"
): Promise<ForexPairData[]> {
  return fetchAllForexData(userTier, interval, range);
}

/**
 * Check if a pair is available for a specific tier
 */
export function isPairAvailableForTier(pair: string, tier: 'free' | 'premium' | 'pro'): boolean {
  return getPairSymbolsForTier(tier).includes(pair);
}

/**
 * Get pair category (major/minor/exotic)
 */
export function getPairCategory(pair: string): 'major' | 'minor' | 'exotic' | null {
  const found = PRO_PAIRS.find(p => p.symbol === pair);
  return found ? found.category : null;
}

/**
 * Filter pairs by category
 */
export function filterPairsByCategory(
  tier: 'free' | 'premium' | 'pro',
  category: 'major' | 'minor' | 'exotic'
): CurrencyPair[] {
  return getPairsForTier(tier).filter(p => p.category === category);
}

/**
 * Search pairs by symbol or name
 */
export function searchPairs(
  query: string,
  tier: 'free' | 'premium' | 'pro' = 'pro'
): CurrencyPair[] {
  const lowerQuery = query.toLowerCase();
  return getPairsForTier(tier).filter(p =>
    p.symbol.toLowerCase().includes(lowerQuery) ||
    p.name.toLowerCase().includes(lowerQuery)
  );
}
