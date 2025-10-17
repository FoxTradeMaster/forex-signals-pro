ALTER TABLE `users` ADD `subscriptionTier` enum('free','premium') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionExpiry` timestamp;