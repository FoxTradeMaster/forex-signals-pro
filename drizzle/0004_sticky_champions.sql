CREATE TYPE "public"."alertChannel" AS ENUM('browser', 'email', 'both');--> statement-breakpoint
CREATE TYPE "public"."alertType" AS ENUM('profit_target', 'stop_loss', 'percent_gain', 'percent_loss');--> statement-breakpoint
CREATE TABLE "alert_history" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"signalId" varchar(64) NOT NULL,
	"alertType" "alertType" NOT NULL,
	"channel" "alertChannel" NOT NULL,
	"message" text NOT NULL,
	"plDollars" varchar(20),
	"plPercentage" varchar(20),
	"sentAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_preferences" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"alertType" "alertType" NOT NULL,
	"threshold" varchar(20),
	"channel" "alertChannel" DEFAULT 'both' NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
