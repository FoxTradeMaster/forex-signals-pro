ALTER TABLE "signals" ADD COLUMN "aiReasoning" text;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "aiConfidence" varchar(10);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "aiKeyFactors" text;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "aiInsight" text;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "isAiGenerated" varchar(5) DEFAULT 'false';