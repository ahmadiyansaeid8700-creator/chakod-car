CREATE TABLE IF NOT EXISTS `listing_attributions` (
  `listing_id` integer PRIMARY KEY NOT NULL,
  `owner_type` text DEFAULT 'personal' NOT NULL,
  `dealer_id` integer,
  `submitted_by_user_id` integer NOT NULL,
  `submitted_by_display_name` text DEFAULT '' NOT NULL,
  `submitted_by_role` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `listing_attributions_dealer_idx` ON `listing_attributions` (`dealer_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `listing_attributions_submitter_idx` ON `listing_attributions` (`submitted_by_user_id`);
