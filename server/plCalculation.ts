/**
 * P/L Calculation Logic for Forex Signals
 * Calculates profit/loss in dollars, pips, and percentage
 */

interface PLCalculationInput {
  signalType: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
}

interface PLCalculationResult {
  plDollars: number;
  plPips: number;
  plPercentage: number;
  currentPrice: number;
}

/**
 * Calculate pip value for a currency pair
 * Standard lot size: 100,000 units
 * For most pairs, 1 pip = 0.0001
 * For JPY pairs, 1 pip = 0.01
 */
function calculatePipValue(pair: string): number {
  // JPY pairs have different pip values
  if (pair.includes("JPY")) {
    return 0.01;
  }
  return 0.0001;
}

/**
 * Calculate P/L for a signal
 */
export function calculatePL(
  pair: string,
  input: PLCalculationInput
): PLCalculationResult {
  const { signalType, entryPrice, currentPrice, stopLoss, takeProfit } = input;
  const pipValue = calculatePipValue(pair);

  // Calculate price difference
  let priceDiff = 0;
  if (signalType === "BUY") {
    priceDiff = currentPrice - entryPrice;
  } else {
    // SELL
    priceDiff = entryPrice - currentPrice;
  }

  // Calculate pips
  const plPips = priceDiff / pipValue;

  // Calculate percentage (relative to entry price)
  const plPercentage = (priceDiff / entryPrice) * 100;

  // Calculate dollar P/L (assuming standard lot size of 100,000 units)
  // For simplicity, we'll use a fixed conversion rate
  // In production, you'd want to use actual lot sizes and account currency
  const plDollars = plPips * 10; // $10 per pip for standard lot

  return {
    plDollars: parseFloat(plDollars.toFixed(2)),
    plPips: parseFloat(plPips.toFixed(1)),
    plPercentage: parseFloat(plPercentage.toFixed(2)),
    currentPrice: parseFloat(currentPrice.toFixed(5)),
  };
}

/**
 * Fetch current price from Polygon API
 */
export async function getCurrentPrice(pair: string): Promise<number | null> {
  try {
    // Convert EUR/USD to C:EURUSD format for Polygon
    const symbol = `C:${pair.replace("/", "")}`;
    
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      console.error("[P/L] POLYGON_API_KEY not found");
      return null;
    }

    const url = `https://api.polygon.io/v2/last/nbbo/${symbol}?apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[P/L] Polygon API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status === "OK" && data.results) {
      // Use mid price (average of bid and ask)
      const bid = data.results.P || 0;
      const ask = data.results.p || 0;
      const midPrice = (bid + ask) / 2;
      return midPrice;
    }

    return null;
  } catch (error) {
    console.error("[P/L] Error fetching current price:", error);
    return null;
  }
}
