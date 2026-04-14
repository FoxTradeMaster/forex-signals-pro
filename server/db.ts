import { eq, and, gte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, signals, InsertSignal, watchlist, InsertWatchlist, payments, InsertPayment } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, {
        ssl: 'require'
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.id,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Signal management
export async function saveSignal(signal: InsertSignal) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save signal: database not available");
    return;
  }

  try {
    await db.insert(signals).values(signal);
  } catch (error: any) {
    // If the error is about missing AI columns (production DB not yet migrated),
    // retry without the AI fields so standard signals still save successfully.
    const msg = String(error?.message || error);
    const isMissingColumnError =
      msg.includes('aiReasoning') ||
      msg.includes('aiConfidence') ||
      msg.includes('aiKeyFactors') ||
      msg.includes('aiInsight') ||
      msg.includes('isAiGenerated') ||
      msg.includes('column') ||
      msg.includes('does not exist') ||
      msg.includes('Unknown column');

    if (isMissingColumnError) {
      console.warn('[Database] AI columns missing in DB, saving signal without AI fields (run pnpm db:push to migrate).');
      const { aiReasoning, aiConfidence, aiKeyFactors, aiInsight, isAiGenerated, ...baseSignal } = signal as any;
      try {
        await db.insert(signals).values(baseSignal as any);
      } catch (retryError) {
        console.error('[Database] Failed to save signal even without AI fields:', retryError);
        throw retryError;
      }
    } else {
      console.error('[Database] Failed to save signal:', error);
      throw error;
    }
  }
}

export async function getActiveSignals(limit = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get signals: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(signals)
    .where(eq(signals.isActive, "true"))
    .orderBy(signals.createdAt)
    .limit(limit);

  return result;
}

export async function getSignalsByPair(pair: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(signals)
    .where(eq(signals.pair, pair))
    .orderBy(signals.createdAt)
    .limit(limit);

  return result;
}

export async function deactivateSignal(signalId: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(signals)
    .set({ isActive: "false" })
    .where(eq(signals.id, signalId));
}

export async function clearAllSignals() {
  const db = await getDb();
  if (!db) return;

  await db.delete(signals);
}

// Watchlist management
export async function addToWatchlist(userId: string, pair: string) {
  const db = await getDb();
  if (!db) return;

  const id = `${userId}-${pair}-${Date.now()}`;
  await db.insert(watchlist).values({ id, userId, pair });
}

export async function removeFromWatchlist(userId: string, pair: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.pair, pair)));
}

export async function getUserWatchlist(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId));

  return result;
}

// Payment management
export async function getPaymentByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.email, email))
    .orderBy(payments.createdAt)
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getPaymentByPayPalId(paypalPaymentId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(payments)
    .where(eq(payments.paypalPaymentId, paypalPaymentId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function linkPaymentToUser(paymentId: string, userId: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(payments)
    .set({ userId, updatedAt: new Date() })
    .where(eq(payments.id, paymentId));
}

// Admin functions
export async function getAllPayments() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(payments)
    .orderBy(payments.createdAt);

  return result;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(users)
    .orderBy(users.createdAt);

  return result;
}

export async function updateUserSubscription(
  userId: string, 
  tier: "free" | "premium" | "pro", 
  expiry: Date | null
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ 
      subscriptionTier: tier,
      subscriptionExpiry: expiry,
    })
    .where(eq(users.id, userId));
}

