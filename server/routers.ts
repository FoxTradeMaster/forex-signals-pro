import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { fetchForexData, fetchAllForexData, FOREX_PAIRS, ForexPairName } from "./forexData";
import { SignalEngine } from "./signalEngine";
import { MomentumWindowAnalyzer } from "./momentumWindow";
import { saveSignal, getActiveSignals, getSignalsByPair, deactivateSignal, addToWatchlist, removeFromWatchlist, getUserWatchlist } from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Forex data and signals
  forex: router({
    // Get all supported pairs
    getPairs: publicProcedure.query(() => {
      return Object.keys(FOREX_PAIRS);
    }),

    // Get current price for a pair
    getPairData: publicProcedure
      .input(z.object({ 
        pair: z.string(),
        interval: z.enum(["15m", "1h", "1d"]).optional(),
        range: z.enum(["1d", "5d", "1mo"]).optional(),
      }))
      .query(async ({ input }) => {
        const data = await fetchForexData(
          input.pair as ForexPairName,
          input.interval,
          input.range
        );
        return data;
      }),

    // Get all forex data
    getAllData: publicProcedure
      .input(z.object({
        interval: z.enum(["15m", "1h", "1d"]).optional(),
        range: z.enum(["1d", "5d", "1mo"]).optional(),
      }))
      .query(async ({ input }) => {
        const data = await fetchAllForexData(input.interval, input.range);
        return data;
      }),
  }),

  signals: router({
    // Generate signals for all pairs
    generateAll: publicProcedure.mutation(async () => {
      const forexData = await fetchAllForexData("1h", "5d");
      const engine = new SignalEngine();
      const signals = engine.generateMultipleSignals(forexData);

      // Save signals to database
      for (const signal of signals) {
        await saveSignal({
          id: signal.id,
          pair: signal.pair,
          signalType: signal.signalType,
          strength: signal.strength.toString(),
          strategy: signal.strategy,
          entryPrice: signal.entryPrice.toString(),
          stopLoss: signal.stopLoss.toString(),
          takeProfit: signal.takeProfit.toString(),
          timeframe: signal.timeframe,
          reason: signal.reason,
          indicators: JSON.stringify(signal.indicators),
          isActive: "true",
        });
      }

      return signals;
    }),

    // Generate signals for a specific pair
    generateForPair: publicProcedure
      .input(z.object({ pair: z.string() }))
      .mutation(async ({ input }) => {
        const forexData = await fetchForexData(input.pair as ForexPairName, "1h", "5d");
        if (!forexData) return [];

        const engine = new SignalEngine();
        const signals = engine.generateSignals(forexData);

        for (const signal of signals) {
          await saveSignal({
            id: signal.id,
            pair: signal.pair,
            signalType: signal.signalType,
            strength: signal.strength.toString(),
            strategy: signal.strategy,
            entryPrice: signal.entryPrice.toString(),
            stopLoss: signal.stopLoss.toString(),
            takeProfit: signal.takeProfit.toString(),
            timeframe: signal.timeframe,
            reason: signal.reason,
            indicators: JSON.stringify(signal.indicators),
            isActive: "true",
          });
        }

        return signals;
      }),

    // Get active signals
    getActive: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        const signals = await getActiveSignals(input.limit);
        return signals.map(s => ({
          ...s,
          indicators: JSON.parse(s.indicators),
        }));
      }),

    // Get signals by pair
    getByPair: publicProcedure
      .input(z.object({ pair: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const signals = await getSignalsByPair(input.pair, input.limit);
        return signals.map(s => ({
          ...s,
          indicators: JSON.parse(s.indicators),
        }));
      }),

    // Deactivate a signal
    deactivate: publicProcedure
      .input(z.object({ signalId: z.string() }))
      .mutation(async ({ input }) => {
        await deactivateSignal(input.signalId);
        return { success: true };
      }),
  }),

  watchlist: router({
    // Get user's watchlist
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserWatchlist(ctx.user.id);
    }),

    // Add pair to watchlist
    add: protectedProcedure
      .input(z.object({ pair: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await addToWatchlist(ctx.user.id, input.pair);
        return { success: true };
      }),

    // Remove pair from watchlist
    remove: protectedProcedure
      .input(z.object({ pair: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromWatchlist(ctx.user.id, input.pair);
        return { success: true };
      }),
  }),

  momentum: router({
    // Get current trading session
    getCurrentSession: publicProcedure.query(() => {
      const analyzer = new MomentumWindowAnalyzer();
      return analyzer.getCurrentSession();
    }),

    // Analyze 24-hour momentum for a pair
    analyze24Hour: publicProcedure
      .input(z.object({ pair: z.string() }))
      .query(async ({ input }) => {
        const forexData = await fetchForexData(input.pair as ForexPairName, "1h", "5d");
        if (!forexData) return [];

        const analyzer = new MomentumWindowAnalyzer();
        return analyzer.analyze24HourMomentum(forexData.ohlc, input.pair);
      }),

    // Check if current time is optimal for trading a pair
    checkOptimalTime: publicProcedure
      .input(z.object({ pair: z.string() }))
      .query(({ input }) => {
        const analyzer = new MomentumWindowAnalyzer();
        return analyzer.isOptimalTradingTime(input.pair);
      }),

    // Get all momentum windows for all pairs
    analyzeAll: publicProcedure.query(async () => {
      const forexData = await fetchAllForexData("1h", "5d");
      const analyzer = new MomentumWindowAnalyzer();
      
      const results = forexData.map(data => ({
        pair: data.pair,
        windows: analyzer.analyze24HourMomentum(data.ohlc, data.pair),
        optimalTime: analyzer.isOptimalTradingTime(data.pair),
      }));

      return results;
    }),
  }),
});

export type AppRouter = typeof appRouter;
