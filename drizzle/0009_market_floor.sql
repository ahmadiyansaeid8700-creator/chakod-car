CREATE TABLE IF NOT EXISTS `market_floor_wallets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_key` text NOT NULL,
  `available_cards` integer DEFAULT 3 NOT NULL,
  `consumed_cards` integer DEFAULT 0 NOT NULL,
  `refunded_cards` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `market_floor_wallets_owner_key_unique` ON `market_floor_wallets` (`owner_key`);

CREATE TABLE IF NOT EXISTS `market_floor_entries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_key` text NOT NULL,
  `listing_id` integer NOT NULL,
  `province` text NOT NULL,
  `requested_scope` text DEFAULT 'province' NOT NULL,
  `cycle_key` text NOT NULL,
  `cycle_starts_at` text NOT NULL,
  `cycle_ends_at` text NOT NULL,
  `status` text DEFAULT 'pending_ai' NOT NULL,
  `score` integer DEFAULT 0 NOT NULL,
  `grade` text DEFAULT 'rejected' NOT NULL,
  `decision` text DEFAULT 'human_review' NOT NULL,
  `reason` text DEFAULT '' NOT NULL,
  `score_json` text DEFAULT '{}' NOT NULL,
  `listing_snapshot_json` text DEFAULT '{}' NOT NULL,
  `card_state` text DEFAULT 'reserved' NOT NULL,
  `reservation_for_next_cycle` integer DEFAULT false NOT NULL,
  `reviewed_by` text DEFAULT 'ai' NOT NULL,
  `reviewed_at` text,
  `activated_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `market_floor_owner_listing_cycle_unique` ON `market_floor_entries` (`owner_key`,`listing_id`,`cycle_key`);
