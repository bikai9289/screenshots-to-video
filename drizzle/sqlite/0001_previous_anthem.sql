CREATE TABLE `screenshot_credit_allocation` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`order_id` text NOT NULL,
	`credits` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `screenshot_task`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_screenshot_allocation_order` ON `screenshot_credit_allocation` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_screenshot_allocation_task` ON `screenshot_credit_allocation` (`task_id`);