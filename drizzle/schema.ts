import { pgTable, varchar, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

// Define enums for PostgreSQL
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const subscriptionTierEnum = pgEnum("subscriptionTier", ["free", "premium", "pro"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  subscriptionTier: subscriptionTierEnum("subscriptionTier").default("free").notNull(),
  subscriptionExpiry: timestamp("subscriptionExpiry"),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Trading signals table - stores generated trading signals
 */
export const signals = pgTable("signals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  pair: varchar("pair", { length: 20 }).notNull(), // e.g., EUR/USD
  signalType: varchar("signalType", { length: 10 }).notNull(), // BUY, SELL, HOLD
  strength: varchar("strength", { length: 10 }).notNull(), // 1-10
  strategy: varchar("strategy", { length: 20 }).notNull(), // swing, day, trend
  entryPrice: varchar("entryPrice", { length: 20 }).notNull(),
  stopLoss: varchar("stopLoss", { length: 20 }).notNull(),
  takeProfit: varchar("takeProfit", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(), // 15m, 1h, 4h, 1d
  reason: text("reason").notNull(),
  indicators: text("indicators").notNull(), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  isActive: varchar("isActive", { length: 5 }).default("true").notNull(), // true/false as string
});

export type Signal = typeof signals.$inferSelect;
export type InsertSignal = typeof signals.$inferInsert;

/**
 * User watchlist - tracks which pairs users are monitoring
 */
export const watchlist = pgTable("watchlist", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  pair: varchar("pair", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * Magic links table - stores authentication tokens sent via email
 */
export const magicLinks = pgTable("magic_links", {
  id: varchar("id", { length: 64 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  tier: subscriptionTierEnum("tier").notNull(), // premium or pro
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLink = typeof magicLinks.$inferSelect;
export type InsertMagicLink = typeof magicLinks.$inferInsert;

/**
 * Payments table - stores PayPal payment records
 */
export const payments = pgTable("payments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  paypalPaymentId: varchar("paypalPaymentId", { length: 128 }).notNull().unique(),
  paypalPayerId: varchar("paypalPayerId", { length: 128 }),
  email: varchar("email", { length: 320 }).notNull(),
  amount: varchar("amount", { length: 20 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  plan: varchar("plan", { length: 20 }).notNull(), // monthly, yearly, pro_monthly, pro_yearly
  tier: subscriptionTierEnum("tier").notNull(), // premium or pro
  status: varchar("status", { length: 20 }).notNull(), // completed, pending, failed
  userId: varchar("userId", { length: 64 }), // Set after user activates account
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Signal Performance table - tracks P/L for each signal
 */
export const signalPerformance = pgTable("signal_performance", {
  id: varchar("id", { length: 64 }).primaryKey(),
  signalId: varchar("signalId", { length: 64 }).notNull(),
  currentPrice: varchar("currentPrice", { length: 20 }),
  plDollars: varchar("plDollars", { length: 20 }),
  plPips: varchar("plPips", { length: 20 }),
  plPercentage: varchar("plPercentage", { length: 20 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SignalPerformance = typeof signalPerformance.$inferSelect;
export type InsertSignalPerformance = typeof signalPerformance.$inferInsert;

/**
 * Alert Preferences table - stores user notification preferences
 */
export const alertTypeEnum = pgEnum("alertType", ["profit_target", "stop_loss", "percent_gain", "percent_loss"]);
export const alertChannelEnum = pgEnum("alertChannel", ["browser", "email", "both"]);

export const alertPreferences = pgTable("alert_preferences", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  alertType: alertTypeEnum("alertType").notNull(),
  threshold: varchar("threshold", { length: 20 }), // e.g., "5" for 5% gain/loss
  channel: alertChannelEnum("channel").default("both").notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AlertPreference = typeof alertPreferences.$inferSelect;
export type InsertAlertPreference = typeof alertPreferences.$inferInsert;

/**
 * Alert History table - logs all sent alerts
 */
export const alertHistory = pgTable("alert_history", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  signalId: varchar("signalId", { length: 64 }).notNull(),
  alertType: alertTypeEnum("alertType").notNull(),
  channel: alertChannelEnum("channel").notNull(),
  message: text("message").notNull(),
  plDollars: varchar("plDollars", { length: 20 }),
  plPercentage: varchar("plPercentage", { length: 20 }),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

/**
 * Trade Journal table - tracks user's actual trades
 */
export const tradeStatusEnum = pgEnum("tradeStatus", ["entered", "closed"]);

export const userTrades = pgTable("user_trades", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  signalId: varchar("signalId", { length: 64 }), // Optional: link to original signal
  pair: varchar("pair", { length: 20 }).notNull(),
  tradeType: varchar("tradeType", { length: 10 }).notNull(), // BUY, SELL
  status: tradeStatusEnum("status").default("entered").notNull(),
  
  // Entry details
  entryPrice: varchar("entryPrice", { length: 20 }).notNull(),
  entryDate: timestamp("entryDate").notNull(),
  positionSize: varchar("positionSize", { length: 20 }), // Lot size or units
  
  // Exit details (filled when closed)
  exitPrice: varchar("exitPrice", { length: 20 }),
  exitDate: timestamp("exitDate"),
  
  // P/L tracking
  plDollars: varchar("plDollars", { length: 20 }),
  plPips: varchar("plPips", { length: 20 }),
  plPercentage: varchar("plPercentage", { length: 20 }),
  
  // Optional fields
  notes: text("notes"),
  stopLoss: varchar("stopLoss", { length: 20 }),
  takeProfit: varchar("takeProfit", { length: 20 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserTrade = typeof userTrades.$inferSelect;
export type InsertUserTrade = typeof userTrades.$inferInsert;

/**
 * Push Notification Subscriptions table - stores browser push notification subscriptions
 */
export const userPushSubscriptions = pgTable("user_push_subscriptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsed: timestamp("lastUsed").defaultNow(),
});

export type UserPushSubscription = typeof userPushSubscriptions.$inferSelect;
export type InsertUserPushSubscription = typeof userPushSubscriptions.$inferInsert;