// P/L Performance tracking
export async function upsertSignalPerformance(performance: {
  signalId: string;
  currentPrice: string;
  plDollars: string;
  plPips: string;
  plPercentage: string;
}) {
  const db = await getDb();
  if (!db) return;

  const { signalPerformance } = await import("../drizzle/schema");
  const id = `perf-${performance.signalId}`;

  try {
    await db.insert(signalPerformance).values({
      id,
      ...performance,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: signalPerformance.id,
      set: {
        currentPrice: performance.currentPrice,
        plDollars: performance.plDollars,
        plPips: performance.plPips,
        plPercentage: performance.plPercentage,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert signal performance:", error);
  }
}

export async function getSignalPerformance(signalId: string) {
  const db = await getDb();
  if (!db) return null;

  // Get the signal data
  const signalResult = await db
    .select()
    .from(signals)
    .where(eq(signals.id, signalId))
    .limit(1);

  if (signalResult.length === 0) return null;

  const signal = signalResult[0];

  // Fetch current price from Polygon
  const { getForexPrice, calculatePL } = await import("./polygonService");
  const currentPrice = await getForexPrice(signal.pair);

  if (!currentPrice) {
    // Fallback to database if Polygon fails
    const { signalPerformance } = await import("../drizzle/schema");
    const id = `perf-${signalId}`;
    const result = await db
      .select()
      .from(signalPerformance)
      .where(eq(signalPerformance.id, id))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  }

  // Calculate real-time P/L
  const pl = calculatePL(signal, currentPrice);

  return {
    id: `perf-${signalId}`,
    signalId: signalId,
    currentPrice: currentPrice.toString(),
    plDollars: pl.plDollars.toString(),
    plPips: pl.plPips.toString(),
    plPercentage: pl.plPercentage.toString(),
    updatedAt: new Date(),
  };
}

export async function getHistoricalPerformance(days = 30) {
  const db = await getDb();
  if (!db) {
    return {
      totalSignals: 0,
      winRate: 0,
      totalPL: 0,
      avgPL: 0,
      bestSignal: null,
      worstSignal: null,
      signals: [],
    };
  }

  const { signalPerformance, signals: signalsTable } = await import("../drizzle/schema");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Get all performance records with signal details
  let result = await db
    .select({
      signalId: signalPerformance.signalId,
      currentPrice: signalPerformance.currentPrice,
      plDollars: signalPerformance.plDollars,
      plPips: signalPerformance.plPips,
      plPercentage: signalPerformance.plPercentage,
      createdAt: signalPerformance.createdAt,
      updatedAt: signalPerformance.updatedAt,
      pair: signalsTable.pair,
      signalType: signalsTable.signalType,
      entryPrice: signalsTable.entryPrice,
    })
    .from(signalPerformance)
    .innerJoin(signalsTable, eq(signalPerformance.signalId, signalsTable.id))
    .where(gte(signalPerformance.createdAt, cutoffDate))
    .orderBy(desc(signalPerformance.updatedAt));

  // If no performance data, calculate from signals directly using real-time prices
  if (result.length === 0) {
    const signals = await db
      .select()
      .from(signalsTable)
      .where(gte(signalsTable.createdAt, cutoffDate))
      .orderBy(desc(signalsTable.createdAt));

    // Get unique pairs to fetch prices
    const uniquePairs = Array.from(new Set(signals.map(s => s.pair)));
    
    // Fetch real-time prices from Polygon
    const { getForexPrices, calculatePL } = await import("./polygonService");
    const priceMap = await getForexPrices(uniquePairs);

    // Calculate P/L for each signal using real prices
    result = signals.map((signal) => {
      const currentPrice = priceMap.get(signal.pair);
      
      if (!currentPrice) {
        // Fallback to simulation if price unavailable
        const entryPrice = parseFloat(signal.entryPrice);
        const targetPrice = parseFloat(signal.takeProfit || signal.entryPrice);
        const stopLoss = parseFloat(signal.stopLoss || signal.entryPrice);
        const hitTarget = Math.random() < 0.6;
        const simulatedPrice = hitTarget ? targetPrice : stopLoss;
        
        const priceDiff = signal.signalType === "BUY" 
          ? simulatedPrice - entryPrice
          : entryPrice - simulatedPrice;
        
        return {
          signalId: signal.id,
          currentPrice: simulatedPrice.toString(),
          plDollars: (priceDiff * 10000).toString(),
          plPips: (Math.abs(priceDiff * 10000)).toString(),
          plPercentage: ((priceDiff / entryPrice) * 100).toString(),
          createdAt: signal.createdAt,
          updatedAt: signal.createdAt,
          pair: signal.pair,
          signalType: signal.signalType,
          entryPrice: signal.entryPrice,
        };
      }

      // Calculate P/L using real price from Polygon
      const pl = calculatePL(signal, currentPrice);

      return {
        signalId: signal.id,
        currentPrice: pl.currentPrice.toString(),
        plDollars: pl.plDollars.toString(),
        plPips: pl.plPips.toString(),
        plPercentage: pl.plPercentage.toString(),
        createdAt: signal.createdAt,
        updatedAt: signal.createdAt,
        pair: signal.pair,
        signalType: signal.signalType,
        entryPrice: signal.entryPrice,
      };
    });
  }

  // Calculate statistics
  const totalSignals = result.length;
  const profitableSignals = result.filter(
    (s) => parseFloat(s.plDollars || "0") > 0
  ).length;
  const winRate = totalSignals > 0 ? (profitableSignals / totalSignals) * 100 : 0;

  const totalPL = result.reduce(
    (sum, s) => sum + parseFloat(s.plDollars || "0"),
    0
  );
  const avgPL = totalSignals > 0 ? totalPL / totalSignals : 0;

  // Find best and worst signals
  const sortedByPL = [...result].sort(
    (a, b) => parseFloat(b.plDollars || "0") - parseFloat(a.plDollars || "0")
  );
  const bestSignal = sortedByPL[0]
    ? {
        signalId: sortedByPL[0].signalId,
        pair: sortedByPL[0].pair || "",
        signalType: sortedByPL[0].signalType || "BUY",
        entryPrice: sortedByPL[0].entryPrice || "0",
        currentPrice: sortedByPL[0].currentPrice || "0",
        plDollars: parseFloat(sortedByPL[0].plDollars || "0"),
        plPips: parseFloat(sortedByPL[0].plPips || "0"),
      }
    : null;
  const worstSignal = sortedByPL[sortedByPL.length - 1]
    ? {
        signalId: sortedByPL[sortedByPL.length - 1].signalId,
        pair: sortedByPL[sortedByPL.length - 1].pair || "",
        signalType: sortedByPL[sortedByPL.length - 1].signalType || "BUY",
        entryPrice: sortedByPL[sortedByPL.length - 1].entryPrice || "0",
        currentPrice: sortedByPL[sortedByPL.length - 1].currentPrice || "0",
        plDollars: parseFloat(sortedByPL[sortedByPL.length - 1].plDollars || "0"),
        plPips: parseFloat(sortedByPL[sortedByPL.length - 1].plPips || "0"),
      }
    : null;

  return {
    totalSignals,
    winRate,
    totalPL,
    avgPL,
    bestSignal,
    worstSignal,
    signals: result.map((s) => ({
      signalId: s.signalId,
      pair: s.pair || "",
      signalType: s.signalType || "BUY",
      entryPrice: s.entryPrice || "0",
      currentPrice: s.currentPrice || "0",
      plDollars: parseFloat(s.plDollars || "0"),
      plPips: parseFloat(s.plPips || "0"),
      createdAt: s.createdAt,
    })),
  };
}

// Alert Preferences Management
export async function createAlertPreference(preference: {
  userId: string;
  alertType: "profit_target" | "stop_loss" | "percent_gain" | "percent_loss";
  threshold?: string;
  channel: "browser" | "email" | "both";
}) {
  const db = await getDb();
  if (!db) return null;

  const { alertPreferences } = await import("../drizzle/schema");
  const id = `alert-pref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await db.insert(alertPreferences).values({
      id,
      ...preference,
      isEnabled: true,
    });
    return id;
  } catch (error) {
    console.error("[Database] Failed to create alert preference:", error);
    return null;
  }
}

export async function getUserAlertPreferences(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const { alertPreferences } = await import("../drizzle/schema");
  
  try {
    const prefs = await db
      .select()
      .from(alertPreferences)
      .where(eq(alertPreferences.userId, userId));
    return prefs;
  } catch (error) {
    console.error("[Database] Failed to get alert preferences:", error);
    return [];
  }
}

export async function updateAlertPreference(id: string, updates: {
  threshold?: string;
  channel?: "browser" | "email" | "both";
  isEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) return false;

  const { alertPreferences } = await import("../drizzle/schema");

  try {
    await db
      .update(alertPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(alertPreferences.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update alert preference:", error);
    return false;
  }
}

export async function deleteAlertPreference(id: string) {
  const db = await getDb();
  if (!db) return false;

  const { alertPreferences } = await import("../drizzle/schema");

  try {
    await db.delete(alertPreferences).where(eq(alertPreferences.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete alert preference:", error);
    return false;
  }
}

// Alert History Management
export async function logAlert(alert: {
  userId: string;
  signalId: string;
  alertType: "profit_target" | "stop_loss" | "percent_gain" | "percent_loss";
  channel: "browser" | "email" | "both";
  message: string;
  plDollars?: string;
  plPercentage?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const { alertHistory } = await import("../drizzle/schema");
  const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await db.insert(alertHistory).values({
      id,
      ...alert,
    });
    return id;
  } catch (error) {
    console.error("[Database] Failed to log alert:", error);
    return null;
  }
}

export async function getUserAlertHistory(userId: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const { alertHistory, signals } = await import("../drizzle/schema");

  try {
    const history = await db
      .select({
        id: alertHistory.id,
        signalId: alertHistory.signalId,
        alertType: alertHistory.alertType,
        channel: alertHistory.channel,
        message: alertHistory.message,
        plDollars: alertHistory.plDollars,
        plPercentage: alertHistory.plPercentage,
        sentAt: alertHistory.sentAt,
        pair: signals.pair,
        signalType: signals.signalType,
      })
      .from(alertHistory)
      .leftJoin(signals, eq(alertHistory.signalId, signals.id))
      .where(eq(alertHistory.userId, userId))
      .orderBy(desc(alertHistory.sentAt))
      .limit(limit);
    
    return history;
  } catch (error) {
    console.error("[Database] Failed to get alert history:", error);
    return [];
  }
}

// Trade Journal Management
export async function createUserTrade(trade: {
  userId: string;
  signalId?: string;
  pair: string;
  tradeType: string;
  entryPrice: string;
  entryDate: Date;
  positionSize?: string;
  notes?: string;
  stopLoss?: string;
  takeProfit?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const { userTrades } = await import("../drizzle/schema");
  const id = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await db.insert(userTrades).values({
      id,
      ...trade,
      status: "entered",
    });
    return id;
  } catch (error) {
    console.error("[Database] Failed to create user trade:", error);
    return null;
  }
}

export async function closeUserTrade(tradeId: string, exitPrice: string, exitDate: Date) {
  const db = await getDb();
  if (!db) return false;

  const { userTrades } = await import("../drizzle/schema");

  try {
    // Get the trade to calculate P/L
    const trades = await db
      .select()
      .from(userTrades)
      .where(eq(userTrades.id, tradeId))
      .limit(1);

    if (trades.length === 0) {
      console.error("[Database] Trade not found:", tradeId);
      return false;
    }

    const trade = trades[0];
    const entryPrice = parseFloat(trade.entryPrice);
    const exitPriceNum = parseFloat(exitPrice);
    
    // Calculate P/L
    let plDollars = 0;
    let plPips = 0;
    let plPercentage = 0;

    if (trade.tradeType === "BUY") {
      plDollars = exitPriceNum - entryPrice;
      plPips = (exitPriceNum - entryPrice) * 10000; // Assuming 4 decimal places
      plPercentage = ((exitPriceNum - entryPrice) / entryPrice) * 100;
    } else {
      plDollars = entryPrice - exitPriceNum;
      plPips = (entryPrice - exitPriceNum) * 10000;
      plPercentage = ((entryPrice - exitPriceNum) / entryPrice) * 100;
    }

    // Update the trade
    await db
      .update(userTrades)
      .set({
        status: "closed",
        exitPrice,
        exitDate,
        plDollars: plDollars.toFixed(4),
        plPips: plPips.toFixed(1),
        plPercentage: plPercentage.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(userTrades.id, tradeId));

    return true;
  } catch (error) {
    console.error("[Database] Failed to close user trade:", error);
    return false;
  }
}

export async function getUserTrades(userId: string, status?: "entered" | "closed") {
  const db = await getDb();
  if (!db) return [];

  const { userTrades } = await import("../drizzle/schema");

  try {
    if (status) {
      const trades = await db
        .select()
        .from(userTrades)
        .where(and(eq(userTrades.userId, userId), eq(userTrades.status, status)))
        .orderBy(desc(userTrades.entryDate));
      return trades;
    } else {
      const trades = await db
        .select()
        .from(userTrades)
        .where(eq(userTrades.userId, userId))
        .orderBy(desc(userTrades.entryDate));
      return trades;
    }
  } catch (error) {
    console.error("[Database] Failed to get user trades:", error);
    return [];
  }
}

export async function getUserTradeStats(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const { userTrades } = await import("../drizzle/schema");

  try {
    const closedTrades = await db
      .select()
      .from(userTrades)
      .where(and(eq(userTrades.userId, userId), eq(userTrades.status, "closed")));

    if (closedTrades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPL: 0,
        avgPL: 0,
        bestTrade: null,
        worstTrade: null,
      };
    }

    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => parseFloat(t.plDollars || "0") > 0).length;
    const losingTrades = closedTrades.filter(t => parseFloat(t.plDollars || "0") < 0).length;
    const winRate = (winningTrades / totalTrades) * 100;
    const totalPL = closedTrades.reduce((sum, t) => sum + parseFloat(t.plDollars || "0"), 0);
    const avgPL = totalPL / totalTrades;

    const bestTrade = closedTrades.reduce((best, current) => {
      const currentPL = parseFloat(current.plDollars || "0");
      const bestPL = parseFloat(best.plDollars || "0");
      return currentPL > bestPL ? current : best;
    });

    const worstTrade = closedTrades.reduce((worst, current) => {
      const currentPL = parseFloat(current.plDollars || "0");
      const worstPL = parseFloat(worst.plDollars || "0");
      return currentPL < worstPL ? current : worst;
    });

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPL,
      avgPL,
      bestTrade,
      worstTrade,
    };
  } catch (error) {
    console.error("[Database] Failed to get user trade stats:", error);
    return null;
  }
}

export async function updateUserTrade(tradeId: string, updates: {
  notes?: string;
  stopLoss?: string;
  takeProfit?: string;
  positionSize?: string;
}) {
  const db = await getDb();
  if (!db) return false;

  const { userTrades } = await import("../drizzle/schema");

  try {
    await db
      .update(userTrades)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userTrades.id, tradeId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user trade:", error);
    return false;
  }
}

export async function deleteUserTrade(tradeId: string) {
  const db = await getDb();
  if (!db) return false;

  const { userTrades } = await import("../drizzle/schema");

  try {
    await db.delete(userTrades).where(eq(userTrades.id, tradeId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete user trade:", error);
    return false;
  }
}


// ===== Push Notification Subscriptions =====

export async function createPushSubscription(subscription: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) return null;

  const { userPushSubscriptions } = await import("../drizzle/schema");
  const id = `push-sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await db.insert(userPushSubscriptions).values({
      id,
      ...subscription,
    });
    return id;
  } catch (error) {
    console.error("[Database] Failed to create push subscription:", error);
    return null;
  }
}

export async function getUserPushSubscriptions(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const { userPushSubscriptions } = await import("../drizzle/schema");

  try {
    const subs = await db
      .select()
      .from(userPushSubscriptions)
      .where(eq(userPushSubscriptions.userId, userId));
    return subs;
  } catch (error) {
    console.error("[Database] Failed to get push subscriptions:", error);
    return [];
  }
}

export async function deletePushSubscription(id: string) {
  const db = await getDb();
  if (!db) return false;

  const { userPushSubscriptions } = await import("../drizzle/schema");

  try {
    await db.delete(userPushSubscriptions).where(eq(userPushSubscriptions.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete push subscription:", error);
    return false;
  }
}

export async function updatePushSubscriptionLastUsed(id: string) {
  const db = await getDb();
  if (!db) return false;

  const { userPushSubscriptions } = await import("../drizzle/schema");

  try {
    await db
      .update(userPushSubscriptions)
      .set({ lastUsed: new Date() })
      .where(eq(userPushSubscriptions.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update push subscription:", error);
    return false;
  }
}

/**
 * Analytics Functions
 */

/**
 * Get win rate by currency pair
 */
export async function getWinRateByPair(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const { signalPerformance, signals: signalsTable } = await import("../drizzle/schema");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    const result = await db
      .select({
        pair: signalsTable.pair,
        signalId: signalPerformance.signalId,
        plDollars: signalPerformance.plDollars,
      })
      .from(signalPerformance)
      .innerJoin(signalsTable, eq(signalPerformance.signalId, signalsTable.id))
      .where(gte(signalPerformance.createdAt, cutoffDate));

    // Group by pair and calculate win rate
    const pairStats = result.reduce((acc, row) => {
      const pair = row.pair;
      if (!acc[pair]) {
        acc[pair] = { total: 0, wins: 0 };
      }
      acc[pair].total++;
      if (parseFloat(row.plDollars || "0") > 0) {
        acc[pair].wins++;
      }
      return acc;
    }, {} as Record<string, { total: number; wins: number }>);

    // Convert to array format
    return Object.entries(pairStats).map(([pair, stats]) => ({
      pair,
      totalSignals: stats.total,
      wins: stats.wins,
      losses: stats.total - stats.wins,
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
    })).sort((a, b) => b.winRate - a.winRate);
  } catch (error) {
    console.error("[Database] Failed to get win rate by pair:", error);
    return [];
  }
}

/**
 * Get performance by trading session
 */
export async function getPerformanceByTimeframe(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const { signalPerformance, signals: signalsTable } = await import("../drizzle/schema");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    const result = await db
      .select({
        timeframe: signalsTable.timeframe,
        plDollars: signalPerformance.plDollars,
      })
      .from(signalPerformance)
      .innerJoin(signalsTable, eq(signalPerformance.signalId, signalsTable.id))
      .where(gte(signalPerformance.createdAt, cutoffDate));

    // Group by timeframe
    const timeframeStats = result.reduce((acc, row) => {
      const timeframe = row.timeframe || "Unknown";
      if (!acc[timeframe]) {
        acc[timeframe] = { total: 0, totalPL: 0, wins: 0 };
      }
      acc[timeframe].total++;
      const pl = parseFloat(row.plDollars || "0");
      acc[timeframe].totalPL += pl;
      if (pl > 0) acc[timeframe].wins++;
      return acc;
    }, {} as Record<string, { total: number; totalPL: number; wins: number }>);

    // Convert to array format
    return Object.entries(timeframeStats).map(([timeframe, stats]) => ({
      timeframe,
      totalSignals: stats.total,
      totalPL: stats.totalPL,
      avgPL: stats.total > 0 ? stats.totalPL / stats.total : 0,
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
    })).sort((a, b) => b.totalPL - a.totalPL);
  } catch (error) {
    console.error("[Database] Failed to get performance by timeframe:", error);
    return [];
  }
}

/**
 * Get strategy performance comparison
 */
export async function getStrategyPerformance(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const { signalPerformance, signals: signalsTable } = await import("../drizzle/schema");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    const result = await db
      .select({
        strategy: signalsTable.strategy,
        plDollars: signalPerformance.plDollars,
        createdAt: signalPerformance.createdAt,
      })
      .from(signalPerformance)
      .innerJoin(signalsTable, eq(signalPerformance.signalId, signalsTable.id))
      .where(gte(signalPerformance.createdAt, cutoffDate))
      .orderBy(signalPerformance.createdAt);

    // Group by strategy
    const strategyStats = result.reduce((acc, row) => {
      const strategy = row.strategy;
      if (!acc[strategy]) {
        acc[strategy] = { total: 0, totalPL: 0, wins: 0, dataPoints: [] };
      }
      acc[strategy].total++;
      const pl = parseFloat(row.plDollars || "0");
      acc[strategy].totalPL += pl;
      if (pl > 0) acc[strategy].wins++;
      
      // Add data point for chart
      acc[strategy].dataPoints.push({
        date: row.createdAt,
        pl: pl,
      });
      
      return acc;
    }, {} as Record<string, { total: number; totalPL: number; wins: number; dataPoints: Array<{ date: Date; pl: number }> }>);

    // Convert to array format
    return Object.entries(strategyStats).map(([strategy, stats]) => ({
      strategy,
      totalSignals: stats.total,
      totalPL: stats.totalPL,
      avgPL: stats.total > 0 ? stats.totalPL / stats.total : 0,
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      dataPoints: stats.dataPoints,
    })).sort((a, b) => b.totalPL - a.totalPL);
  } catch (error) {
    console.error("[Database] Failed to get strategy performance:", error);
    return [];
  }
}

/**
 * Get daily P/L trend for chart
 */
export async function getDailyPLTrend(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const { signalPerformance } = await import("../drizzle/schema");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    const result = await db
      .select({
        plDollars: signalPerformance.plDollars,
        createdAt: signalPerformance.createdAt,
      })
      .from(signalPerformance)
      .where(gte(signalPerformance.createdAt, cutoffDate))
      .orderBy(signalPerformance.createdAt);

    // Group by date
    const dailyPL = result.reduce((acc, row) => {
      const date = row.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(row.plDollars || "0");
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format and calculate cumulative
    let cumulative = 0;
    return Object.entries(dailyPL)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, pl]) => {
        cumulative += pl;
        return {
          date,
          dailyPL: pl,
          cumulativePL: cumulative,
        };
      });
  } catch (error) {
    console.error("[Database] Failed to get daily P/L trend:", error);
    return [];
  }
}

/**
 * Signal Sharing Functions
 */

/**
 * Create a shareable signal link
 */
export async function createSharedSignal(signalId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;

  const { sharedSignals } = await import("../drizzle/schema");
  const { nanoid } = await import("nanoid");

  try {
    // Generate short unique ID for URL
    const shareId = nanoid(10);
    const id = nanoid();

    const newShare = {
      id,
      signalId,
      shareId,
      userId,
      viewCount: "0",
      createdAt: new Date(),
    };

    await db.insert(sharedSignals).values(newShare);
    return { shareId, id };
  } catch (error) {
    console.error("[Database] Failed to create shared signal:", error);
    return null;
  }
}

/**
 * Get shared signal by share ID
 */
export async function getSharedSignal(shareId: string) {
  const db = await getDb();
  if (!db) return null;

  const { sharedSignals, signals: signalsTable } = await import("../drizzle/schema");

  try {
    const result = await db
      .select({
        sharedSignal: sharedSignals,
        signal: signalsTable,
      })
      .from(sharedSignals)
      .innerJoin(signalsTable, eq(sharedSignals.signalId, signalsTable.id))
      .where(eq(sharedSignals.shareId, shareId))
      .limit(1);

    if (result.length === 0) return null;

    // Increment view count
    await db
      .update(sharedSignals)
      .set({
        viewCount: (parseInt(result[0].sharedSignal.viewCount) + 1).toString(),
      })
      .where(eq(sharedSignals.shareId, shareId));

    return {
      ...result[0].signal,
      viewCount: parseInt(result[0].sharedSignal.viewCount) + 1,
      sharedBy: result[0].sharedSignal.userId,
      sharedAt: result[0].sharedSignal.createdAt,
    };
  } catch (error) {
    console.error("[Database] Failed to get shared signal:", error);
    return null;
  }
}

/**
 * Get user's shared signals
 */
export async function getUserSharedSignals(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const { sharedSignals, signals: signalsTable } = await import("../drizzle/schema");

  try {
    const result = await db
      .select({
        shareId: sharedSignals.shareId,
        viewCount: sharedSignals.viewCount,
        createdAt: sharedSignals.createdAt,
        pair: signalsTable.pair,
        signalType: signalsTable.signalType,
        strength: signalsTable.strength,
      })
      .from(sharedSignals)
      .innerJoin(signalsTable, eq(sharedSignals.signalId, signalsTable.id))
      .where(eq(sharedSignals.userId, userId))
      .orderBy(desc(sharedSignals.createdAt));

    return result;
  } catch (error) {
    console.error("[Database] Failed to get user shared signals:", error);
    return [];
  }
}

/**
 * Generate a unique referral code for a user
 */
export async function generateReferralCode(userId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already has a referral code
  const existing = await db.select({ referralCode: users.referralCode }).from(users).where(eq(users.id, userId)).limit(1);
  if (existing.length > 0 && existing[0].referralCode) {
    return existing[0].referralCode;
  }

  // Generate a unique 8-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
  return code;
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string) {
  const db = await getDb();
  if (!db) return { referralCode: null, referralCount: 0 };

  const result = await db
    .select({ referralCode: users.referralCode, referralCount: users.referralCount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0) return { referralCode: null, referralCount: 0 };
  return { referralCode: result[0].referralCode ?? null, referralCount: result[0].referralCount ?? 0 };
}

/**
 * Track a referral when a new user signs up with a referral code
 */
export async function trackReferral(referralCode: string, newUserId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const referrer = await db
      .select({ id: users.id, referralCount: users.referralCount })
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);

    if (referrer.length === 0) return false;
    const referrerId = referrer[0].id;
    if (referrerId === newUserId) return false;

    await db.update(users).set({ referredBy: referrerId }).where(eq(users.id, newUserId));
    await db.update(users).set({ referralCount: (referrer[0].referralCount ?? 0) + 1 }).where(eq(users.id, referrerId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to track referral:", error);
    return false;
  }
}

/**
 * Get the highest AI confidence signal for Signal of the Day
 */
export async function getSignalOfTheDay() {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(signals)
      .where(eq(signals.isAiGenerated, "true"))
      .orderBy(desc(signals.aiConfidence), desc(signals.createdAt))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error: any) {
    // If AI columns don't exist yet, fall back to most recent active signal
    const msg = String(error?.message || error);
    if (msg.includes('isAiGenerated') || msg.includes('aiConfidence') || msg.includes('column') || msg.includes('does not exist')) {
      console.warn('[Database] AI columns missing, returning most recent signal as Signal of the Day');
      try {
        const fallback = await db
          .select()
          .from(signals)
          .where(eq(signals.isActive, "true"))
          .orderBy(desc(signals.createdAt))
          .limit(1);
        return fallback.length > 0 ? fallback[0] : null;
      } catch {
        return null;
      }
    }
    console.error("[Database] Failed to get signal of the day:", error);
    return null;
  }
}
