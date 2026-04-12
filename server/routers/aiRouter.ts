/**
 * AI Brain tRPC Router
 * Endpoints for AI signal generation, feedback, and brain statistics
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { 
  getAiBrainStats, 
  recordUserFeedback, 
  learnFromOutcome,
  generateMarketContext,
  getStrategyWeights,
  analyzeWithAI,
  saveAiLearningRecord,
  type MarketSnapshot
} from "../aiBrain";
import { getDb } from "../db";
import { aiLearningData, aiMarketContext, aiStrategyWeights } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const aiRouter = router({

  /**
   * Get AI brain statistics - win rates, learning progress, top pairs
   */
  getBrainStats: publicProcedure.query(async () => {
    const data = await getAiBrainStats();
    return data || {
      stats: {
        totalSignalsAnalyzed: "0",
        totalOutcomesLearned: "0",
        overallWinRate: "0",
        bestPair: null,
        bestStrategy: null,
        bestTimeframe: null,
        learningVersion: "1.0",
        lastLearningCycle: null,
        totalFeedbackReceived: "0",
      },
      topPairs: [],
      recentLessons: [],
    };
  }),

  /**
   * Get AI market context for a specific pair
   */
  getMarketContext: publicProcedure
    .input(z.object({ pair: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const context = await db
          .select()
          .from(aiMarketContext)
          .where(eq(aiMarketContext.pair, input.pair))
          .orderBy(desc(aiMarketContext.updatedAt))
          .limit(1);

        return context[0] || null;
      } catch (error) {
        console.error("[AI Router] Error getting market context:", error);
        return null;
      }
    }),

  /**
   * Get AI reasoning for a specific signal
   */
  getSignalReasoning: publicProcedure
    .input(z.object({ signalId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const record = await db
          .select()
          .from(aiLearningData)
          .where(eq(aiLearningData.signalId, input.signalId))
          .limit(1);

        if (record.length === 0) return null;

        return {
          reasoning: record[0].aiReasoning,
          confidence: record[0].aiConfidence,
          keyContext: {
            rsi: record[0].rsiValue,
            macd: record[0].macdValue,
            bbPosition: record[0].bbPosition,
            trendDirection: record[0].trendDirection,
            volatility: record[0].volatility,
          },
          outcome: record[0].outcome,
          lessonsLearned: record[0].lessonsLearned,
        };
      } catch (error) {
        console.error("[AI Router] Error getting signal reasoning:", error);
        return null;
      }
    }),

  /**
   * Submit user feedback on a signal
   */
  submitFeedback: protectedProcedure
    .input(z.object({
      signalId: z.string(),
      feedbackType: z.enum(["thumbs_up", "thumbs_down", "entered_trade", "skipped_trade"]),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await recordUserFeedback(
        input.signalId,
        ctx.user.id,
        input.feedbackType,
        input.comment
      );
      return { success: true };
    }),

  /**
   * Get AI-powered signal analysis for a currency pair
   * Uses LLM to analyze market conditions and generate intelligent signal
   */
  analyzeSignal: protectedProcedure
    .input(z.object({
      pair: z.string(),
      snapshot: z.object({
        currentPrice: z.number(),
        rsi: z.number(),
        macd: z.number(),
        macdSignal: z.number(),
        macdHistogram: z.number(),
        sma50: z.number(),
        bbUpper: z.number(),
        bbMiddle: z.number(),
        bbLower: z.number(),
        atr: z.number(),
        high24h: z.number(),
        low24h: z.number(),
        priceChange24h: z.number(),
      }),
    }))
    .mutation(async ({ input }) => {
      const snapshot: MarketSnapshot = {
        pair: input.pair,
        ...input.snapshot,
      };

      // Get learned weights for this pair
      const weights = await getStrategyWeights(input.pair, "swing", "1h");

      // Get recent history for context
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
                eq(aiLearningData.pair, input.pair),
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
        } catch (e) {
          // Non-critical
        }
      }

      const decision = await analyzeWithAI(snapshot, weights, recentHistory);
      return decision;
    }),

  /**
   * Record signal outcome for learning (called when signal resolves)
   */
  recordOutcome: protectedProcedure
    .input(z.object({
      signalId: z.string(),
      pair: z.string(),
      strategy: z.string(),
      timeframe: z.string(),
      outcome: z.enum(["target_hit", "stop_loss_hit", "expired"]),
      plPips: z.number(),
      durationHours: z.number(),
      marketContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await learnFromOutcome({
        signalId: input.signalId,
        pair: input.pair,
        strategy: input.strategy,
        timeframe: input.timeframe,
        outcome: input.outcome,
        plPips: input.plPips,
        durationHours: input.durationHours,
        marketContext: input.marketContext || "",
      });
      return { success: true };
    }),

  /**
   * Get learning history - recent signals with outcomes and lessons
   */
  getLearningHistory: publicProcedure
    .input(z.object({
      pair: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        let query = db
          .select()
          .from(aiLearningData)
          .orderBy(desc(aiLearningData.createdAt))
          .limit(input.limit);

        if (input.pair) {
          const results = await db
            .select()
            .from(aiLearningData)
            .where(eq(aiLearningData.pair, input.pair))
            .orderBy(desc(aiLearningData.createdAt))
            .limit(input.limit);
          return results;
        }

        return await query;
      } catch (error) {
        console.error("[AI Router] Error getting learning history:", error);
        return [];
      }
    }),

  /**
   * Get strategy performance leaderboard
   */
  getStrategyLeaderboard: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      const weights = await db
        .select()
        .from(aiStrategyWeights)
        .where(sql`CAST(${aiStrategyWeights.totalSignals} AS INT) >= 3`)
        .orderBy(desc(sql`CAST(${aiStrategyWeights.winRate} AS FLOAT)`))
        .limit(20);

      return weights.map(w => ({
        pair: w.pair,
        strategy: w.strategy,
        timeframe: w.timeframe,
        winRate: parseFloat(w.winRate),
        totalSignals: parseInt(w.totalSignals),
        avgPlPips: parseFloat(w.avgPlPips),
        confidenceScore: parseFloat(w.confidenceScore),
      }));
    } catch (error) {
      console.error("[AI Router] Error getting strategy leaderboard:", error);
      return [];
    }
  }),

  /**
   * Get AI insights summary for the dashboard
   */
  getDashboardInsights: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        totalLearned: 0,
        overallWinRate: 0,
        bestSetup: null,
        recentLesson: null,
        isLearning: false,
        learningVersion: "1.0",
      };
    }

    try {
      // Get brain stats
      const { aiBrainStats: statsTable } = await import("../../drizzle/schema");
      const stats = await db
        .select()
        .from(statsTable)
        .where(eq(statsTable.id, "global"))
        .limit(1);

      // Get most recent lesson
      const recentLesson = await db
        .select()
        .from(aiLearningData)
        .where(sql`${aiLearningData.lessonsLearned} IS NOT NULL`)
        .orderBy(desc(aiLearningData.resolvedAt))
        .limit(1);

      // Get best performing setup
      const bestSetup = await db
        .select()
        .from(aiStrategyWeights)
        .where(sql`CAST(${aiStrategyWeights.totalSignals} AS INT) >= 5`)
        .orderBy(desc(sql`CAST(${aiStrategyWeights.winRate} AS FLOAT)`))
        .limit(1);

      const s = stats[0];
      return {
        totalLearned: parseInt(s?.totalOutcomesLearned || "0"),
        overallWinRate: parseInt(s?.overallWinRate || "0"),
        bestSetup: bestSetup[0] ? {
          pair: bestSetup[0].pair,
          strategy: bestSetup[0].strategy,
          winRate: parseFloat(bestSetup[0].winRate),
        } : null,
        recentLesson: recentLesson[0]?.lessonsLearned || null,
        isLearning: parseInt(s?.totalSignalsAnalyzed || "0") > 0,
        learningVersion: s?.learningVersion || "1.0",
        lastCycle: s?.lastLearningCycle || null,
      };
    } catch (error) {
      console.error("[AI Router] Error getting dashboard insights:", error);
      return {
        totalLearned: 0,
        overallWinRate: 0,
        bestSetup: null,
        recentLesson: null,
        isLearning: false,
        learningVersion: "1.0",
      };
    }
  }),
});
