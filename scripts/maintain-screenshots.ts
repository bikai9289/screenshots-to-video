import { loadEnvFiles } from '../src/lib/env';

loadEnvFiles();
const { and, asc, eq, inArray, lt } = await import('drizzle-orm');
const { db } = await import('../src/core/db');
const { screenshotAsset, screenshotTask } =
  await import('../src/config/db/schema');
const { getAllConfigs } = await import('../src/modules/config/service');
const { ScreenshotStorage } = await import('../src/core/storage/screenshots');
const { refreshScreenshotTask } = await import('../src/server/screenshots');

const apply = process.argv.includes('--apply');
const unknown = process.argv.slice(2).filter((value) => value !== '--apply');
if (unknown.length) throw new Error('Usage: maintain-screenshots.ts [--apply]');
const now = new Date().toISOString();
const tasks = await db()
  .select({
    id: screenshotTask.id,
    userId: screenshotTask.userId,
    status: screenshotTask.status,
  })
  .from(screenshotTask)
  .where(inArray(screenshotTask.status, ['reserved', 'processing']))
  .orderBy(asc(screenshotTask.updatedAt))
  .limit(20);
const expired = await db()
  .select({ id: screenshotAsset.id, objectKey: screenshotAsset.objectKey })
  .from(screenshotAsset)
  .where(lt(screenshotAsset.expiresAt, now))
  .orderBy(asc(screenshotAsset.expiresAt))
  .limit(50);

console.log(
  JSON.stringify({
    mode: apply ? 'apply' : 'preview',
    pendingTasks: tasks.length,
    expiredInputs: expired.length,
    limits: { tasks: 20, inputs: 50 },
  })
);
if (!apply) process.exit(0);

// A missing provider configuration must never turn an unresolved task into a failure/refund.
const storage = new ScreenshotStorage(await getAllConfigs());
let failed = 0;
for (const task of tasks) {
  try {
    const result = await refreshScreenshotTask(task.userId, task.id);
    console.log(
      JSON.stringify({
        taskId: task.id,
        status: result.status,
        errorCode: result.errorCode,
      })
    );
  } catch {
    failed++;
    console.error(
      JSON.stringify({
        taskId: task.id,
        result: 'check_failed_no_state_assumption',
      })
    );
  }
}
for (const asset of expired) {
  try {
    // Deleting a source still used by a pending task could invalidate an uncertain submission.
    const active = await db()
      .select({ input: screenshotTask.input })
      .from(screenshotTask)
      .where(inArray(screenshotTask.status, ['reserved', 'processing']));
    if (
      active.some((task: { input: string }) => {
        try {
          return (JSON.parse(task.input).images as string[]).some((url) =>
            new URL(url).pathname.endsWith('/' + asset.objectKey)
          );
        } catch {
          return true;
        }
      })
    )
      continue;
    await storage.remove(asset.objectKey);
    await db()
      .delete(screenshotAsset)
      .where(
        and(
          eq(screenshotAsset.id, asset.id),
          lt(screenshotAsset.expiresAt, now)
        )
      );
    console.log(JSON.stringify({ assetId: asset.id, result: 'deleted' }));
  } catch {
    failed++;
    console.error(
      JSON.stringify({ assetId: asset.id, result: 'delete_failed_retry_later' })
    );
  }
}
if (failed) process.exitCode = 1;
