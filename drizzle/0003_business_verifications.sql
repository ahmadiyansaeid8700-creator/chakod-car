CREATE TABLE `business_verification_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_key` text NOT NULL,
	`activity_type` text NOT NULL,
	`activity_external_id` integer NOT NULL,
	`activity_name` text NOT NULL,
	`applicant_user_id` integer NOT NULL,
	`applicant_mobile` text DEFAULT '' NOT NULL,
	`applicant_relation` text NOT NULL,
	`document_type` text NOT NULL,
	`document_reference` text DEFAULT '' NOT NULL,
	`license_holder_name` text NOT NULL,
	`document_name` text NOT NULL,
	`document_mime` text NOT NULL,
	`document_base64` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`rejection_reason` text DEFAULT '' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_verification_requests_activity_key_unique` ON `business_verification_requests` (`activity_key`);
