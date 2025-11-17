CREATE TABLE "payments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"paypalPaymentId" varchar(128) NOT NULL,
	"paypalPayerId" varchar(128),
	"email" varchar(320) NOT NULL,
	"amount" varchar(20) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"plan" varchar(20) NOT NULL,
	"tier" "subscriptionTier" NOT NULL,
	"status" varchar(20) NOT NULL,
	"userId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_paypalPaymentId_unique" UNIQUE("paypalPaymentId")
);
