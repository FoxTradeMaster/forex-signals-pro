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
  } catch (error) {
    console.error("[Database] Failed to save signal:", error);
    throw error;
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

  const { signalPerformance } = await import("../drizzle/schema");
  const id = `perf-${signalId}`;

  const result = await db
    .select()
    .from(signalPerformance)
    .where(eq(signalPerformance.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
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
  const result = await db
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
