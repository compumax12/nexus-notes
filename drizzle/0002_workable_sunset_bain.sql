CREATE TABLE `app_locks` (
	`owner` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_start` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unlock_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
