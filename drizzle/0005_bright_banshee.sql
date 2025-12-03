CREATE TYPE "public"."tradeStatus" AS ENUM('entered', 'closed');--> statement-breakpoint
CREATE TABLE "user_trades" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"signalId" varchar(64),
	"pair" varchar(20) NOT NULL,
	"tradeType" varchar(10) NOT NULL,
	"status" "tradeStatus" DEFAULT 'entered' NOT NULL,
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
