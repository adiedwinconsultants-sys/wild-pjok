ALTER TABLE `users` ADD `auth_provider` text DEFAULT 'password' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `workos_user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_workos_user_unique` ON `users` (`workos_user_id`);