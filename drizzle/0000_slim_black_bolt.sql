CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`education` text NOT NULL,
	`experience` text NOT NULL,
	`roles` text NOT NULL,
	`skills` text NOT NULL,
	`work_mode` text NOT NULL,
	`relocation` integer NOT NULL,
	`preferred_regions` text NOT NULL,
	`updated_at` text NOT NULL
);
