/**
 * FOX TRADE MASTER™ - AI Brain Service
 * 
 * Self-learning AI system that:
 * 1. Analyzes market conditions using LLM reasoning
 * 2. Generates intelligent trading signals with explanations
 * 3. Learns from signal outcomes to improve over time
 * 4. Adapts strategy weights based on performance data
 * 5. Incorporates user feedback into learning
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { aiStrategyWeights, aiLearningData, aiMarketContext, aiBrainStats, aiSignalFeedback } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getForexPrice } from "./polygonService";

// ============================================================
// TYPES
// ============================================================

export interface MarketSnapshot {
  pair: string;
  currentPrice: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma50: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  atr: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
}

export interface AISignalDecision {
  shouldGenerate: boolean;
  signalType: "BUY" | "SELL" | "HOLD";
  strategy: string;
  confidence: number;          // 0-100
  reasoning: string;           // Human-readable explanation
  keyFactors: string[];        // Top factors driving this decision
  riskAssessment: string;      // Risk level and explanation
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  strength: number;            // 1-10
  aiInsight: string;           // Extra AI commentary
}

export interface LearningOutcome {
  signalId: string;
  pair: string;
  strategy: string;
  timeframe: string;
  outcome: "target_hit" | "stop_loss_hit" | "expired";
  plPips: number;
  durationHours: number;
  marketContext: string;
}

// ============================================================
// AI BRAIN CORE
// ============================================================

/**
 * Get or initialize strategy weights for a pair/strategy/timeframe combination
 */
