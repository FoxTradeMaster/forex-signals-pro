CREATE TABLE `signals` (
	`id` varchar(64) NOT NULL,
	`pair` varchar(20) NOT NULL,
	`signalType` varchar(10) NOT NULL,
	`strength` varchar(10) NOT NULL,
	`strategy` varchar(20) NOT NULL,
	`entryPrice` varchar(20) NOT NULL,
	`stopLoss` varchar(20) NOT NULL,
	`takeProfit` varchar(20) NOT NULL,
	`timeframe` varchar(10) NOT NULL,
	`reason` text NOT NULL,
	`indicators` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`isActive` varchar(5) NOT NULL DEFAULT 'true',
	CONSTRAINT `signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`pair` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
