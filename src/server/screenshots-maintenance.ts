type PendingTask = { id: string; userId: string };
type ExpiredAsset = { id: string; objectKey: string };

export type MaintenanceStore = {
  pending: () => Promise<PendingTask[]>;
  expired: () => Promise<ExpiredAsset[]>;
  activeInputs: () => Promise<{ input: string }[]>;
  refresh: (task: PendingTask) => Promise<unknown>;
  removeObject: (asset: ExpiredAsset) => Promise<void>;
  removeRecord: (asset: ExpiredAsset) => Promise<void>;
};

// Unknown/malformed references fail closed: retain the input rather than risk
// breaking an accepted provider request. Compare decoded S3 paths, not query strings.
export function inputReferencesAsset(
  input: string,
  objectKey: string
): boolean {
  try {
    const images = JSON.parse(input).images;
    if (!Array.isArray(images) || images.length === 0) return true;
    return images.some((image) => {
      const pathname = decodeURIComponent(new URL(image).pathname);
      return pathname.endsWith('/' + objectKey);
    });
  } catch {
    return true;
  }
}

export async function runScreenshotMaintenance(
  store: MaintenanceStore,
  apply = false
) {
  const [tasks, assets] = await Promise.all([store.pending(), store.expired()]);
  const result = {
    mode: apply ? 'apply' : 'preview',
    pendingTasks: tasks.length,
    expiredInputs: assets.length,
    refreshed: 0,
    deleted: 0,
    retained: 0,
    failed: 0,
  };
  if (!apply) return result;
  for (const task of tasks) {
    try {
      await store.refresh(task);
      result.refreshed++;
    } catch {
      result.failed++;
    }
  }
  for (const asset of assets) {
    try {
      const active = await store.activeInputs();
      if (
        active.some((task) => inputReferencesAsset(task.input, asset.objectKey))
      ) {
        result.retained++;
        continue;
      }
      await store.removeObject(asset);
      await store.removeRecord(asset);
      result.deleted++;
    } catch {
      result.failed++;
    }
  }
  return result;
}

export async function maintainScreenshots(apply = false) {
  const [
    { and, asc, eq, inArray, lt },
    { db },
    { screenshotAsset, screenshotTask },
    { getAllConfigs },
    { ScreenshotStorage },
    { refreshScreenshotTask },
  ] = await Promise.all([
    import('drizzle-orm'),
    import('@/core/db'),
    import('@/config/db/schema'),
    import('@/modules/config/service'),
    import('@/core/storage/screenshots'),
    import('@/server/screenshots'),
  ]);
  const now = new Date().toISOString();
  let storage: InstanceType<typeof ScreenshotStorage> | undefined;
  return runScreenshotMaintenance(
    {
      pending: () =>
        db()
          .select({ id: screenshotTask.id, userId: screenshotTask.userId })
          .from(screenshotTask)
          .where(inArray(screenshotTask.status, ['reserved', 'processing']))
          .orderBy(asc(screenshotTask.updatedAt))
          .limit(20),
      expired: () =>
        db()
          .select({
            id: screenshotAsset.id,
            objectKey: screenshotAsset.objectKey,
          })
          .from(screenshotAsset)
          .where(lt(screenshotAsset.expiresAt, now))
          .orderBy(asc(screenshotAsset.expiresAt))
          .limit(50),
      activeInputs: () =>
        db()
          .select({ input: screenshotTask.input })
          .from(screenshotTask)
          .where(inArray(screenshotTask.status, ['reserved', 'processing'])),
      refresh: (task) => refreshScreenshotTask(task.userId, task.id),
      removeObject: async (asset) => {
        storage ??= new ScreenshotStorage(await getAllConfigs());
        await storage.remove(asset.objectKey);
      },
      removeRecord: async (asset) => {
        await db()
          .delete(screenshotAsset)
          .where(
            and(
              eq(screenshotAsset.id, asset.id),
              lt(screenshotAsset.expiresAt, now)
            )
          );
      },
    },
    apply
  );
}
