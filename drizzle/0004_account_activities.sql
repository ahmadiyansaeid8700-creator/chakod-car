CREATE TABLE IF NOT EXISTS `account_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_user_id` integer NOT NULL,
	`activity_type` text NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`province` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`neighborhood` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`external_dealer_id` integer,
	`source` text DEFAULT 'native' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `account_activities_owner_type_unique` ON `account_activities` (`owner_user_id`,`activity_type`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `account_activities_external_dealer_unique` ON `account_activities` (`external_dealer_id`);