DELETE FROM `articles`;--> statement-breakpoint
DELETE FROM `categories`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content_md` text,
	`chapter_id` integer,
	`order_num` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_articles`("id", "title", "content_md", "chapter_id", "order_num") SELECT "id", "title", "content_md", "chapter_id", "order_num" FROM `articles`;--> statement-breakpoint
DROP TABLE `articles`;--> statement-breakpoint
ALTER TABLE `__new_articles` RENAME TO `articles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`parent_id` integer,
	`order_num` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_categories`("id", "name", "type", "parent_id", "order_num") SELECT "id", "name", "type", "parent_id", "order_num" FROM `categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;