/**
 * FOX TRADE MASTER™ - AI-Enhanced Signal Engine
 * 
 * Integrates the AI brain with technical analysis to produce
 * intelligent, self-improving trading signals with full reasoning.
 */

import { fetchPolygonOHLC } from "./polygonForexData";
import { getForexPrice } from "./polygonService";
import { 
  analyzeWithAI, 
  getStrategyWeights, 
  saveAiLearningRecord,
  generateMarketContext,
  type MarketSnapshot,
  type AISignalDecision
} from "./aiBrain";
import { getDb } from "./db";
import { aiLearningData, aiMarketContext, signals } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ============================================================
// TECHNICAL INDICATOR CALCULATIONS
// ============================================================

function calcEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  for (let i = 0; i < data.length; i++) {
    ema = i === 0 ? data[0] : (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

function calcSMA(data: number[], period: number): number[] {
  return data.map((_, i) => {
    if (i < period - 1) return NaN;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function calcRSI(close: number[], period = 14): number {
  if (close.length < period + 1) return 50;
  const changes = close.slice(-period - 1).map((v, i, arr) => i === 0 ? 0 : v - arr[i - 1]).slice(1);
  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(close: number[]) {
  const ema12 = calcEMA(close, 12);
  const ema26 = calcEMA(close, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  const idx = close.length - 1;
  return {
    macd: macdLine[idx],
    signal: signalLine[idx],
    histogram: histogram[idx],
  };
}

function calcBollingerBands(close: number[], period = 20, stdDev = 2) {
  const sma = calcSMA(close, period);
  const idx = close.length - 1;
  if (isNaN(sma[idx])) return { upper: NaN, middle: NaN, lower: NaN };
  const slice = close.slice(idx - period + 1, idx + 1);
  const mean = sma[idx];
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: mean + stdDev * std,
    middle: mean,
    lower: mean - stdDev * std,
  };
}

function calcATR(high: number[], low: number[], close: number[], period = 14): number {
  if (high.length < period + 1) return 0.001;
  const trs = high.slice(-period - 1).map((h, i, arr) => {
    if (i === 0) return h - low[high.length - period - 1 + i];
    const prevClose = close[high.length - period - 1 + i - 1];
    return Math.max(h - low[high.length - period - 1 + i], Math.abs(h - prevClose), Math.abs(low[high.length - period - 1 + i] - prevClose));
  }).slice(1);
  return trs.reduce((a, b) => a + b, 0) / period;
}

// ============================================================
// AI SIGNAL GENERATION
// ============================================================

export interface AIEnhancedSignal {
  id: string;
  pair: string;
  signalType: "BUY" | "SELL";
  strategy: string;
  strength: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  // AI-specific fields
  aiConfidence: number;
  aiReasoning: string;
  aiKeyFactors: string[];
  aiRiskAssessment: string;
  aiInsight: string;
  marketSummary: string;
  // Technical data
  indicators: Record<string, number>;
  timestamp: Date;
  isActive: boolean;
}

/**
 * Generate an AI-enhanced signal for a currency pair
 * Combines technical analysis with LLM reasoning
 */
export async function generateAISignal(pair: string): Promise<AIEnhancedSignal | null> {
  try {
    // Step 1: Fetch real market data from Polygon
    const currentPrice = await getForexPrice(pair);
    if (!currentPrice) {
      console.warn(`[AI Signal] No price data for ${pair}`);
      return null;
    }

    // Step 2: Fetch OHLC data for technical analysis
    const today = new Date();
    const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString().split("T")[0];
    const to = today.toISOString().split("T")[0];

    const ohlc = await fetchPolygonOHLC(pair, "hour", from, to);
    
    if (!ohlc || ohlc.close.length < 30) {
      console.warn(`[AI Signal] Insufficient OHLC data for ${pair}`);
      return null;
    }

    const { close, high, low } = ohlc;

    // Step 3: Calculate technical indicators
    const rsi = calcRSI(close);
    const { macd, signal: macdSignal, histogram: macdHistogram } = calcMACD(close);
    const sma50Values = calcSMA(close, Math.min(50, close.length - 1));
    const sma50 = sma50Values[sma50Values.length - 1] || currentPrice;
    const bb = calcBollingerBands(close);
    const atr = calcATR(high, low, close);
    const high24h = Math.max(...high.slice(-24));
    const low24h = Math.min(...low.slice(-24));
    const priceChange24h = close.length >= 24 ? currentPrice - close[close.length - 25] : 0;

    // Step 4: Build market snapshot
    const snapshot: MarketSnapshot = {
      pair,
      currentPrice,
      rsi,
      macd,
      macdSignal,
      macdHistogram,
      sma50,
      bbUpper: bb.upper,
      bbMiddle: bb.middle,
      bbLower: bb.lower,
      atr,
      high24h,
      low24h,
      priceChange24h,
    };

    // Step 5: Get learned strategy weights
    const weights = await getStrategyWeights(pair, "swing", "1h");

    // Step 6: Get recent history for context
    const db = await getDb();
    let recentHistory: Array<{ outcome: string; plPips: string | null; strategy: string }> = [];
    if (db) {
      try {
        const history = await db
          .select({
            outcome: aiLearningData.outcome,
            plPips: aiLearningData.plPips,
            strategy: aiLearningData.strategy,
          })
          .from(aiLearningData)
          .where(
            and(
              eq(aiLearningData.pair, pair),
              sql`${aiLearningData.outcome} IS NOT NULL`
            )
          )
          .orderBy(desc(aiLearningData.resolvedAt))
          .limit(10);
        recentHistory = history.map(h => ({
          outcome: h.outcome || "",
          plPips: h.plPips,
          strategy: h.strategy,
        }));
      } catch (e) { /* non-critical */ }
    }

    // Step 7: AI analysis
    const decision: AISignalDecision = await analyzeWithAI(snapshot, weights, recentHistory);

    if (!decision.shouldGenerate || decision.signalType === "HOLD") {
      return null;
    }

    // Step 8: Generate market context summary
    const marketSummary = await generateMarketContext(pair, snapshot);

    // Step 9: Build the enhanced signal
    const signalId = `ai_${pair.replace("/", "")}_${Date.now()}`;
    const enhancedSignal: AIEnhancedSignal = {
      id: signalId,
      pair,
      signalType: decision.signalType as "BUY" | "SELL",
      strategy: decision.strategy,
      strength: decision.strength,
      entryPrice: decision.entryPrice,
      stopLoss: decision.stopLoss,
      takeProfit: decision.takeProfit,
      timeframe: decision.timeframe,
      aiConfidence: decision.confidence,
      aiReasoning: decision.reasoning,
      aiKeyFactors: decision.keyFactors,
      aiRiskAssessment: decision.riskAssessment,
      aiInsight: decision.aiInsight,
      marketSummary,
      indicators: {
        rsi: parseFloat(rsi.toFixed(2)),
        macd: parseFloat(macd.toFixed(5)),
        macdSignal: parseFloat(macdSignal.toFixed(5)),
        macdHistogram: parseFloat(macdHistogram.toFixed(5)),
        sma50: parseFloat(sma50.toFixed(5)),
        bbUpper: parseFloat(bb.upper.toFixed(5)),
        bbMiddle: parseFloat(bb.middle.toFixed(5)),
        bbLower: parseFloat(bb.lower.toFixed(5)),
        atr: parseFloat(atr.toFixed(5)),
        price: currentPrice,
      },
      timestamp: new Date(),
      isActive: true,
    };

    // Step 10: Save learning record
    await saveAiLearningRecord(
      signalId,
      pair,
      decision.strategy,
      decision.timeframe,
      decision.signalType as "BUY" | "SELL",
      decision.entryPrice,
      decision.stopLoss,
      decision.takeProfit,
      decision.strength,
      decision,
      snapshot
    );

    // Step 11: Update market context in DB
    if (db) {
      try {
        const contextId = `ctx_${pair.replace("/", "")}_${Date.now()}`;
        const bbPos = currentPrice > bb.upper ? "above_upper" 
          : currentPrice < bb.lower ? "below_lower" : "inside";
        const trend = currentPrice > sma50 ? "bullish" : "bearish";
        const vol = atr > 0.002 ? "high" : atr > 0.001 ? "medium" : "low";

        await db.insert(aiMarketContext).values({
          id: contextId,
          pair,
          trendDirection: trend,
          volatilityLevel: vol,
          supportLevel: bb.lower.toFixed(5),
          resistanceLevel: bb.upper.toFixed(5),
          marketSentiment: trend,
          aiSummary: marketSummary,
          recommendedStrategy: decision.strategy,
          confidenceScore: decision.confidence.toString(),
          updatedAt: new Date(),
        }).onConflictDoNothing();
      } catch (e) { /* non-critical */ }
    }

    console.log(`[AI Signal] Generated ${decision.signalType} for ${pair} - Confidence: ${decision.confidence}%`);
    return enhancedSignal;

  } catch (error) {
    console.error(`[AI Signal] Error generating signal for ${pair}:`, error);
    return null;
  }
}

/**
 * Check all active signals and trigger learning when they resolve
 */
export async function checkAndLearnFromResolvedSignals(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get active AI learning records without outcomes
    const activeRecords = await db
      .select()
      .from(aiLearningData)
      .where(sql`${aiLearningData.outcome} IS NULL`)
      .limit(50);

    for (const record of activeRecords) {
      const currentPrice = await getForexPrice(record.pair);
      if (!currentPrice) continue;

      const entryPrice = parseFloat(record.entryPrice);
      const stopLoss = parseFloat(record.stopLoss);
      const takeProfit = parseFloat(record.takeProfit);

      let outcome: "target_hit" | "stop_loss_hit" | null = null;

      if (record.signalType === "BUY") {
        if (currentPrice >= takeProfit) outcome = "target_hit";
        else if (currentPrice <= stopLoss) outcome = "stop_loss_hit";
      } else {
        if (currentPrice <= takeProfit) outcome = "target_hit";
        else if (currentPrice >= stopLoss) outcome = "stop_loss_hit";
      }

      if (outcome) {
        const pipValue = record.pair.includes("JPY") ? 0.01 : 0.0001;
        const priceDiff = record.signalType === "BUY" 
          ? currentPrice - entryPrice 
          : entryPrice - currentPrice;
        const plPips = priceDiff / pipValue;

        const createdAt = record.createdAt ? new Date(record.createdAt) : new Date();
        const durationHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

        const { learnFromOutcome } = await import("./aiBrain");
        await learnFromOutcome({
          signalId: record.signalId,
          pair: record.pair,
          strategy: record.strategy,
          timeframe: record.timeframe,
          outcome,
          plPips,
          durationHours,
          marketContext: `${record.trendDirection} trend, ${record.volatility} volatility, RSI: ${record.rsiValue}`,
        });

        console.log(`[AI Learning] ${record.pair} signal resolved: ${outcome} (${plPips.toFixed(1)} pips)`);
      }
    }
  } catch (error) {
    console.error("[AI Learning] Error checking resolved signals:", error);
  }
}
