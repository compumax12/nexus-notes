CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`updated_at` text NOT NULL,
	`shared_with` text DEFAULT '[]' NOT NULL
);
