CREATE TABLE "user_push_subscriptions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsed" timestamp DEFAULT now()
);
