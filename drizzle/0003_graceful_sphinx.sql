CREATE TABLE "signal_performance" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"signalId" varchar(64) NOT NULL,
	"currentPrice" varchar(20),
	"plDollars" varchar(20),
	"plPips" varchar(20),
	"plPercentage" varchar(20),
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
