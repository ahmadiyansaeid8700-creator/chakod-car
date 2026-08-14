CREATE TABLE `story_promotions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_key` text NOT NULL,
  `listing_id` integer NOT NULL,
  `title` text NOT NULL,
  `brand` text DEFAULT '' NOT NULL,
  `model` text DEFAULT '' NOT NULL,
  `year` text DEFAULT '' NOT NULL,
  `price_toman` integer DEFAULT 0 NOT NULL,
  `province` text DEFAULT '' NOT NULL,
  `city` text DEFAULT '' NOT NULL,
  `neighborhood` text DEFAULT '' NOT NULL,
  `listing_owner_type` text DEFAULT 'personal' NOT NULL,
  `seller_display_name` text DEFAULT '' NOT NULL,
  `dealer_id` integer,
  `cover_image_url` text DEFAULT '' NOT NULL,
  `public_url` text NOT NULL,
  `coupon_code` text DEFAULT '' NOT NULL,
  `original_amount_toman` integer DEFAULT 0 NOT NULL,
  `discount_amount_toman` integer DEFAULT 0 NOT NULL,
  `final_amount_toman` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `starts_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `story_promotions_owner_active_idx` ON `story_promotions` (`owner_key`,`status`,`expires_at`);
--> statement-breakpoint
CREATE INDEX `story_promotions_public_active_idx` ON `story_promotions` (`status`,`expires_at`);