export async function getStrategyWeights(pair: string, strategy: string, timeframe: string) {
  const db = await getDb();
  if (!db) return getDefaultWeights();

  try {
    const existing = await db
      .select()
      .from(aiStrategyWeights)
      .where(
        and(
          eq(aiStrategyWeights.pair, pair),
          eq(aiStrategyWeights.strategy, strategy),
          eq(aiStrategyWeights.timeframe, timeframe)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Initialize with default weights
    const id = `w_${pair.replace("/", "")}_${strategy}_${timeframe}_${Date.now()}`;
    await db.insert(aiStrategyWeights).values({
      id,
      pair,
      strategy,
      timeframe,
    });

    return getDefaultWeights();
  } catch (error) {
    console.error("[AI Brain] Error getting strategy weights:", error);
    return getDefaultWeights();
  }
}

function getDefaultWeights() {
  return {
    macdWeight: "1.0",
    rsiWeight: "1.0",
    bbWeight: "1.0",
    smaWeight: "1.0",
    atrWeight: "1.0",
    winRate: "0",
    totalSignals: "0",
    confidenceScore: "50",
  };
}

/**
 * Core AI analysis - uses LLM to reason about market conditions
 * and generate an intelligent trading decision
 */
export async function analyzeWithAI(
  snapshot: MarketSnapshot,
  weights: ReturnType<typeof getDefaultWeights>,
  recentHistory: Array<{ outcome: string; plPips: string | null; strategy: string }>
): Promise<AISignalDecision> {
  
  const winRate = parseFloat(weights.winRate) || 0;
  const totalSignals = parseInt(weights.totalSignals) || 0;
  const confidence = parseFloat(weights.confidenceScore) || 50;

  // Build performance context
  const recentWins = recentHistory.filter(h => h.outcome === "target_hit").length;
  const recentLosses = recentHistory.filter(h => h.outcome === "stop_loss_hit").length;
  const recentWinRate = recentHistory.length > 0 
    ? Math.round((recentWins / recentHistory.length) * 100) 
    : 0;

  // Build the AI prompt with all market data
  const prompt = `You are the AI trading brain for FOX TRADE MASTER™, an expert forex trading signal system.

## Current Market Data for ${snapshot.pair}
- Current Price: ${snapshot.currentPrice}
- 24h High: ${snapshot.high24h} | 24h Low: ${snapshot.low24h}
- 24h Change: ${snapshot.priceChange24h > 0 ? '+' : ''}${snapshot.priceChange24h.toFixed(4)}

## Technical Indicators
- RSI (14): ${snapshot.rsi.toFixed(2)} ${snapshot.rsi < 30 ? '⚠️ OVERSOLD' : snapshot.rsi > 70 ? '⚠️ OVERBOUGHT' : '✅ NEUTRAL'}
- MACD: ${snapshot.macd.toFixed(5)} | Signal: ${snapshot.macdSignal.toFixed(5)} | Histogram: ${snapshot.macdHistogram.toFixed(5)}
- SMA 50: ${snapshot.sma50.toFixed(5)} | Price vs SMA: ${snapshot.currentPrice > snapshot.sma50 ? 'ABOVE (bullish)' : 'BELOW (bearish)'}
- Bollinger Bands: Upper ${snapshot.bbUpper.toFixed(5)} | Middle ${snapshot.bbMiddle.toFixed(5)} | Lower ${snapshot.bbLower.toFixed(5)}
- ATR (14): ${snapshot.atr.toFixed(5)} (volatility measure)

## Learned Performance Data
- Historical Win Rate for this pair/strategy: ${winRate.toFixed(1)}%
- Total signals analyzed: ${totalSignals}
- Recent performance (last ${recentHistory.length} signals): ${recentWinRate}% win rate
- Recent wins: ${recentWins} | Recent losses: ${recentLosses}
- AI Confidence Score: ${confidence}/100

## Indicator Weights (learned from outcomes)
- MACD weight: ${weights.macdWeight} | RSI weight: ${weights.rsiWeight}
- Bollinger Bands weight: ${weights.bbWeight} | SMA weight: ${weights.smaWeight}

## Your Task
Analyze these market conditions and decide whether to generate a trading signal.
Apply the learned weights to prioritize more reliable indicators.
Consider the recent performance history in your decision.

Respond with a JSON object in this exact format:
{
  "shouldGenerate": true/false,
  "signalType": "BUY" or "SELL" or "HOLD",
  "strategy": "swing" or "day" or "trend" or "momentum",
  "confidence": 0-100,
  "reasoning": "Clear 2-3 sentence explanation of why this signal is being generated",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskAssessment": "Low/Medium/High risk - brief explanation",
  "strength": 1-10,
  "timeframe": "15m" or "1h" or "4h" or "1d",
  "stopLossMultiplier": 1.5-3.0,
  "takeProfitMultiplier": 2.0-4.0,
  "aiInsight": "One insightful observation about this trade setup"
}

Only generate a signal if there is a clear, high-confidence setup. If conditions are mixed or unclear, set shouldGenerate to false.`;

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert forex trading AI with deep knowledge of technical analysis, market psychology, and risk management. You analyze data objectively and provide clear, actionable insights. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = result.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return getFallbackDecision(snapshot);
    }

    const decision = JSON.parse(content);
    
    // Calculate entry, stop loss, take profit using ATR
    const atr = snapshot.atr;
    const slMultiplier = decision.stopLossMultiplier || 2.0;
    const tpMultiplier = decision.takeProfitMultiplier || 3.0;
    
    const stopLoss = decision.signalType === "BUY"
      ? snapshot.currentPrice - (atr * slMultiplier)
      : snapshot.currentPrice + (atr * slMultiplier);
    
    const takeProfit = decision.signalType === "BUY"
      ? snapshot.currentPrice + (atr * tpMultiplier)
      : snapshot.currentPrice - (atr * tpMultiplier);

    return {
      shouldGenerate: decision.shouldGenerate ?? false,
      signalType: decision.signalType || "HOLD",
      strategy: decision.strategy || "swing",
      confidence: Math.min(100, Math.max(0, decision.confidence || 50)),
      reasoning: decision.reasoning || "AI analysis complete",
      keyFactors: decision.keyFactors || [],
      riskAssessment: decision.riskAssessment || "Medium risk",
      entryPrice: parseFloat(snapshot.currentPrice.toFixed(5)),
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5)),
      timeframe: decision.timeframe || "1h",
      strength: Math.min(10, Math.max(1, decision.strength || 5)),
      aiInsight: decision.aiInsight || "",
    };

  } catch (error) {
    console.error("[AI Brain] LLM analysis failed:", error);
    return getFallbackDecision(snapshot);
  }
}

