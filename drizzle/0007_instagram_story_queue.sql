CREATE TABLE IF NOT EXISTS `instagram_story_queue` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `story_order_id` integer NOT NULL,
  `owner_key` text NOT NULL,
  `listing_id` integer NOT NULL,
  `price_toman` integer NOT NULL,
  `min_price_toman` integer DEFAULT 3000000000 NOT NULL,
  `title` text DEFAULT '' NOT NULL,
  `image_url` text DEFAULT '' NOT NULL,
  `public_url` text DEFAULT '' NOT NULL,
  `source_expires_at` text NOT NULL,
  `slot_date` text DEFAULT '' NOT NULL,
  `slot_number` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `priority` integer DEFAULT 100 NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `last_error` text DEFAULT '' NOT NULL,
  `meta_container_id` text DEFAULT '' NOT NULL,
  `meta_media_id` text DEFAULT '' NOT NULL,
  `published_date` text DEFAULT '' NOT NULL,
  `published_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `instagram_story_queue_story_order_unique`
  ON `instagram_story_queue` (`story_order_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `instagram_story_queue_slot_unique`
  ON `instagram_story_queue` (`slot_date`, `slot_number`)
  WHERE `slot_number` > 0;

CREATE INDEX IF NOT EXISTS `instagram_story_queue_status_slot_idx`
  ON `instagram_story_queue` (`status`, `slot_date`, `slot_number`);

CREATE INDEX IF NOT EXISTS `instagram_story_queue_published_date_idx`
  ON `instagram_story_queue` (`published_date`, `status`);
