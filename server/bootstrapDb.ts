/**
 * Bootstrap Database Script
 * Creates all tables using raw SQL (CREATE TABLE IF NOT EXISTS) so it works
 * reliably on any PostgreSQL database without needing drizzle-kit migrations.
 * 
 * This is called at server startup and is completely idempotent.
 */

export async function bootstrapDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('[Bootstrap] DATABASE_URL not set, skipping DB bootstrap.');
    return;
  }

  // Only run on PostgreSQL (not MySQL/TiDB used in Manus preview)
  if (!process.env.DATABASE_URL.startsWith('postgres')) {
    console.log('[Bootstrap] Non-PostgreSQL database detected, skipping raw SQL bootstrap (drizzle migrations will handle schema).');
    return;
  }

  try {
    // Use the same postgres client as the rest of the app (handles SSL correctly)
    const postgres = (await import('postgres')).default;
    // Parse SSL from the connection string — don't force ssl:'require' as it may conflict
    const sslOption = process.env.DATABASE_URL.includes('sslmode=require') || 
                      process.env.DATABASE_URL.includes('ssl=true') ||
                      process.env.DATABASE_URL.includes('render.com') ||
                      process.env.DATABASE_URL.includes('neon.tech') ||
                      process.env.DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false } 
      : false;
    const client = postgres(process.env.DATABASE_URL, { max: 1, ssl: sslOption as any });

    console.log('[Bootstrap] Creating database tables if they do not exist...');

    // Create enums first (idempotent via DO block)
    await client`
      DO $$ BEGIN
        CREATE TYPE "role" AS ENUM ('user', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `;

    await client`
      DO $$ BEGIN
        CREATE TYPE "subscriptionTier" AS ENUM ('free', 'premium', 'pro');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `;

    await client`
      DO $$ BEGIN
        CREATE TYPE "alertType" AS ENUM ('profit_target', 'stop_loss', 'percent_gain', 'percent_loss');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `;

    await client`
      DO $$ BEGIN
        CREATE TYPE "alertChannel" AS ENUM ('browser', 'email', 'both');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `;

    await client`
      DO $$ BEGIN
        CREATE TYPE "tradeStatus" AS ENUM ('entered', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `;

    // Users table
    await client`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar(64) PRIMARY KEY,
        "name" text,
        "email" varchar(320),
        "loginMethod" varchar(64),
        "role" "role" NOT NULL DEFAULT 'user',
        "subscriptionTier" "subscriptionTier" NOT NULL DEFAULT 'free',
        "subscriptionExpiry" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "lastSignedIn" timestamp DEFAULT now(),
        "referralCode" varchar(16) UNIQUE,
        "referredBy" varchar(64),
        "referralCount" integer NOT NULL DEFAULT 0
      );
    `;

    // Signals table
    await client`
      CREATE TABLE IF NOT EXISTS "signals" (
        "id" varchar(64) PRIMARY KEY,
        "pair" varchar(20) NOT NULL,
        "signalType" varchar(10) NOT NULL,
        "strength" varchar(10) NOT NULL,
        "strategy" varchar(20) NOT NULL,
        "entryPrice" varchar(20) NOT NULL,
        "stopLoss" varchar(20) NOT NULL,
        "takeProfit" varchar(20) NOT NULL,
        "timeframe" varchar(10) NOT NULL,
        "reason" text NOT NULL,
        "indicators" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "isActive" varchar(5) NOT NULL DEFAULT 'true',
        "aiReasoning" text,
        "aiConfidence" varchar(10),
        "aiKeyFactors" text,
        "aiInsight" text,
        "isAiGenerated" varchar(5) DEFAULT 'false'
      );
    `;

    // Watchlist table
    await client`
      CREATE TABLE IF NOT EXISTS "watchlist" (
        "id" varchar(64) PRIMARY KEY,
        "userId" varchar(64) NOT NULL,
        "pair" varchar(20) NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // Magic links table
    await client`
      CREATE TABLE IF NOT EXISTS "magic_links" (
        "id" varchar(64) PRIMARY KEY,
        "email" varchar(320) NOT NULL,
        "token" varchar(128) NOT NULL UNIQUE,
        "tier" "subscriptionTier" NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "usedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // Payments table
    await client`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" varchar(64) PRIMARY KEY,
        "paypalPaymentId" varchar(128) NOT NULL UNIQUE,
        "paypalPayerId" varchar(128),
        "email" varchar(320) NOT NULL,
        "amount" varchar(20) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "plan" varchar(20) NOT NULL,
        "tier" "subscriptionTier" NOT NULL,
        "status" varchar(20) NOT NULL,
        "userId" varchar(64),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // Signal performance table
    await client`
      CREATE TABLE IF NOT EXISTS "signal_performance" (
        "id" varchar(64) PRIMARY KEY,
        "signalId" varchar(64) NOT NULL,
        "currentPrice" varchar(20),
        "plDollars" varchar(20),
        "plPips" varchar(20),
        "plPercentage" varchar(20),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // Alert preferences table
    await client`
      CREATE TABLE IF NOT EXISTS "alert_preferences" (
        "id" varchar(64) PRIMARY KEY,
        "userId" varchar(64) NOT NULL,
        "alertType" "alertType" NOT NULL,
        "threshold" varchar(20),
        "channel" "alertChannel" NOT NULL DEFAULT 'both',
        "isEnabled" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // Alert history table
    await client`
      CREATE TABLE IF NOT EXISTS "alert_history" (
        "id" varchar(64) PRIMARY KEY,
        "userId" varchar(64) NOT NULL,
        "signalId" varchar(64) NOT NULL,
        "alertType" "alertType" NOT NULL,
        "channel" "alertChannel" NOT NULL,
        "message" text NOT NULL,
        "plDollars" varchar(20),
        "plPercentage" varchar(20),
        "sentAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // User trades table
    await client`
      CREATE TABLE IF NOT EXISTS "user_trades" (
        "id" varchar(64) PRIMARY KEY,
        "userId" varchar(64) NOT NULL,
        "signalId" varchar(64),
        "pair" varchar(20) NOT NULL,
        "tradeType" varchar(10) NOT NULL,
        "status" "tradeStatus" NOT NULL DEFAULT 'entered',
        "entryPrice" varchar(20) NOT NULL,
        "entryDate" timestamp NOT NULL,
        "positionSize" varchar(20),
        "exitPrice" varchar(20),
        "exitDate" timestamp,
        "plDollars" varchar(20),
        "plPips" varchar(20),
        "plPercentage" varchar(20),
        "notes" text,
        "stopLoss" varchar(20),
        "takeProfit" varchar(20),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // Push subscriptions table
    await client`
      CREATE TABLE IF NOT EXISTS "user_push_subscriptions" (
        "id" varchar(64) PRIMARY KEY,
        "userId" varchar(64) NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "userAgent" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "lastUsed" timestamp DEFAULT now()
      );
    `;

    // Shared signals table
    await client`
      CREATE TABLE IF NOT EXISTS "shared_signals" (
        "id" varchar(64) PRIMARY KEY,
        "signalId" varchar(64) NOT NULL,
        "shareId" varchar(32) NOT NULL UNIQUE,
        "userId" varchar(64) NOT NULL,
        "viewCount" varchar(10) NOT NULL DEFAULT '0',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "expiresAt" timestamp
      );
    `;

    // AI strategy weights table
    await client`
      CREATE TABLE IF NOT EXISTS "ai_strategy_weights" (
        "id" varchar(64) PRIMARY KEY,
        "pair" varchar(20) NOT NULL,
        "strategy" varchar(20) NOT NULL,
        "timeframe" varchar(10) NOT NULL,
        "macdWeight" varchar(10) NOT NULL DEFAULT '1.0',
        "rsiWeight" varchar(10) NOT NULL DEFAULT '1.0',
        "bbWeight" varchar(10) NOT NULL DEFAULT '1.0',
        "smaWeight" varchar(10) NOT NULL DEFAULT '1.0',
        "atrWeight" varchar(10) NOT NULL DEFAULT '1.0',
        "totalSignals" varchar(10) NOT NULL DEFAULT '0',
        "winCount" varchar(10) NOT NULL DEFAULT '0',
        "lossCount" varchar(10) NOT NULL DEFAULT '0',
        "winRate" varchar(10) NOT NULL DEFAULT '0.5',
        "avgProfitPips" varchar(10) NOT NULL DEFAULT '0',
        "avgLossPips" varchar(10) NOT NULL DEFAULT '0',
        "lastUpdated" timestamp NOT NULL DEFAULT now(),
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;

    // AI signal outcomes table
    await client`
      CREATE TABLE IF NOT EXISTS "ai_signal_outcomes" (
        "id" varchar(64) PRIMARY KEY,
        "signalId" varchar(64) NOT NULL,
        "pair" varchar(20) NOT NULL,
        "strategy" varchar(20) NOT NULL,
        "timeframe" varchar(10) NOT NULL,
        "signalType" varchar(10) NOT NULL,
        "entryPrice" varchar(20) NOT NULL,
        "exitPrice" varchar(20),
        "stopLoss" varchar(20) NOT NULL,
        "takeProfit" varchar(20) NOT NULL,
        "outcome" varchar(10),
        "plPips" varchar(20),
        "plPercentage" varchar(20),
        "aiConfidence" varchar(10),
        "marketCondition" varchar(20),
        "sessionName" varchar(20),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "resolvedAt" timestamp
      );
    `;

    // Referrals table
    await client`
      CREATE TABLE IF NOT EXISTS "referrals" (
        "id" varchar(64) PRIMARY KEY,
        "referrerId" varchar(64) NOT NULL,
        "referredUserId" varchar(64) NOT NULL,
        "referralCode" varchar(16) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "rewardGranted" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "convertedAt" timestamp
      );
    `;

    await client.end();
    console.log('[Bootstrap] All tables created/verified successfully.');
  } catch (err: any) {
    // Non-fatal: log and continue
    console.warn('[Bootstrap] DB bootstrap warning (non-fatal):', err?.message?.slice(0, 300) || err);
  }
}