function getFallbackDecision(snapshot: MarketSnapshot): AISignalDecision {
  return {
    shouldGenerate: false,
    signalType: "HOLD",
    strategy: "swing",
    confidence: 0,
    reasoning: "AI analysis temporarily unavailable. Using technical analysis fallback.",
    keyFactors: [],
    riskAssessment: "Analysis unavailable",
    entryPrice: snapshot.currentPrice,
    stopLoss: snapshot.currentPrice * 0.99,
    takeProfit: snapshot.currentPrice * 1.01,
    timeframe: "1h",
    strength: 5,
    aiInsight: "",
  };
}

/**
 * AI Learning Engine - processes signal outcomes and updates strategy weights
 * Called when a signal resolves (hits target or stop loss)
 */
export async function learnFromOutcome(outcome: LearningOutcome): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const isWin = outcome.outcome === "target_hit";
    const plPips = outcome.plPips;

    // Update strategy weights based on outcome
    const existing = await db
      .select()
      .from(aiStrategyWeights)
      .where(
        and(
          eq(aiStrategyWeights.pair, outcome.pair),
          eq(aiStrategyWeights.strategy, outcome.strategy),
          eq(aiStrategyWeights.timeframe, outcome.timeframe)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const w = existing[0];
      const total = parseInt(w.totalSignals) + 1;
      const wins = parseInt(w.winCount) + (isWin ? 1 : 0);
      const losses = parseInt(w.lossCount) + (isWin ? 0 : 1);
      const newWinRate = Math.round((wins / total) * 100);
      
      // Adjust confidence score: increases with wins, decreases with losses
      const currentConfidence = parseFloat(w.confidenceScore);
      const confidenceAdjustment = isWin ? 2 : -3;
      const newConfidence = Math.min(95, Math.max(10, currentConfidence + confidenceAdjustment));

      // Update avg P/L in pips
      const currentAvgPl = parseFloat(w.avgPlPips);
      const newAvgPl = ((currentAvgPl * (total - 1)) + plPips) / total;

      await db
        .update(aiStrategyWeights)
        .set({
          totalSignals: total.toString(),
          winCount: wins.toString(),
          lossCount: losses.toString(),
          winRate: newWinRate.toString(),
          avgPlPips: newAvgPl.toFixed(2),
          confidenceScore: newConfidence.toFixed(1),
          lastUpdated: new Date(),
        })
        .where(eq(aiStrategyWeights.id, w.id));
    }

    // Update learning data record
    await db
      .update(aiLearningData)
      .set({
        outcome: outcome.outcome,
        plPips: plPips.toString(),
        durationHours: outcome.durationHours.toString(),
        resolvedAt: new Date(),
      })
      .where(eq(aiLearningData.signalId, outcome.signalId));

    // Ask AI to generate lessons learned
    await generateLessonsLearned(outcome);

    // Update global brain stats
    await updateBrainStats();

    console.log(`[AI Brain] Learned from ${outcome.pair} ${outcome.strategy} - ${outcome.outcome} (${plPips > 0 ? '+' : ''}${plPips} pips)`);

  } catch (error) {
    console.error("[AI Brain] Error learning from outcome:", error);
  }
}

/**
 * Generate AI lessons learned from a resolved signal
 */
async function generateLessonsLearned(outcome: LearningOutcome): Promise<void> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a forex trading mentor AI. Analyze trading outcomes and extract actionable lessons in 1-2 sentences."
        },
        {
          role: "user",
          content: `Signal outcome: ${outcome.pair} ${outcome.strategy} strategy on ${outcome.timeframe} timeframe.
Result: ${outcome.outcome} | P/L: ${outcome.plPips > 0 ? '+' : ''}${outcome.plPips} pips | Duration: ${outcome.durationHours}h
Market context: ${outcome.marketContext}

What is the key lesson learned from this trade? Be specific and actionable.`
        }
      ],
      max_tokens: 150
    });

    const lesson = result.choices[0]?.message?.content;
    if (lesson && typeof lesson === "string") {
      const db = await getDb();
      if (db) {
        await db
          .update(aiLearningData)
          .set({ lessonsLearned: lesson })
          .where(eq(aiLearningData.signalId, outcome.signalId));
      }
    }
  } catch (error) {
    // Non-critical, just log
    console.warn("[AI Brain] Could not generate lessons learned:", error);
  }
}

