CREATE TYPE "public"."feedbackType" AS ENUM('thumbs_up', 'thumbs_down', 'entered_trade', 'skipped_trade');--> statement-breakpoint
CREATE TABLE "ai_brain_stats" (
	"id" varchar(64) PRIMARY KEY DEFAULT 'global' NOT NULL,
	"totalSignalsAnalyzed" varchar(20) DEFAULT '0' NOT NULL,
	"totalOutcomesLearned" varchar(20) DEFAULT '0' NOT NULL,
	"overallWinRate" varchar(10) DEFAULT '0' NOT NULL,
	"bestPair" varchar(20),
	"bestStrategy" varchar(20),
	"bestTimeframe" varchar(10),
	"learningVersion" varchar(10) DEFAULT '1.0' NOT NULL,
	"lastLearningCycle" timestamp,
	"totalFeedbackReceived" varchar(20) DEFAULT '0' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_learning_data" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"signalId" varchar(64) NOT NULL,
	"pair" varchar(20) NOT NULL,
	"strategy" varchar(20) NOT NULL,
	"timeframe" varchar(10) NOT NULL,
	"signalType" varchar(10) NOT NULL,
	"entryPrice" varchar(20) NOT NULL,
	"stopLoss" varchar(20) NOT NULL,
	"takeProfit" varchar(20) NOT NULL,
	"strength" varchar(5) NOT NULL,
	"rsiValue" varchar(10),
	"macdValue" varchar(20),
	"bbPosition" varchar(20),
	"trendDirection" varchar(10),
	"volatility" varchar(10),
	"marketSession" varchar(20),
	"outcome" varchar(20),
	"plPips" varchar(20),
	"plDollars" varchar(20),
	"durationHours" varchar(10),
	"aiConfidence" varchar(10),
	"aiReasoning" text,
	"lessonsLearned" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_market_context" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"pair" varchar(20) NOT NULL,
	"trendStrength" varchar(10),
	"trendDirection" varchar(10),
	"volatilityLevel" varchar(10),
	"supportLevel" varchar(20),
	"resistanceLevel" varchar(20),
	"keyRiskFactors" text,
	"marketSentiment" varchar(20),
	"aiSummary" text,
	"recommendedStrategy" varchar(20),
	"confidenceScore" varchar(10),
	"nextUpdateAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_signal_feedback" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"signalId" varchar(64) NOT NULL,
	"userId" varchar(64) NOT NULL,
	"feedbackType" "feedbackType" NOT NULL,
	"comment" text,
	"userExpertiseLevel" varchar(20) DEFAULT 'beginner',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_strategy_weights" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"pair" varchar(20) NOT NULL,
	"strategy" varchar(20) NOT NULL,
	"timeframe" varchar(10) NOT NULL,
	"macdWeight" varchar(10) DEFAULT '1.0' NOT NULL,
	"rsiWeight" varchar(10) DEFAULT '1.0' NOT NULL,
	"bbWeight" varchar(10) DEFAULT '1.0' NOT NULL,
	"smaWeight" varchar(10) DEFAULT '1.0' NOT NULL,
	"atrWeight" varchar(10) DEFAULT '1.0' NOT NULL,
	"totalSignals" varchar(10) DEFAULT '0' NOT NULL,
	"winCount" varchar(10) DEFAULT '0' NOT NULL,
	"lossCount" varchar(10) DEFAULT '0' NOT NULL,
	"winRate" varchar(10) DEFAULT '0' NOT NULL,
	"avgPlPips" varchar(20) DEFAULT '0' NOT NULL,
	"confidenceScore" varchar(10) DEFAULT '50' NOT NULL,
	"lastUpdated" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
