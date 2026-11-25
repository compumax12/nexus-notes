ALTER TABLE `app_locks` ADD `recovery_hash` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_locks` ADD `recovery_created_at` text DEFAULT '' NOT NULL;