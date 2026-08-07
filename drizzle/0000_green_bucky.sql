CREATE TABLE IF NOT EXISTS `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content_md` text,
	`chapter_id` text,
	`order_num` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`parent_id` text,
	`order_num` integer DEFAULT 0 NOT NULL
);