/**
 * Update global AI brain statistics
 */
async function updateBrainStats(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get aggregate stats
    const allWeights = await db.select().from(aiStrategyWeights);
    
    const totalSignals = allWeights.reduce((sum, w) => sum + parseInt(w.totalSignals), 0);
    const totalWins = allWeights.reduce((sum, w) => sum + parseInt(w.winCount), 0);
    const overallWinRate = totalSignals > 0 ? Math.round((totalWins / totalSignals) * 100) : 0;

    // Find best performing pair
    const bestPairWeight = allWeights
      .filter(w => parseInt(w.totalSignals) >= 5)
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))[0];

    // Find best strategy
    const strategyMap: Record<string, { wins: number; total: number }> = {};
    allWeights.forEach(w => {
      if (!strategyMap[w.strategy]) strategyMap[w.strategy] = { wins: 0, total: 0 };
      strategyMap[w.strategy].wins += parseInt(w.winCount);
      strategyMap[w.strategy].total += parseInt(w.totalSignals);
    });
    
    const bestStrategy = Object.entries(strategyMap)
      .filter(([, v]) => v.total >= 5)
      .sort(([, a], [, b]) => (b.wins / b.total) - (a.wins / a.total))[0]?.[0];

    // Get total outcomes learned
    const outcomesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiLearningData)
      .where(sql`${aiLearningData.outcome} IS NOT NULL`);
    
    const totalOutcomes = outcomesResult[0]?.count || 0;

    // Get total feedback
    const feedbackResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiSignalFeedback);
    
    const totalFeedback = feedbackResult[0]?.count || 0;

    // Upsert brain stats
    await db
      .insert(aiBrainStats)
      .values({
        id: "global",
        totalSignalsAnalyzed: totalSignals.toString(),
        totalOutcomesLearned: totalOutcomes.toString(),
        overallWinRate: overallWinRate.toString(),
        bestPair: bestPairWeight?.pair || null,
        bestStrategy: bestStrategy || null,
        lastLearningCycle: new Date(),
        totalFeedbackReceived: totalFeedback.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiBrainStats.id,
        set: {
          totalSignalsAnalyzed: totalSignals.toString(),
          totalOutcomesLearned: totalOutcomes.toString(),
          overallWinRate: overallWinRate.toString(),
          bestPair: bestPairWeight?.pair || null,
          bestStrategy: bestStrategy || null,
          lastLearningCycle: new Date(),
          totalFeedbackReceived: totalFeedback.toString(),
          updatedAt: new Date(),
        }
      });

  } catch (error) {
    console.error("[AI Brain] Error updating brain stats:", error);
  }
}

/**
 * Generate AI market context analysis for a currency pair
 * Updates periodically to keep market analysis fresh
 */
export async function generateMarketContext(
  pair: string,
  snapshot: MarketSnapshot
): Promise<string> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert forex market analyst. Provide concise, actionable market analysis in 2-3 sentences. Focus on key price levels, trend direction, and immediate opportunities."
        },
        {
          role: "user",
          content: `Analyze current market conditions for ${pair}:
Price: ${snapshot.currentPrice} | RSI: ${snapshot.rsi.toFixed(1)} | MACD Histogram: ${snapshot.macdHistogram.toFixed(5)}
Price vs SMA50: ${snapshot.currentPrice > snapshot.sma50 ? 'Above (bullish)' : 'Below (bearish)'}
BB Position: ${snapshot.currentPrice > snapshot.bbUpper ? 'Above upper band' : snapshot.currentPrice < snapshot.bbLower ? 'Below lower band' : 'Inside bands'}
24h Range: ${snapshot.low24h} - ${snapshot.high24h}

Provide a brief market summary including trend, key levels, and trading bias.`
        }
      ],
      max_tokens: 200
    });

    const content = result.choices[0]?.message?.content;
    return typeof content === "string" ? content : "Market analysis unavailable.";
  } catch (error) {
    console.error("[AI Brain] Market context generation failed:", error);
    return "Market analysis temporarily unavailable.";
  }
}

