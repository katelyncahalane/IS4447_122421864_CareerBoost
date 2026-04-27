CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
