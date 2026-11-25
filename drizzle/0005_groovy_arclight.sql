ALTER TABLE `tasks` ADD `recurrence` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence_day` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence_parent` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_recurrence_parent_unique` ON `tasks` (`recurrence_parent`);