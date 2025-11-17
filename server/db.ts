import { eq, and } from "drizzle-orm";
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
