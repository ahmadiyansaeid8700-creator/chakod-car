CREATE TABLE `wallets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_key` text NOT NULL UNIQUE,
	`available_balance_toman` integer DEFAULT 0 NOT NULL,
	`blocked_balance_toman` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wallet_id` integer NOT NULL,
	`direction` text NOT NULL,
	`transaction_type` text NOT NULL,
	`amount_toman` integer NOT NULL,
	`balance_after_toman` integer NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`reference_type` text DEFAULT '' NOT NULL,
	`reference_id` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commerce_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_no` text NOT NULL UNIQUE,
	`idempotency_key` text NOT NULL UNIQUE,
	`owner_key` text NOT NULL,
	`order_type` text NOT NULL,
	`product_code` text NOT NULL,
	`amount_toman` integer NOT NULL,
	`discount_toman` integer DEFAULT 0 NOT NULL,
	`final_amount_toman` integer NOT NULL,
	`currency` text DEFAULT 'IRR' NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`gateway` text NOT NULL,
	`authority` text DEFAULT '' NOT NULL,
	`gateway_transaction_id` text DEFAULT '' NOT NULL,
	`idempotency_key` text NOT NULL UNIQUE,
	`amount_toman` integer NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`request_json` text DEFAULT '{}' NOT NULL,
	`response_json` text DEFAULT '{}' NOT NULL,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_no` text NOT NULL UNIQUE,
	`order_id` integer NOT NULL UNIQUE,
	`owner_key` text NOT NULL,
	`amount_toman` integer NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`issued_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_refunds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`payment_attempt_id` integer NOT NULL,
	`amount_toman` integer NOT NULL,
	`destination` text DEFAULT 'gateway' NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `featured_showroom_placements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL UNIQUE,
	`owner_key` text NOT NULL,
	`dealer_id` integer NOT NULL,
	`dealer_name` text NOT NULL,
	`province` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`reserved_days` integer NOT NULL,
	`daily_rate_toman` integer NOT NULL,
	`total_price_toman` integer NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_no` text NOT NULL UNIQUE,
	`owner_key` text DEFAULT '' NOT NULL,
	`guest_access_hash` text DEFAULT '' NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`mobile` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`topic` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`order_no` text DEFAULT '' NOT NULL,
	`listing_id` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`last_reply_at` text,
	`closed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`author_type` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
