DROP INDEX `users_workos_user_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `auth_provider`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `workos_user_id`;