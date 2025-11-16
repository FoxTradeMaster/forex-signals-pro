import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { fetchForexData, fetchAllForexData, fetchForexDataForUser, getPairSymbolsForTier, isPairAvailableForTier } from "./forexDataPolygon";
import { getPairMarketStatus, isForexMarketOpen, getCurrentSessionName, formatTimeUntilOpen } from "./marketHours";
import { SignalEngine } from "./signalEngine";
import { MomentumWindowAnalyzer } from "./momentumWindow";
import { saveSignal, getActiveSignals, getSignalsByPair, deactivateSignal, clearAllSignals, addToWatchlist, removeFromWatchlist, getUserWatchlist, getDb, getUser } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createPayPalOrder, capturePayPalOrder } from "./paypal";
import { sendWelcomeEmail } from "./email";

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

  subscription: router({
    // Get current user's subscription status
    getStatus: publicProcedure.query(async ({ ctx }) => {
      // If not logged in, return free tier
      if (!ctx.user) {
        return { tier: "free" as const, isActive: false, expiry: null };
      }
      const user = await getUser(ctx.user.id);
      if (!user) return { tier: "free" as const, isActive: false };

      // Owner always has pro access
      if (user.role === "admin") {
        return { tier: "pro" as const, isActive: true, expiry: null };
      }

      // Check if subscription is expired
      const now = new Date();
      const hasPaidTier = user.subscriptionTier === "premium" || user.subscriptionTier === "pro";
      const hasExpiry = user.subscriptionExpiry !== null;
      const isExpired = hasExpiry && user.subscriptionExpiry && new Date(user.subscriptionExpiry) < now;
      const isActive = hasPaidTier && !isExpired;
      
      // Calculate days until expiry (or days since expiry if negative)
      let daysUntilExpiry: number | null = null;
      if (hasExpiry && user.subscriptionExpiry) {
        const diffMs = new Date(user.subscriptionExpiry).getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        tier: isActive ? user.subscriptionTier : "free",
        isActive,
        expiry: user.subscriptionExpiry,
        daysUntilExpiry,
        isExpired: hasPaidTier && isExpired,
      };
    }),

    // Create PayPal order for subscription
    createPayment: protectedProcedure
      .input(z.object({ plan: z.enum(["monthly", "yearly", "pro_monthly", "pro_yearly"]) }))
      .mutation(async ({ input }) => {
        const result = await createPayPalOrder(input.plan);
        if (!result.success) {
          throw new Error(result.error || "Failed to create payment");
        }
        return {
          orderId: result.orderId,
          approvalUrl: result.approvalUrl,
        };
      }),

    // Capture PayPal payment and activate subscription
    capturePayment: protectedProcedure
      .input(z.object({ 
        orderId: z.string(),
        plan: z.enum(["monthly", "yearly", "pro_monthly", "pro_yearly"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Capture the PayPal payment
        const captureResult = await capturePayPalOrder(input.orderId);
        if (!captureResult.success) {
          throw new Error(captureResult.error || "Payment capture failed");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Calculate expiry date
        const now = new Date();
        const expiry = new Date(now);
        const isPro = input.plan.startsWith('pro_');
        
        if (input.plan === "monthly" || input.plan === "pro_monthly") {
          expiry.setMonth(expiry.getMonth() + 1);
        } else {
          expiry.setFullYear(expiry.getFullYear() + 1);
        }

        // Update user subscription
        await db.update(users)
          .set({
            subscriptionTier: isPro ? "pro" : "premium",
            subscriptionExpiry: expiry,
          })
          .where(eq(users.id, ctx.user.id));

        // Send welcome email with user guide
        if (ctx.user.email) {
          await sendWelcomeEmail(
            ctx.user.email,
            ctx.user.name || 'Trader',
            input.plan
          ).catch(err => console.error('[Payment] Failed to send welcome email:', err));
        }

        return {
          success: true,
          expiry,
          amount: captureResult.amount,
          message: `${isPro ? 'Pro' : 'Premium'} access activated until ${expiry.toLocaleDateString()}`,
        };
      }),
  }),

  // Forex data and signals
  forex: router({
    // Get all supported pairs
    getPairs: publicProcedure.query(() => {
      return getPairSymbolsForTier('pro');
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
          input.pair,
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
        const forexData = await fetchAllForexData("pro", input.interval, input.range);
        return forexData;
      }),
  }),

  signals: router({
    // Generate signals for all pairs
    generateAll: publicProcedure.mutation(async () => {
      // Clear old signals first
      await clearAllSignals();

      const forexData = await fetchAllForexData("pro", "1h", "5d");
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
        // Clear old signals for this pair
        await clearAllSignals();

        const forexData = await fetchForexData(input.pair, "1h", "5d");
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

  market: router({
    // Get overall market status
    getStatus: publicProcedure.query(() => {
      return {
        isOpen: isForexMarketOpen(),
        currentSession: getCurrentSessionName(),
      };
    }),

    // Get market status for a specific pair
    getPairStatus: publicProcedure
      .input(z.object({ pair: z.string() }))
      .query(({ input }) => {
        const status = getPairMarketStatus(input.pair);
        return {
          ...status,
          nextOpenFormatted: status.nextOpenTime ? formatTimeUntilOpen(status.nextOpenTime) : null,
        };
      }),

    // Get market status for all pairs
    getAllPairStatuses: publicProcedure.query(() => {
      const statuses: Record<string, any> = {};
      
      for (const pair of getPairSymbolsForTier('pro')) {
        const status = getPairMarketStatus(pair);
        statuses[pair] = {
          ...status,
          nextOpenFormatted: status.nextOpenTime ? formatTimeUntilOpen(status.nextOpenTime) : null,
        };
      }

      return statuses;
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
        const forexData = await fetchForexData(input.pair, "1h", "5d");
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
      const forexData = await fetchAllForexData("pro", "1h", "5d");
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
