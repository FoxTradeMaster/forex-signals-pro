CREATE TABLE "shared_signals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"signalId" varchar(64) NOT NULL,
	"shareId" varchar(32) NOT NULL,
	"userId" varchar(64) NOT NULL,
	"viewCount" varchar(10) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	CONSTRAINT "shared_signals_shareId_unique" UNIQUE("shareId")
);
