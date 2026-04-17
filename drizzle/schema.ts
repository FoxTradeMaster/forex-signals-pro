import { pgTable, varchar, text, timestamp, pgEnum, boolean, integer } from "drizzle-orm/pg-core";

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
  referralCode: varchar("referralCode", { length: 16 }).unique(),
  referredBy: varchar("referredBy", { length: 64 }),
  referralCount: integer("referralCount").default(0).notNull(),
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
  // AI brain fields (optional - only present on AI-generated signals)
  aiReasoning: text("aiReasoning"),           // LLM reasoning explanation
  aiConfidence: varchar("aiConfidence", { length: 10 }), // 0-100 confidence score
  aiKeyFactors: text("aiKeyFactors"),         // JSON array of key factors
  aiInsight: text("aiInsight"),               // AI market insight
  isAiGenerated: varchar("isAiGenerated", { length: 5 }).default("false"), // true/false
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
  // Outcome tracking — set when signal is resolved (TP/SL hit)
  outcome: varchar("outcome", { length: 20 }), // target_hit | stop_loss_hit | active
  closedAt: timestamp("closedAt"),              // When the signal was resolved
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

/**
 * Shared signals table - stores shareable signal links
 */
export const sharedSignals = pgTable("shared_signals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  signalId: varchar("signalId", { length: 64 }).notNull(),
  shareId: varchar("shareId", { length: 32 }).notNull().unique(), // Short unique ID for URL
  userId: varchar("userId", { length: 64 }).notNull(), // User who shared the signal
  viewCount: varchar("viewCount", { length: 10 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration
});

export type SharedSignal = typeof sharedSignals.$inferSelect;
export type InsertSharedSignal = typeof sharedSignals.$inferInsert;

// ============================================================
// AI BRAIN TABLES - Self-Learning Intelligence System
// ============================================================

/**
 * AI Strategy Weights - stores learned weights per strategy/pair/timeframe
 * Updated automatically as the AI learns from signal outcomes
 */
export const aiStrategyWeights = pgTable("ai_strategy_weights", {
  id: varchar("id", { length: 64 }).primaryKey(),
  pair: varchar("pair", { length: 20 }).notNull(),          // e.g., EUR/USD
  strategy: varchar("strategy", { length: 20 }).notNull(),  // swing, day, trend, momentum
  timeframe: varchar("timeframe", { length: 10 }).notNull(), // 15m, 1h, 4h, 1d
  // Indicator weights (0.0 - 2.0, default 1.0 = neutral)
  macdWeight: varchar("macdWeight", { length: 10 }).default("1.0").notNull(),
  rsiWeight: varchar("rsiWeight", { length: 10 }).default("1.0").notNull(),
  bbWeight: varchar("bbWeight", { length: 10 }).default("1.0").notNull(),
  smaWeight: varchar("smaWeight", { length: 10 }).default("1.0").notNull(),
  atrWeight: varchar("atrWeight", { length: 10 }).default("1.0").notNull(),
  // Performance metrics
  totalSignals: varchar("totalSignals", { length: 10 }).default("0").notNull(),
  winCount: varchar("winCount", { length: 10 }).default("0").notNull(),
  lossCount: varchar("lossCount", { length: 10 }).default("0").notNull(),
  winRate: varchar("winRate", { length: 10 }).default("0").notNull(),       // percentage
  avgPlPips: varchar("avgPlPips", { length: 20 }).default("0").notNull(),   // avg P/L in pips
  confidenceScore: varchar("confidenceScore", { length: 10 }).default("50").notNull(), // 0-100
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiStrategyWeight = typeof aiStrategyWeights.$inferSelect;
export type InsertAiStrategyWeight = typeof aiStrategyWeights.$inferInsert;

/**
 * AI Learning Data - records every signal outcome for learning
 * This is the AI's memory of what worked and what didn't
 */
export const aiLearningData = pgTable("ai_learning_data", {
  id: varchar("id", { length: 64 }).primaryKey(),
  signalId: varchar("signalId", { length: 64 }).notNull(),
  pair: varchar("pair", { length: 20 }).notNull(),
  strategy: varchar("strategy", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  signalType: varchar("signalType", { length: 10 }).notNull(), // BUY, SELL
  // Signal parameters at time of generation
  entryPrice: varchar("entryPrice", { length: 20 }).notNull(),
  stopLoss: varchar("stopLoss", { length: 20 }).notNull(),
  takeProfit: varchar("takeProfit", { length: 20 }).notNull(),
  strength: varchar("strength", { length: 5 }).notNull(),
  // Market context when signal was generated
  rsiValue: varchar("rsiValue", { length: 10 }),
  macdValue: varchar("macdValue", { length: 20 }),
  bbPosition: varchar("bbPosition", { length: 20 }), // above/below/at band
  trendDirection: varchar("trendDirection", { length: 10 }), // up/down/sideways
  volatility: varchar("volatility", { length: 10 }), // low/medium/high
  marketSession: varchar("marketSession", { length: 20 }), // london/newyork/tokyo/sydney
  // Outcome (filled when signal resolves)
  outcome: varchar("outcome", { length: 20 }), // target_hit, stop_loss_hit, expired, active
  plPips: varchar("plPips", { length: 20 }),
  plDollars: varchar("plDollars", { length: 20 }),
  durationHours: varchar("durationHours", { length: 10 }),
  // AI analysis
  aiConfidence: varchar("aiConfidence", { length: 10 }), // 0-100 at time of signal
  aiReasoning: text("aiReasoning"),                       // LLM reasoning text
  lessonsLearned: text("lessonsLearned"),                 // Post-outcome AI analysis
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type AiLearningData = typeof aiLearningData.$inferSelect;
export type InsertAiLearningData = typeof aiLearningData.$inferInsert;

/**
 * AI Signal Feedback - user feedback on signal quality
 * Helps AI learn from human expertise
 */
export const feedbackTypeEnum = pgEnum("feedbackType", ["thumbs_up", "thumbs_down", "entered_trade", "skipped_trade"]);

export const aiSignalFeedback = pgTable("ai_signal_feedback", {
  id: varchar("id", { length: 64 }).primaryKey(),
  signalId: varchar("signalId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  feedbackType: feedbackTypeEnum("feedbackType").notNull(),
  comment: text("comment"),
  userExpertiseLevel: varchar("userExpertiseLevel", { length: 20 }).default("beginner"), // beginner/intermediate/expert
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiSignalFeedback = typeof aiSignalFeedback.$inferSelect;
export type InsertAiSignalFeedback = typeof aiSignalFeedback.$inferInsert;

/**
 * AI Market Context - stores AI's analysis of current market conditions
 * Updated periodically to give context to signal generation
 */
export const aiMarketContext = pgTable("ai_market_context", {
  id: varchar("id", { length: 64 }).primaryKey(),
  pair: varchar("pair", { length: 20 }).notNull(),
  // AI-generated market analysis
  trendStrength: varchar("trendStrength", { length: 10 }), // 0-100
  trendDirection: varchar("trendDirection", { length: 10 }), // bullish/bearish/neutral
  volatilityLevel: varchar("volatilityLevel", { length: 10 }), // low/medium/high/extreme
  supportLevel: varchar("supportLevel", { length: 20 }),
  resistanceLevel: varchar("resistanceLevel", { length: 20 }),
  keyRiskFactors: text("keyRiskFactors"),   // JSON array of risk factors
  marketSentiment: varchar("marketSentiment", { length: 20 }), // bullish/bearish/neutral/mixed
  aiSummary: text("aiSummary"),             // LLM-generated market summary
  recommendedStrategy: varchar("recommendedStrategy", { length: 20 }), // best strategy for current conditions
  confidenceScore: varchar("confidenceScore", { length: 10 }), // 0-100
  nextUpdateAt: timestamp("nextUpdateAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AiMarketContext = typeof aiMarketContext.$inferSelect;
export type InsertAiMarketContext = typeof aiMarketContext.$inferInsert;

/**
 * AI Brain Stats - global learning statistics for display
 */
export const aiBrainStats = pgTable("ai_brain_stats", {
  id: varchar("id", { length: 64 }).primaryKey().default("global"),
  totalSignalsAnalyzed: varchar("totalSignalsAnalyzed", { length: 20 }).default("0").notNull(),
  totalOutcomesLearned: varchar("totalOutcomesLearned", { length: 20 }).default("0").notNull(),
  overallWinRate: varchar("overallWinRate", { length: 10 }).default("0").notNull(),
  bestPair: varchar("bestPair", { length: 20 }),
  bestStrategy: varchar("bestStrategy", { length: 20 }),
  bestTimeframe: varchar("bestTimeframe", { length: 10 }),
  learningVersion: varchar("learningVersion", { length: 10 }).default("1.0").notNull(),
  lastLearningCycle: timestamp("lastLearningCycle"),
  totalFeedbackReceived: varchar("totalFeedbackReceived", { length: 20 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AiBrainStats = typeof aiBrainStats.$inferSelect;
export type InsertAiBrainStats = typeof aiBrainStats.$inferInsert;
