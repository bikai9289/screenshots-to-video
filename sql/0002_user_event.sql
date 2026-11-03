CREATE TABLE IF NOT EXISTS `user_event` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `kind` text NOT NULL,
  `detail` text,
  `source` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `idx_user_event_user_created` ON `user_event` (`user_id`,`created_at`);
CREATE INDEX IF NOT EXISTS `idx_user_event_kind_created` ON `user_event` (`kind`,`created_at`);
