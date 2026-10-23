CREATE TABLE `assessment_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`result_id` text NOT NULL,
	`note` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`result_id`) REFERENCES `assessment_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_feedback_result_unique` ON `assessment_feedback` (`result_id`);--> statement-breakpoint
CREATE TABLE `assessment_results` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`process_score` real,
	`product_score` real,
	`final_score` real NOT NULL,
	`category` text NOT NULL,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_results_unique` ON `assessment_results` (`assessment_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `assessment_results_assessment_idx` ON `assessment_results` (`assessment_id`);--> statement-breakpoint
CREATE TABLE `assessment_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`indicator_id` text NOT NULL,
	`raw_value` real NOT NULL,
	`normalized_value` real NOT NULL,
	`kind` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_scores_unique` ON `assessment_scores` (`assessment_id`,`student_id`,`indicator_id`);--> statement-breakpoint
CREATE INDEX `assessment_scores_assessment_idx` ON `assessment_scores` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `assessment_scores_student_idx` ON `assessment_scores` (`student_id`);--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`class_id` text NOT NULL,
	`instrument_id` text NOT NULL,
	`instrument_snapshot_json` text NOT NULL,
	`participant_ids_json` text DEFAULT '[]' NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`finalized_at` text,
	`reopened_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assessments_teacher_date_idx` ON `assessments` (`teacher_id`,`date`);--> statement-breakpoint
CREATE INDEX `assessments_class_idx` ON `assessments` (`class_id`);--> statement-breakpoint
CREATE INDEX `assessments_instrument_idx` ON `assessments` (`instrument_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`name` text NOT NULL,
	`grade_level` integer NOT NULL,
	`academic_year` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classes_teacher_name_year_unique` ON `classes` (`teacher_id`,`name`,`academic_year`);--> statement-breakpoint
CREATE INDEX `classes_teacher_idx` ON `classes` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `export_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`assessment_id` text,
	`class_id` text,
	`format` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`r2_key` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `export_jobs_teacher_idx` ON `export_jobs` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `export_jobs_status_idx` ON `export_jobs` (`status`);--> statement-breakpoint
CREATE TABLE `instruments` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`version` integer NOT NULL,
	`group` text NOT NULL,
	`name` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instruments_slug_version_unique` ON `instruments` (`slug`,`version`);--> statement-breakpoint
CREATE INDEX `instruments_group_idx` ON `instruments` (`group`);--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_resets_token_unique` ON `password_resets` (`token_hash`);--> statement-breakpoint
CREATE INDEX `password_resets_user_idx` ON `password_resets` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_unique` ON `sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`class_id` text NOT NULL,
	`full_name` text NOT NULL,
	`nis` text NOT NULL,
	`sex` text NOT NULL,
	`birth_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_class_nis_unique` ON `students` (`class_id`,`nis`);--> statement-breakpoint
CREATE INDEX `students_class_idx` ON `students` (`class_id`);--> statement-breakpoint
CREATE INDEX `students_teacher_idx` ON `students` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`nip` text,
	`school` text,
	`role` text DEFAULT 'teacher' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);