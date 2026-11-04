import { describe, expect, it, vi } from 'vitest';

import {
  inputReferencesAsset,
  runScreenshotMaintenance,
  type MaintenanceStore,
} from './screenshots-maintenance';

function store(): MaintenanceStore {
  return {
    pending: async () => [{ id: 'task', userId: 'owner' }],
    expired: async () => [
      { id: 'asset', objectKey: 'screenshots/test image.png' },
    ],
    activeInputs: async () => [],
    refresh: vi.fn().mockResolvedValue({ status: 'processing' }),
    removeObject: vi.fn().mockResolvedValue(undefined),
    removeRecord: vi.fn().mockResolvedValue(undefined),
  };
}

describe('screenshot maintenance', () => {
  it('preview never submits, deletes or changes records', async () => {
    const s = store();
    expect(await runScreenshotMaintenance(s)).toMatchObject({
      mode: 'preview',
      pendingTasks: 1,
      expiredInputs: 1,
    });
    expect(s.refresh).not.toHaveBeenCalled();
    expect(s.removeObject).not.toHaveBeenCalled();
    expect(s.removeRecord).not.toHaveBeenCalled();
  });
  it('recovers tasks before deleting unused expired objects, then their records', async () => {
    const s = store();
    expect(await runScreenshotMaintenance(s, true)).toMatchObject({
      refreshed: 1,
      deleted: 1,
      failed: 0,
    });
    expect(vi.mocked(s.refresh).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(s.removeObject).mock.invocationCallOrder[0]
    );
    expect(vi.mocked(s.removeObject).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(s.removeRecord).mock.invocationCallOrder[0]
    );
  });
  it('retains sources referenced by an uncertain task even after refresh fails', async () => {
    const s = store();
    s.refresh = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    s.activeInputs = async () => [
      {
        input: JSON.stringify({
          images: [
            'https://r2.example/bucket/screenshots/test%20image.png?signature=x',
          ],
        }),
      },
    ];
    expect(await runScreenshotMaintenance(s, true)).toMatchObject({
      failed: 1,
      retained: 1,
      deleted: 0,
    });
    expect(s.removeObject).not.toHaveBeenCalled();
  });
  it('does not remove database records if storage deletion fails', async () => {
    const s = store();
    s.removeObject = vi.fn().mockRejectedValue(new Error('storage offline'));
    expect(await runScreenshotMaintenance(s, true)).toMatchObject({
      failed: 1,
      deleted: 0,
    });
    expect(s.removeRecord).not.toHaveBeenCalled();
  });
  it('retains assets when active references cannot be safely interpreted', () => {
    for (const input of [
      'bad json',
      '{}',
      '{"images":[]}',
      '{"images":["not a URL"]}',
    ]) {
      expect(inputReferencesAsset(input, 'screenshots/a.png')).toBe(true);
    }
    expect(
      inputReferencesAsset(
        '{"images":["https://r2.example/bucket/screenshots/b.png"]}',
        'screenshots/a.png'
      )
    ).toBe(false);
  });
});
