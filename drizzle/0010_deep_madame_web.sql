ALTER TABLE "users" ADD COLUMN "referralCode" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referredBy" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referralCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referralCode_unique" UNIQUE("referralCode");