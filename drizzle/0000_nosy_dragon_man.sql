CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`name` text NOT NULL,
	`trigger_type` text NOT NULL,
	`action_type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`runs` integer DEFAULT 0 NOT NULL,
	`last_run` text DEFAULT 'Noch nie' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_automations_table_enabled` ON `automations` (`table_id`,`enabled`);--> statement-breakpoint
CREATE TABLE `bases` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT '2026-09-04T00:00:00.000Z' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `data_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`base_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT '2026-09-04T00:00:00.000Z' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_data_tables_base_id` ON `data_tables` (`base_id`);--> statement-breakpoint
CREATE TABLE `fields` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`hidden` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_fields_table_position` ON `fields` (`table_id`,`position`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`values_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_table_updated` ON `records` (`table_id`,`updated_at`);