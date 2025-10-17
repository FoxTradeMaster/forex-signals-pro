/**
 * Forex Data Service
 * Fetches real-time and historical forex data from Yahoo Finance API
 */

import { callDataApi } from "./_core/dataApi";

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
 * Supported forex pairs with Yahoo Finance symbols
 */
export const FOREX_PAIRS = {
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "USDJPY=X",
  "USD/CNY": "USDCNY=X",
  "EUR/JPY": "EURJPY=X",
  "EUR/GBP": "EURGBP=X",
  "GBP/JPY": "GBPJPY=X",
  "EUR/CNY": "EURCNY=X",
  "GBP/CNY": "GBPCNY=X",
  "JPY/CNY": "JPYCNY=X",
} as const;

export type ForexPairName = keyof typeof FOREX_PAIRS;

/**
 * Fetch forex data for a specific pair
 */
export async function fetchForexData(
  pair: ForexPairName,
  interval: "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" = "5d"
): Promise<ForexPairData | null> {
  try {
    const symbol = FOREX_PAIRS[pair];

    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol,
        region: "US",
        interval,
        range,
      },
    }) as any;

    if (!response?.chart?.result?.[0]) {
      console.error(`No data returned for ${pair}`);
      return null;
    }

    const result = response.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    // Filter out null values and ensure data integrity
    const validIndices: number[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        quotes.open[i] !== null &&
        quotes.high[i] !== null &&
        quotes.low[i] !== null &&
        quotes.close[i] !== null
      ) {
        validIndices.push(i);
      }
    }

    const ohlc: OHLCData = {
      timestamps: validIndices.map(i => timestamps[i]),
      open: validIndices.map(i => quotes.open[i]),
      high: validIndices.map(i => quotes.high[i]),
      low: validIndices.map(i => quotes.low[i]),
      close: validIndices.map(i => quotes.close[i]),
      volume: validIndices.map(i => quotes.volume?.[i] || 0),
    };

    return {
      pair,
      currentPrice: meta.regularMarketPrice,
      ohlc,
      lastUpdate: new Date(),
    };
  } catch (error) {
    console.error(`Error fetching forex data for ${pair}:`, error);
    return null;
  }
}

/**
 * Fetch data for multiple forex pairs
 */
export async function fetchMultipleForexData(
  pairs: ForexPairName[],
  interval: "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" = "5d"
): Promise<ForexPairData[]> {
  const results = await Promise.all(
    pairs.map(pair => fetchForexData(pair, interval, range))
  );

  return results.filter((data): data is ForexPairData => data !== null);
}

/**
 * Fetch all supported forex pairs
 */
export async function fetchAllForexData(
  interval: "15m" | "1h" | "1d" = "1h",
  range: "1d" | "5d" | "1mo" = "5d"
): Promise<ForexPairData[]> {
  const allPairs = Object.keys(FOREX_PAIRS) as ForexPairName[];
  return fetchMultipleForexData(allPairs, interval, range);
}

