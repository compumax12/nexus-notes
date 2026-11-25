CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`notes` text NOT NULL,
	`requester` text NOT NULL,
	`priority` text NOT NULL,
	`due` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
