CREATE TABLE `room_options` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`label` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `room_options_room_id_idx` ON `room_options` (`room_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `room_options_room_id_position_idx` ON `room_options` (`room_id`,`position`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`room_id` text NOT NULL,
	`voter_id` text NOT NULL,
	`option_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_id`) REFERENCES `room_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_room_id_voter_id_idx` ON `votes` (`room_id`,`voter_id`);--> statement-breakpoint
CREATE INDEX `votes_option_id_idx` ON `votes` (`option_id`);