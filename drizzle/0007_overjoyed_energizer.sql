CREATE TABLE `sharing_defaults` (
	`owner` text PRIMARY KEY NOT NULL,
	`emails` text DEFAULT '[]' NOT NULL
);
