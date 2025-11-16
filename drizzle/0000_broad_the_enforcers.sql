CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subscriptionTier" AS ENUM('free', 'premium', 'pro');--> statement-breakpoint
CREATE TABLE "signals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"isActive" varchar(5) DEFAULT 'true' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"subscriptionTier" "subscriptionTier" DEFAULT 'free' NOT NULL,
	"subscriptionExpiry" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"lastSignedIn" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"pair" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
