CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	`embedding` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text DEFAULT 'default' NOT NULL,
	`filename` text NOT NULL,
	`file_type` text NOT NULL,
	`markdown_content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `global_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`scope` text DEFAULT 'always' NOT NULL,
	`model_filter` text,
	`category` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_unique` ON `projects` (`name`);--> statement-breakpoint
DROP INDEX `api_keys_provider_unique`;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `api_keys` ADD `label` text NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `hint` text NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` DROP COLUMN `provider`;--> statement-breakpoint
ALTER TABLE `conversations` ADD `project_id` text DEFAULT 'default' NOT NULL REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `model_id` text REFERENCES models(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `summary` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `summarized_count` integer DEFAULT 0 NOT NULL;