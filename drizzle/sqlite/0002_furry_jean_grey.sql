ALTER TABLE `screenshot_task` ADD `submission_attempts` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Older uncertain submissions have no reliable attempt history. Stop replaying
-- them automatically; known provider tasks continue normal status queries.
UPDATE `screenshot_task` SET `submission_attempts` = 3
WHERE `status` = 'reserved' AND `lease_until` <> '1970-01-01T00:00:00.000Z';
