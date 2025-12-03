CREATE TABLE "signal_performance" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"signalId" varchar(64) NOT NULL,
	"pair" varchar(20) NOT NULL,
	"signalType" varchar(10) NOT NULL,
	"entryPrice" varchar(20) NOT NULL,
	"currentPrice" varchar(20),
	"stopLoss" varchar(20) NOT NULL,
	"takeProfit" varchar(20) NOT NULL,
	"pips" varchar(20),
	"dollarPL" varchar(20),
	"percentagePL" varchar(20),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"lastUpdated" timestamp DEFAULT now(),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