/**
 * Record signal feedback from users
 */
export async function recordUserFeedback(
  signalId: string,
  userId: string,
  feedbackType: "thumbs_up" | "thumbs_down" | "entered_trade" | "skipped_trade",
  comment?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const id = `fb_${signalId}_${userId}_${Date.now()}`;
    await db.insert(aiSignalFeedback).values({
      id,
      signalId,
      userId,
      feedbackType,
      comment: comment || null,
    });

    // Positive feedback slightly boosts confidence, negative reduces it
    if (feedbackType === "thumbs_up" || feedbackType === "entered_trade") {
      // Find the learning data for this signal and boost its pair/strategy weights slightly
      const learningRecord = await db
        .select()
        .from(aiLearningData)
        .where(eq(aiLearningData.signalId, signalId))
        .limit(1);

      if (learningRecord.length > 0) {
        const record = learningRecord[0];
        await db
          .update(aiStrategyWeights)
          .set({
            confidenceScore: sql`LEAST(95, CAST(${aiStrategyWeights.confidenceScore} AS FLOAT) + 0.5)::text`,
          })
          .where(
            and(
              eq(aiStrategyWeights.pair, record.pair),
              eq(aiStrategyWeights.strategy, record.strategy),
              eq(aiStrategyWeights.timeframe, record.timeframe)
            )
          );
      }
    }

    await updateBrainStats();
  } catch (error) {
    console.error("[AI Brain] Error recording feedback:", error);
  }
}

/**
 * Get AI brain statistics for display
 */
export async function getAiBrainStats() {
  const db = await getDb();
  if (!db) return null;

  try {
    const stats = await db
      .select()
      .from(aiBrainStats)
      .where(eq(aiBrainStats.id, "global"))
      .limit(1);

    const topPairs = await db
      .select()
      .from(aiStrategyWeights)
      .where(sql`CAST(${aiStrategyWeights.totalSignals} AS INT) >= 3`)
      .orderBy(desc(sql`CAST(${aiStrategyWeights.winRate} AS FLOAT)`))
      .limit(5);

    const recentLessons = await db
      .select()
      .from(aiLearningData)
      .where(sql`${aiLearningData.lessonsLearned} IS NOT NULL`)
      .orderBy(desc(aiLearningData.resolvedAt))
      .limit(5);

    return {
      stats: stats[0] || null,
      topPairs,
      recentLessons,
    };
  } catch (error) {
    console.error("[AI Brain] Error getting stats:", error);
    return null;
  }
}

/**
 * Save AI learning record when a signal is generated
 */
export async function saveAiLearningRecord(
  signalId: string,
  pair: string,
  strategy: string,
  timeframe: string,
  signalType: "BUY" | "SELL",
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  strength: number,
  aiDecision: AISignalDecision,
  snapshot: MarketSnapshot
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const bbPosition = snapshot.currentPrice > snapshot.bbUpper 
      ? "above_upper" 
      : snapshot.currentPrice < snapshot.bbLower 
        ? "below_lower" 
        : "inside";

    const volatility = snapshot.atr > 0.002 ? "high" : snapshot.atr > 0.001 ? "medium" : "low";
    const trendDirection = snapshot.currentPrice > snapshot.sma50 ? "up" : "down";

    const id = `ld_${signalId}_${Date.now()}`;
    await db.insert(aiLearningData).values({
      id,
      signalId,
      pair,
      strategy,
      timeframe,
      signalType,
      entryPrice: entryPrice.toString(),
      stopLoss: stopLoss.toString(),
      takeProfit: takeProfit.toString(),
      strength: strength.toString(),
      rsiValue: snapshot.rsi.toFixed(2),
      macdValue: snapshot.macdHistogram.toFixed(5),
      bbPosition,
      trendDirection,
      volatility,
      aiConfidence: aiDecision.confidence.toString(),
      aiReasoning: aiDecision.reasoning,
    });
  } catch (error) {
    console.error("[AI Brain] Error saving learning record:", error);
  }
}
