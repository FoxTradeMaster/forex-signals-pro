/**
 * Profit/Loss Calculator for Trading Signals
 * 
 * Fetches real-time prices from Polygon API and calculates:
 * - Pip P/L
 * - Dollar P/L
 * - Percentage P/L
 * - Status (in profit, in loss, hit TP, hit SL)
 */

import axios from "axios";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || "";
const POLYGON_BASE_URL = "https://api.polygon.io";

interface PriceData {
  pair: string;
  currentPrice: number;
  timestamp: number;
}

interface PLCalculation {
  currentPrice: number;
  pips: number;
  dollarPL: number;
  percentagePL: number;
  status: "in_profit" | "in_loss" | "hit_tp" | "hit_sl" | "market_closed";
}

/**
 * Fetch current price for a forex pair from Polygon API
 */
export async function getCurrentPrice(pair: string): Promise<number | null> {
  try {
    // Convert pair format: EUR/USD -> C:EURUSD
    const symbol = `C:${pair.replace("/", "")}`;
    
    const response = await axios.get(
      `${POLYGON_BASE_URL}/v2/last/nbbo/${symbol}`,
      {
        params: {
          apiKey: POLYGON_API_KEY,
        },
      }
    );

    if (response.data && response.data.results) {
      // Use mid price (average of bid and ask)
      const bid = response.data.results.P || 0;
      const ask = response.data.results.p || 0;
      const midPrice = (bid + ask) / 2;
      return midPrice;
    }

    return null;
  } catch (error) {
    console.error(`[PL Calculator] Failed to fetch price for ${pair}:`, error);
    return null;
  }
}

/**
 * Calculate pip value for a forex pair
 * Most pairs: 0.0001 (4 decimal places)
 * JPY pairs: 0.01 (2 decimal places)
 */
function getPipValue(pair: string): number {
  return pair.includes("JPY") ? 0.01 : 0.0001;
}

/**
 * Calculate P/L for a trading signal
 */
export async function calculatePL(
  pair: string,
  signalType: "BUY" | "SELL",
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): Promise<PLCalculation> {
  const currentPrice = await getCurrentPrice(pair);

  if (!currentPrice) {
    return {
      currentPrice: 0,
      pips: 0,
      dollarPL: 0,
      percentagePL: 0,
      status: "market_closed",
    };
  }

  const pipValue = getPipValue(pair);
  let pips = 0;
  let status: PLCalculation["status"] = "in_loss";

  // Calculate pips based on signal type
  if (signalType === "BUY") {
    pips = (currentPrice - entryPrice) / pipValue;
    
    // Check if hit take profit or stop loss
    if (currentPrice >= takeProfit) {
      status = "hit_tp";
      pips = (takeProfit - entryPrice) / pipValue;
    } else if (currentPrice <= stopLoss) {
      status = "hit_sl";
      pips = (stopLoss - entryPrice) / pipValue;
    } else if (currentPrice > entryPrice) {
      status = "in_profit";
    }
  } else {
    // SELL signal
    pips = (entryPrice - currentPrice) / pipValue;
    
    // Check if hit take profit or stop loss
    if (currentPrice <= takeProfit) {
      status = "hit_tp";
      pips = (entryPrice - takeProfit) / pipValue;
    } else if (currentPrice >= stopLoss) {
      status = "hit_sl";
      pips = (entryPrice - stopLoss) / pipValue;
    } else if (currentPrice < entryPrice) {
      status = "in_profit";
    }
  }

  // Calculate dollar P/L (assuming standard lot size of 100,000 units)
  // 1 pip = $10 for standard lot
  const dollarPL = pips * 10;

  // Calculate percentage P/L
  const percentagePL = ((currentPrice - entryPrice) / entryPrice) * 100;

  return {
    currentPrice,
    pips: Math.round(pips * 10) / 10, // Round to 1 decimal
    dollarPL: Math.round(dollarPL * 100) / 100, // Round to 2 decimals
    percentagePL: Math.round(percentagePL * 100) / 100,
    status,
  };
}

/**
 * Batch calculate P/L for multiple signals
 */
export async function batchCalculatePL(
  signals: Array<{
    id: string;
    pair: string;
    signalType: "BUY" | "SELL";
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
  }>
): Promise<Map<string, PLCalculation>> {
  const results = new Map<string, PLCalculation>();

  // Process signals in parallel (with rate limiting consideration)
  const promises = signals.map(async (signal) => {
    const pl = await calculatePL(
      signal.pair,
      signal.signalType,
      signal.entryPrice,
      signal.stopLoss,
      signal.takeProfit
    );
    results.set(signal.id, pl);
  });

  await Promise.all(promises);
  return results;
}
