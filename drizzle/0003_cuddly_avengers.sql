CREATE TABLE `workspace_users` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_user_id` text,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_users_email` ON `workspace_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_users_platform_id` ON `workspace_users` (`platform_user_id`);--> statement-breakpoint
CREATE INDEX `idx_workspace_users_role_active` ON `workspace_users` (`role`,`active`);