import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { fetchForexData, fetchAllForexData, fetchForexDataForUser, getPairSymbolsForTier, isPairAvailableForTier } from "./forexDataPolygon";
import { getPairMarketStatus, isForexMarketOpen, getCurrentSessionName, formatTimeUntilOpen } from "./marketHours";
import { SignalEngine } from "./signalEngine";
import { MomentumWindowAnalyzer } from "./momentumWindow";
import { saveSignal, getActiveSignals, getSignalsByPair, deactivateSignal, clearAllSignals, addToWatchlist, removeFromWatchlist, getUserWatchlist, getDb, getUser, getPaymentByEmail, linkPaymentToUser, getAllPayments, getAllUsers, updateUserSubscription, upsertSignalPerformance, getSignalPerformance, getHistoricalPerformance, getWinRateByPair, getPerformanceByTimeframe, getStrategyPerformance, getDailyPLTrend, createSharedSignal, getSharedSignal, getUserSharedSignals, getSignalStats, grantReferralReward } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createPayPalOrder, capturePayPalOrder } from "./paypal";
import { sendWelcomeEmail, sendNewPaymentNotification, sendFreeWelcomeEmail } from "./email";
import { createMagicLink, verifyMagicLink } from "./_core/magicLink";
import { sendMagicLinkEmail } from "./_core/sendMagicLinkEmail";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { aiRouter } from "./routers/aiRouter";
import { referralRouter } from "./routers/referralRouter";
import { generateAISignal, checkAndLearnFromResolvedSignals } from "./aiSignalEngine";

// Top major pairs to enhance with AI reasoning (fast, high-value)
const AI_PRIORITY_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF",
  "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY",
];

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
    
    // Request free account (email sign-up for free tier)
    requestFreeSignup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        referralCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          // Check if user already exists
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, input.email))
            .limit(1);

          if (!existingUser) {
            // Create new free-tier user
            const userId = `user_${Date.now()}_${input.email.split('@')[0]}`;
            await db.insert(users).values({
              id: userId,
              email: input.email,
              name: input.email.split('@')[0],
              loginMethod: 'email_free',
              subscriptionTier: 'free',
              role: 'user',
            });

            // Track referral if code provided
            if (input.referralCode) {
              const { trackReferral } = await import('./db');
              await trackReferral(input.referralCode, userId).catch(() => {});
            }

            // Send welcome email (non-blocking)
            sendFreeWelcomeEmail(input.email, input.email.split('@')[0])
              .catch(err => console.error('[Free Signup] Failed to send welcome email:', err));
          }

          return { success: true, message: 'Free account ready — check your email for a welcome message!' };
        } catch (error) {
          console.error('[Free Signup] Error:', error);
          throw new Error('Failed to create free account');
        }
      }),

    // Request magic link (after PayPal payment)
    requestMagicLink: publicProcedure
      .input(z.object({
        email: z.string().email(),
        tier: z.enum(["premium", "pro"]),
      }))
      .mutation(async ({ input }) => {
        try {
          // Create magic link token
          const token = await createMagicLink(input.email, input.tier);
          
          // Send email
          const emailSent = await sendMagicLinkEmail(input.email, token, input.tier);
          
          if (!emailSent) {
            throw new Error("Failed to send magic link email");
          }
          
          return { success: true, message: "Magic link sent to your email" };
        } catch (error) {
          console.error("[Magic Link] Error:", error);
          throw new Error("Failed to send magic link");
        }
      }),
    
    // Verify magic link and create session
    verifyMagicLink: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Verify token
          const result = await verifyMagicLink(input.token);
          
          if (!result) {
            throw new Error("Invalid or expired magic link");
          }
          
          // Create or update user
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          const userId = `user_${Date.now()}_${result.email.split('@')[0]}`;
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + 1); // 1 month subscription
          
          // Check if user exists
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, result.email))
            .limit(1);
          
          if (existingUser) {
            // Update existing user - but preserve admin role and don't reset expiry for admins
            const isAdmin = existingUser.role === 'admin';
            await db
              .update(users)
              .set({
                // Only update subscription if not an admin (admins have permanent access)
                ...(isAdmin ? {} : { subscriptionTier: result.tier, subscriptionExpiry: expiry }),
                lastSignedIn: new Date(),
              })
              .where(eq(users.id, existingUser.id));
          } else {
            // Create new user
            await db.insert(users).values({
              id: userId,
              email: result.email,
              name: result.email.split('@')[0],
              loginMethod: "magic_link",
              subscriptionTier: result.tier,
              subscriptionExpiry: expiry,
              role: "user",
            });
            
            // Link any payment records to this user
            const payment = await getPaymentByEmail(result.email);
            if (payment) {
              await linkPaymentToUser(payment.id, userId);
              console.log(`[Magic Link] Linked payment ${payment.id} to user ${userId}`);
            }

            // Send welcome email for new premium/pro users
            sendWelcomeEmail(
              result.email,
              result.email.split('@')[0],
              result.tier === 'pro' ? 'pro_monthly' : 'monthly'
            ).catch(err => console.error('[Magic Link] Failed to send welcome email:', err));
          }
          
          // Create session using sdk.createSessionToken so authenticateRequest can
          // always fetch the latest role/subscription from the DB on every request
          const finalUser = existingUser || { id: userId, email: result.email, name: result.email.split('@')[0], role: "user" };
          const sessionToken = await sdk.createSessionToken(finalUser.id, {
            name: finalUser.name || finalUser.email || undefined,
            expiresInMs: 30 * 24 * 60 * 60 * 1000, // 30 days
          });
          
          // Set session cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
          
          return { 
            success: true, 
            user: { 
              id: finalUser.id, 
              email: finalUser.email, 
              name: finalUser.name,
              tier: result.tier 
            } 
          };
        } catch (error) {
          console.error("[Magic Link Verify] Error:", error);
          throw new Error("Failed to verify magic link");
        }
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

    // Create PayPal order for subscription (allow anonymous payments)
    createPayment: publicProcedure
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

        // Grant 1 free month to referrer if this user was referred
        try {
          const paidUser = await getUser(ctx.user.id);
          if (paidUser?.referredBy) {
            const rewarded = await grantReferralReward(paidUser.referredBy, ctx.user.name || 'your friend');
            if (rewarded) {
              console.log(`[Referral] Rewarded referrer ${paidUser.referredBy} for conversion of ${ctx.user.id}`);
            }
          }
        } catch (refErr) {
          console.error('[Referral] Failed to process referral reward (non-fatal):', refErr);
        }

        // Notify owner of new payment
        sendNewPaymentNotification({
          userEmail: ctx.user.email || 'unknown',
          userName: ctx.user.name || 'Unknown User',
          plan: input.plan,
          amount: captureResult.amount || '0.00',
          orderId: input.orderId,
          expiry,
        }).catch(err => console.error('[Payment] Failed to send owner notification:', err));

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
    // Generate signals for all pairs (with AI enhancement on priority pairs)
    generateAll: publicProcedure.mutation(async () => {
      // Clear old signals first (non-fatal — if table doesn't exist yet, we continue)
      try {
        await clearAllSignals();
      } catch (clearErr: any) {
        console.warn('[Signal Gen] clearAllSignals failed (non-fatal), continuing with generation:', clearErr?.message || clearErr);
      }

      // ── Step 1: Run AI signal generation on priority pairs in parallel ──
      console.log("[Signal Gen] Running AI analysis on priority pairs...");
      const aiResults = await Promise.allSettled(
        AI_PRIORITY_PAIRS.map(pair => generateAISignal(pair))
      );

      const aiSignals = aiResults
        .map((r, i) => r.status === "fulfilled" ? r.value : null)
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const aiPairsWithSignals = new Set(aiSignals.map(s => s.pair));
      console.log(`[Signal Gen] AI generated ${aiSignals.length} signals for priority pairs`);

      // ── Step 2: Run standard engine for all remaining pairs ──
      const forexData = await fetchAllForexData("pro", "1h", "5d");
      const engine = new SignalEngine();
      const standardSignals = engine.generateMultipleSignals(forexData)
        .filter(s => !aiPairsWithSignals.has(s.pair)); // skip pairs already covered by AI

      // ── Step 3: Save AI signals to database ──
      for (const signal of aiSignals) {
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
          reason: signal.aiReasoning,
          indicators: JSON.stringify(signal.indicators),
          isActive: "true",
          aiReasoning: signal.aiReasoning,
          aiConfidence: signal.aiConfidence.toString(),
          aiKeyFactors: JSON.stringify(signal.aiKeyFactors),
          aiInsight: signal.aiInsight,
          isAiGenerated: "true",
        });

        try {
          await upsertSignalPerformance({
            signalId: signal.id,
            currentPrice: signal.entryPrice.toString(),
            plDollars: "0",
            plPips: "0",
            plPercentage: "0",
          });
        } catch (perfErr: any) {
          console.warn('[Signal Gen] upsertSignalPerformance non-fatal:', String(perfErr?.message || perfErr).slice(0, 100));
        }
      }

      // ── Step 4: Save standard signals to database ──
      for (const signal of standardSignals) {
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
          isAiGenerated: "false",
        });

        try {
          await upsertSignalPerformance({
            signalId: signal.id,
            currentPrice: signal.entryPrice.toString(),
            plDollars: "0",
            plPips: "0",
            plPercentage: "0",
          });
        } catch (perfErr: any) {
          console.warn('[Signal Gen] upsertSignalPerformance non-fatal:', String(perfErr?.message || perfErr).slice(0, 100));
        }
      }

      // ── Step 5: Trigger learning from any resolved signals (non-blocking) ──
      checkAndLearnFromResolvedSignals().catch(e =>
        console.warn("[Signal Gen] Learning cycle error (non-critical):", e)
      );

      // Return combined list (AI signals first, then standard)
      const allSaved = [
        ...aiSignals.map(s => ({ ...s, isAiGenerated: true })),
        ...standardSignals.map(s => ({ ...s, isAiGenerated: false })),
      ];
      console.log(`[Signal Gen] Total: ${aiSignals.length} AI + ${standardSignals.length} standard = ${allSaved.length} signals`);
      return allSaved;
    }),

    // Generate signals for a specific pair
    generateForPair: publicProcedure
      .input(z.object({ pair: z.string() }))
      .mutation(async ({ input }) => {
        // Clear old signals for this pair (non-fatal)
        try {
          await clearAllSignals();
        } catch (clearErr: any) {
          console.warn('[Signal Gen] clearAllSignals failed (non-fatal):', clearErr?.message || clearErr);
        }

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

          // Create initial P/L tracking record (P/L = 0 at entry)
          await upsertSignalPerformance({
            signalId: signal.id,
            currentPrice: signal.entryPrice.toString(),
            plDollars: "0",
            plPips: "0",
            plPercentage: "0",
          });
        }

        return signals;
      }),

    // Get signal stats (count, last generated, streak)
    getStats: publicProcedure.query(async () => {
      return await getSignalStats();
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

    // Get active signals with real-time status
    getWithStatus: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        const signals = await getActiveSignals(input.limit);
        
        // Get unique pairs to fetch prices
        const uniquePairs = Array.from(new Set(signals.map(s => s.pair)));
        
        // Fetch real-time prices from Polygon
        const { getForexPrices, getSignalStatus, calculatePL } = await import("./polygonService");
        const priceMap = await getForexPrices(uniquePairs);

        return signals.map(s => {
          const currentPrice = priceMap.get(s.pair);
          let status: "target_hit" | "stop_loss_hit" | "active" = "active";
          let plDollars = 0;

          if (currentPrice) {
            status = getSignalStatus(s, currentPrice);
            const pl = calculatePL(s, currentPrice);
            plDollars = pl.plDollars;
          }

          return {
            ...s,
            indicators: JSON.parse(s.indicators),
            status,
            currentPrice,
            plDollars,
          };
        });
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

    // Get 24h hourly price history for a forex pair (used by PLChartOverlay sparkline)
    getPriceHistory: publicProcedure
      .input(z.object({ pair: z.string(), hours: z.number().optional().default(24) }))
      .query(async ({ input }) => {
        const { getPriceHistory } = await import('./polygonService');
        return getPriceHistory(input.pair, input.hours);
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

  // Admin-only operations
  // P/L Performance tracking
  pl: router({ calculatePL: publicProcedure
      .input(z.object({
        signalId: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Get signal from database
          const { getDb } = await import("./db");
          const { signals } = await import("../drizzle/schema");
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          const [signal] = await db
            .select()
            .from(signals)
            .where(eq(signals.id, input.signalId))
            .limit(1);

          if (!signal) {
            throw new Error("Signal not found");
          }

          // Fetch current price
          const { getCurrentPrice, calculatePL } = await import("./plCalculation");
          const currentPrice = await getCurrentPrice(signal.pair);

          if (!currentPrice) {
            throw new Error("Failed to fetch current price");
          }

          // Calculate P/L
          const plResult = calculatePL(signal.pair, {
            signalType: signal.signalType as "BUY" | "SELL",
            entryPrice: parseFloat(signal.entryPrice),
            currentPrice,
            stopLoss: parseFloat(signal.stopLoss),
            takeProfit: parseFloat(signal.takeProfit),
          });

          // Save to database
          const { upsertSignalPerformance } = await import("./db");
          await upsertSignalPerformance({
            signalId: signal.id,
            currentPrice: plResult.currentPrice.toString(),
            plDollars: plResult.plDollars.toString(),
            plPips: plResult.plPips.toString(),
            plPercentage: plResult.plPercentage.toString(),
          });

          return {
            success: true,
            data: plResult,
          };
        } catch (error) {
          console.error("[P/L] Calculation error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),

    getSignalPerformance: publicProcedure
      .input(z.object({
        signalId: z.string(),
      }))
      .query(async ({ input }) => {
        const { getSignalPerformance } = await import("./db");
        return await getSignalPerformance(input.signalId);
      }),

    getHistoricalPerformance: publicProcedure
      .input(z.object({
        days: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const { getHistoricalPerformance } = await import("./db");
        return await getHistoricalPerformance(input.days || 30);
      }),
  }),

  admin: router({
    // Get all payments
    getAllPayments: protectedProcedure.query(async ({ ctx }) => {
      // Check if user is admin
      const user = await getUser(ctx.user.id);
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }
      return await getAllPayments();
    }),

    // Get all users
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUser(ctx.user.id);
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }
      return await getAllUsers();
    }),

    // Manually grant access to a user
    grantAccess: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        tier: z.enum(["premium", "pro"]),
        plan: z.enum(["monthly", "yearly", "pro_monthly", "pro_yearly"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUser(ctx.user.id);
        if (!user || user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check if user exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        // Calculate expiry
        const now = new Date();
        const expiry = new Date(now);
        if (input.plan === "monthly" || input.plan === "pro_monthly") {
          expiry.setMonth(expiry.getMonth() + 1);
        } else {
          expiry.setFullYear(expiry.getFullYear() + 1);
        }

        if (existingUser) {
          // Update existing user
          await updateUserSubscription(existingUser.id, input.tier, expiry);
          return { success: true, message: "Access granted to existing user", userId: existingUser.id };
        } else {
          // Create new user
          const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.insert(users).values({
            id: userId,
            email: input.email,
            name: input.email.split('@')[0],
            loginMethod: "manual_grant",
            subscriptionTier: input.tier,
            subscriptionExpiry: expiry,
            role: "user",
          });
          return { success: true, message: "New user created with access", userId };
        }
      }),

    // Update user subscription
    updateSubscription: protectedProcedure
      .input(z.object({
        userId: z.string(),
        tier: z.enum(["free", "premium", "pro"]),
        expiryDate: z.string().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUser(ctx.user.id);
        if (!user || user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }

        const expiry = input.expiryDate ? new Date(input.expiryDate) : null;
        await updateUserSubscription(input.userId, input.tier, expiry);
        return { success: true, message: "Subscription updated" };
      }),

    // Send performance report to user (admin only)
    sendPerformanceReport: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        reportType: z.enum(["weekly", "monthly"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUser(ctx.user.id);
        if (!user || user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }

        const { sendWeeklyPerformanceReport, sendMonthlyPerformanceReport } = await import("./email");
        const { getHistoricalPerformance } = await import("./db");
        
        // Get performance data based on report type
        const days = input.reportType === "weekly" ? 7 : 30;
        const performanceData = await getHistoricalPerformance(days);
        
        // Get user name from email
        const targetUser = await getDb().then(db => 
          db?.select().from(users).where(eq(users.email, input.email)).limit(1)
        );
        const userName = targetUser?.[0]?.name || input.email.split('@')[0];
        
        // Send appropriate report
        const success = input.reportType === "weekly"
          ? await sendWeeklyPerformanceReport(input.email, userName, performanceData)
          : await sendMonthlyPerformanceReport(input.email, userName, performanceData);
        
        if (!success) {
          throw new Error("Failed to send performance report");
        }
        
        return { success: true, message: `${input.reportType} performance report sent to ${input.email}` };
      }),

    // Revoke access (set to free tier)
    revokeAccess: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUser(ctx.user.id);
        if (!user || user.role !== "admin") throw new Error("Unauthorized: Admin access required");
        await updateUserSubscription(input.userId, "free", null);
        return { success: true, message: "Access revoked — user set to free tier" };
      }),

    // Extend subscription by N months
    extendSubscription: protectedProcedure
      .input(z.object({
        userId: z.string(),
        months: z.number().min(1).max(24),
      }))
      .mutation(async ({ ctx, input }) => {
        const adminUser = await getUser(ctx.user.id);
        if (!adminUser || adminUser.role !== "admin") throw new Error("Unauthorized: Admin access required");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (!targetUser) throw new Error("User not found");
        const base = targetUser.subscriptionExpiry && new Date(targetUser.subscriptionExpiry) > new Date()
          ? new Date(targetUser.subscriptionExpiry)
          : new Date();
        base.setMonth(base.getMonth() + input.months);
        await updateUserSubscription(input.userId, targetUser.subscriptionTier || "premium", base);
        return { success: true, message: `Subscription extended by ${input.months} month(s)` };
      }),

    // Promote user to admin
    makeAdmin: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminUser = await getUser(ctx.user.id);
        if (!adminUser || adminUser.role !== "admin") throw new Error("Unauthorized: Admin access required");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(users).set({ role: "admin" }).where(eq(users.id, input.userId));
        return { success: true, message: "User promoted to admin" };
      }),

    // Remove admin role
    removeAdmin: protectedProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const adminUser = await getUser(ctx.user.id);
        if (!adminUser || adminUser.role !== "admin") throw new Error("Unauthorized: Admin access required");
        if (input.userId === ctx.user.id) throw new Error("Cannot remove your own admin role");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(users).set({ role: "user" }).where(eq(users.id, input.userId));
        return { success: true, message: "Admin role removed" };
      }),

    // Return raw HTML for a given email type so the admin can preview it in an iframe
    getEmailPreview: protectedProcedure
      .input(z.object({
        type: z.enum(["welcome_free", "welcome_premium", "referral_reward"]),
      }))
      .query(async ({ ctx, input }) => {
        const adminUser = await getUser(ctx.user.id);
        if (!adminUser || adminUser.role !== "admin") throw new Error("Unauthorized: Admin access required");
        const name = adminUser.name || "Admin";

        // Build the HTML without sending — replicate the template logic inline
        if (input.type === "welcome_free") {
          const upgradeUrl = "https://foxtrademaster.com/premium";
          return { html: `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;margin:0;padding:0;background:#f8fafc}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}.header{background:linear-gradient(135deg,#f97316 0%,#ef4444 100%);padding:36px 32px;text-align:center}.header h1{color:#fff;margin:0;font-size:28px;font-weight:900}.header p{color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px}.body{padding:32px}.greeting{font-size:18px;font-weight:700;color:#1e293b;margin-bottom:12px}.text{color:#475569;font-size:15px;line-height:1.6;margin-bottom:20px}.feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 0}.feature-item{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px}.feature-item .icon{font-size:20px;margin-bottom:6px}.feature-item .title{font-weight:700;color:#c2410c;font-size:13px}.feature-item .desc{color:#78350f;font-size:12px;margin-top:2px}.cta-section{background:linear-gradient(135deg,#fef3c7 0%,#fff7ed 100%);border:1px solid #fde68a;border-radius:10px;padding:24px;text-align:center;margin:24px 0}.cta-section h3{color:#92400e;font-size:16px;font-weight:700;margin:0 0 8px}.cta-section p{color:#78350f;font-size:13px;margin:0 0 16px}.cta-btn{display:inline-block;background:linear-gradient(135deg,#f97316 0%,#ef4444 100%);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px}.footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}.footer p{color:#94a3b8;font-size:12px;margin:4px 0}</style></head><body><div class="container"><div class="header"><div style="font-size:40px;margin-bottom:8px">🦊</div><h1>FOX TRADE MASTER™</h1><p>Welcome to AI-Powered Forex Trading Signals</p></div><div class="body"><div class="greeting">Welcome aboard, ${name}! 🎉</div><p class="text">You now have access to <strong>FOX TRADE MASTER™ Free</strong> — your gateway to professional-grade forex trading signals powered by AI.</p><div class="feature-grid"><div class="feature-item"><div class="icon">📊</div><div class="title">EUR/USD Signals</div><div class="desc">Live AI-powered signals on the world's most traded pair</div></div><div class="feature-item"><div class="icon">🧠</div><div class="title">AI Brain</div><div class="desc">See the AI's reasoning behind every signal</div></div><div class="feature-item"><div class="icon">📈</div><div class="title">Signal History</div><div class="desc">Track past performance and win rates</div></div><div class="feature-item"><div class="icon">🎯</div><div class="title">Entry &amp; Exit Levels</div><div class="desc">Precise entry price, stop loss, and take profit</div></div></div><div class="cta-section"><h3>🚀 Unlock 10–156 Currency Pairs</h3><p>Upgrade to Premium or Pro to access more pairs, real-time alerts, trade journal, analytics, and full AI signal reasoning.</p><a href="${upgradeUrl}" class="cta-btn">Upgrade Now — From $99.95/mo</a></div><p class="text" style="font-size:13px;color:#94a3b8">Questions? Reply to this email or visit <a href="https://foxtrademaster.com" style="color:#f97316">foxtrademaster.com</a>. Happy trading!</p></div><div class="footer"><p>© ${new Date().getFullYear()} FOX TRADE MASTER™. All rights reserved.</p><p>You received this email because you signed up for a free account.</p></div></div></body></html>` };
        } else if (input.type === "welcome_premium") {
          return { html: `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#1e3a8a 0%,#ea580c 100%);color:#fff;padding:30px;text-align:center;border-radius:8px 8px 0 0}.header h1{margin:0;font-size:28px}.content{background:#f9fafb;padding:30px;border-radius:0 0 8px 8px}.button{display:inline-block;background:#ea580c;color:#fff;padding:12px 30px;text-decoration:none;border-radius:6px;margin:20px 0;font-weight:700}.features{background:#fff;padding:20px;border-radius:6px;margin:20px 0}.features ul{list-style:none;padding:0}.features li{padding:8px 0;border-bottom:1px solid #e5e7eb}.features li:before{content:"✓ ";color:#ea580c;font-weight:700;margin-right:8px}.footer{text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:14px}</style></head><body><div class="header"><h1>🦊 Welcome to FOX TRADE MASTER!</h1></div><div class="content"><h2>Hi ${name},</h2><p>Thank you for subscribing to <strong>FOX TRADE MASTER Premium</strong>! You now have full access to all 10 currency pairs and our advanced trading signals.</p><p><strong>Your Subscription:</strong> Premium Monthly ($99.95/month)</p><div class="features"><h3>What You Get:</h3><ul><li>All 10 currency pairs unlocked</li><li>4 advanced trading strategies</li><li>Real-time signal generation every 15 minutes</li><li>Audio &amp; visual alerts for high-priority signals</li><li>Market hours awareness and session tracking</li><li>Entry price, stop loss, and take profit for every signal</li><li>Signal strength ratings (1-10 scale)</li></ul></div><h3>🚀 Get Started Now</h3><p style="text-align:center"><a href="https://foxtrademaster.com" class="button">Access FOX TRADE MASTER</a></p><p><strong>Need Help?</strong><br>Reply to this email or contact us at <a href="mailto:support@foxtrademaster.com">support@foxtrademaster.com</a></p><p>Happy trading!<br><strong>The FOX TRADE MASTER Team</strong> 🦊</p></div><div class="footer"><p><strong>FOX TRADE MASTER</strong><br>Advanced Forex Trading Signals<br><a href="https://foxtrademaster.com">FoxTradeMaster.com</a></p></div></body></html>` };
        } else {
          return { html: `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.wrapper{max-width:600px;margin:0 auto;padding:32px 16px}.card{background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155}.header{background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);padding:32px 32px 24px;text-align:center}.header h1{margin:0;color:#fff;font-size:26px;font-weight:800}.header p{margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px}.reward-badge{background:#0f172a;border-radius:12px;margin:24px 32px;padding:20px;text-align:center;border:2px solid #f97316}.reward-badge .amount{font-size:48px;font-weight:900;color:#f97316;line-height:1}.reward-badge .label{font-size:14px;color:#94a3b8;margin-top:4px}.body{padding:24px 32px}.text{color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 16px}.highlight{color:#f97316;font-weight:700}.cta-btn{display:block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;text-decoration:none;text-align:center;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px;margin:24px 0}.footer{padding:16px 32px 24px;text-align:center;color:#475569;font-size:12px}.divider{height:1px;background:#334155;margin:0 32px}</style></head><body><div class="wrapper"><div class="card"><div class="header"><h1>🦊 FOX TRADE MASTER™</h1><p>Referral Reward — Your friend just upgraded!</p></div><div class="reward-badge"><div class="amount">1</div><div class="label">FREE MONTH ADDED TO YOUR ACCOUNT</div></div><div class="body"><p class="text">Hey <span class="highlight">${name}</span>,</p><p class="text">Great news — your friend <span class="highlight">Test Friend</span> just upgraded to a paid plan on FOX TRADE MASTER™! As a thank-you for spreading the word, we've automatically added <span class="highlight">1 free month</span> to your subscription.</p><p class="text">No action needed — your account has already been updated. Keep sharing your referral link to earn more free months every time a friend upgrades.</p><a href="https://foxtrademaster.com" class="cta-btn">View My Dashboard →</a></div><div class="divider"></div><div class="footer"><p>© ${new Date().getFullYear()} FOX TRADE MASTER™. All rights reserved.</p></div></div></div></body></html>` };
        }
      }),

    // Send a test email preview to the admin's own email address
    sendTestEmail: protectedProcedure
      .input(z.object({
        type: z.enum(["welcome_free", "welcome_premium", "referral_reward"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const adminUser = await getUser(ctx.user.id);
        if (!adminUser || adminUser.role !== "admin") throw new Error("Unauthorized: Admin access required");
        const toEmail = adminUser.email;
        if (!toEmail) throw new Error("Admin account has no email address");
        const toName = adminUser.name || "Admin";

        const { sendFreeWelcomeEmail, sendWelcomeEmail, sendReferralRewardEmail } = await import("./email");

        if (input.type === "welcome_free") {
          await sendFreeWelcomeEmail(toEmail, toName);
        } else if (input.type === "welcome_premium") {
          await sendWelcomeEmail(toEmail, toName, "monthly");
        } else if (input.type === "referral_reward") {
          await sendReferralRewardEmail(toEmail, toName, "Test Friend", 1);
        }

        return { success: true, message: `Test "${input.type}" email sent to ${toEmail}` };
      }),
  }),
  // Alert preferences and historyy
  alerts: router({
    // Get user's alert preferences
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const { getUserAlertPreferences } = await import("./db");
      return await getUserAlertPreferences(ctx.user.id);
    }),

    // Create new alert preference
    createPreference: protectedProcedure
      .input(z.object({
        alertType: z.enum(["profit_target", "stop_loss", "percent_gain", "percent_loss"]),
        threshold: z.string().optional(),
        channel: z.enum(["browser", "email", "both"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createAlertPreference } = await import("./db");
        const id = await createAlertPreference({
          userId: ctx.user.id,
          ...input,
        });
        return { success: !!id, id };
      }),

    // Update alert preference
    updatePreference: protectedProcedure
      .input(z.object({
        id: z.string(),
        threshold: z.string().optional(),
        channel: z.enum(["browser", "email", "both"]).optional(),
        isEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateAlertPreference } = await import("./db");
        const success = await updateAlertPreference(input.id, {
          threshold: input.threshold,
          channel: input.channel,
          isEnabled: input.isEnabled,
        });
        return { success };
      }),

    // Delete alert preference
    deletePreference: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteAlertPreference } = await import("./db");
        const success = await deleteAlertPreference(input.id);
        return { success };
      }),

    // Get alert history
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const { getUserAlertHistory } = await import("./db");
        return await getUserAlertHistory(ctx.user.id, input.limit);
      }),

    // Test alert (send test notification)
    testAlert: protectedProcedure
      .input(z.object({
        channel: z.enum(["browser", "email", "both"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { sendAlertEmail } = await import("./alertService");
        const { sendPushNotification } = await import("./pushNotificationService");
        const user = await getUser(ctx.user.id);
        
        if (!user || !user.email) {
          throw new Error("User email not found");
        }

        if (input.channel === "email" || input.channel === "both") {
          await sendAlertEmail({
            email: user.email,
            name: user.name || "Trader",
            pair: "EUR/USD",
            signalType: "BUY",
            alertType: "profit_target",
            plDollars: 125.50,
            plPercentage: 2.5,
            currentPrice: 1.0850,
          });
        }

        if (input.channel === "browser" || input.channel === "both") {
          await sendPushNotification(ctx.user.id, {
            title: "🎯 Test Alert - FOX TRADE MASTER™",
            body: "EUR/USD BUY signal hit profit target: +$125.50 (+2.5%)",
            tag: "test-alert",
            requireInteraction: false,
          });
        }

        return { 
          success: true, 
          message: "Test alert sent successfully",
          channel: input.channel,
        };
      }),

    // Subscribe to push notifications
    subscribePush: protectedProcedure
      .input(z.object({
        subscription: z.object({
          endpoint: z.string(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
        }),
        deviceName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createPushSubscription } = await import("./db");
        const id = await createPushSubscription({
          userId: ctx.user.id,
          endpoint: input.subscription.endpoint,
          p256dh: input.subscription.keys.p256dh,
          auth: input.subscription.keys.auth,
          userAgent: input.deviceName,
        });
        return { success: !!id, id };
      }),

    // Unsubscribe from push notifications
    unsubscribePush: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { deletePushSubscription } = await import("./db");
        const success = await deletePushSubscription(input.endpoint);
        return { success };
      }),

    // Get VAPID public key for push subscription
    getVapidPublicKey: publicProcedure.query(() => {
      const { getVapidPublicKey } = require("./pushNotificationService");
      return { publicKey: getVapidPublicKey() };
    }),
  }),

  // Trade Journal - Manual trade tracking
  journal: router({
    // Create new trade entry
    createTrade: protectedProcedure
      .input(z.object({
        signalId: z.string().optional(),
        pair: z.string(),
        tradeType: z.enum(["BUY", "SELL"]),
        entryPrice: z.string(),
        entryDate: z.string(), // ISO date string
        positionSize: z.string().optional(),
        notes: z.string().optional(),
        stopLoss: z.string().optional(),
        takeProfit: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createUserTrade } = await import("./db");
        const id = await createUserTrade({
          userId: ctx.user.id,
          signalId: input.signalId,
          pair: input.pair,
          tradeType: input.tradeType,
          entryPrice: input.entryPrice,
          entryDate: new Date(input.entryDate),
          positionSize: input.positionSize,
          notes: input.notes,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
        });
        return { success: !!id, id };
      }),

    // Close a trade
    closeTrade: protectedProcedure
      .input(z.object({
        tradeId: z.string(),
        exitPrice: z.string(),
        exitDate: z.string(), // ISO date string
      }))
      .mutation(async ({ input }) => {
        const { closeUserTrade } = await import("./db");
        const success = await closeUserTrade(
          input.tradeId,
          input.exitPrice,
          new Date(input.exitDate)
        );
        return { success };
      }),

    // Get user's trades
    getTrades: protectedProcedure
      .input(z.object({
        status: z.enum(["entered", "closed"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserTrades } = await import("./db");
        return await getUserTrades(ctx.user.id, input.status);
      }),

    // Get trade statistics
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTradeStats } = await import("./db");
      return await getUserTradeStats(ctx.user.id);
    }),

    // Update trade details
    updateTrade: protectedProcedure
      .input(z.object({
        tradeId: z.string(),
        notes: z.string().optional(),
        stopLoss: z.string().optional(),
        takeProfit: z.string().optional(),
        positionSize: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateUserTrade } = await import("./db");
        const success = await updateUserTrade(input.tradeId, {
          notes: input.notes,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          positionSize: input.positionSize,
        });
        return { success };
      }),

    // Delete a trade
    deleteTrade: protectedProcedure
      .input(z.object({ tradeId: z.string() }))
      .mutation(async ({ input }) => {
        const { deleteUserTrade } = await import("./db");
        const success = await deleteUserTrade(input.tradeId);
        return { success };
      }),
  }),

  // Analytics router
  analytics: router({
    // Get win rate by currency pair
    getWinRateByPair: protectedProcedure
      .input(z.object({ days: z.number().optional().default(30) }))
      .query(async ({ input }) => {
        return await getWinRateByPair(input.days);
      }),

    // Get performance by timeframe
    getPerformanceByTimeframe: protectedProcedure
      .input(z.object({ days: z.number().optional().default(30) }))
      .query(async ({ input }) => {
        return await getPerformanceByTimeframe(input.days);
      }),

    // Get strategy performance comparison
    getStrategyPerformance: protectedProcedure
      .input(z.object({ days: z.number().optional().default(30) }))
      .query(async ({ input }) => {
        return await getStrategyPerformance(input.days);
      }),

    // Get daily P/L trend
    getDailyPLTrend: protectedProcedure
      .input(z.object({ days: z.number().optional().default(30) }))
      .query(async ({ input }) => {
        return await getDailyPLTrend(input.days);
      }),
  }),

  // AI Brain router
  ai: aiRouter,
  referral: referralRouter,

  // Signal Sharing router
  sharing: router({
    // Create a shareable signal link
    createShareLink: protectedProcedure
      .input(z.object({ signalId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const result = await createSharedSignal(input.signalId, ctx.user.id);
        if (!result) {
          throw new Error("Failed to create share link");
        }
        return result;
      }),

    // Get shared signal by share ID (public)
    getSharedSignal: publicProcedure
      .input(z.object({ shareId: z.string() }))
      .query(async ({ input }) => {
        return await getSharedSignal(input.shareId);
      }),

    // Get user's shared signals
    getMySharedSignals: protectedProcedure
      .query(async ({ ctx }) => {
        return await getUserSharedSignals(ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
