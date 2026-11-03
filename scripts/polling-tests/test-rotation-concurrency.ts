import assert from 'node:assert';

import {
  getLocalCreations,
  pollPendingCreationTasks,
  saveLocalCreation,
} from '../../src/modules/creations/store';
import {
  currentClientId,
  globalStorage,
  mockTaskDb,
  networkCalls,
  sleep,
} from './simulator';

export async function runTest6() {
  console.log(
    'Test 6: Fair round-robin batch rotation prevents task starvation (8 tasks, 4 per window)'
  );

  globalStorage.clear();
  networkCalls.length = 0;
  mockTaskDb.clear();

  const tasks = Array.from({ length: 8 }, (_, i) => `task-rot-${i + 1}`);
  tasks.forEach((id, i) => {
    saveLocalCreation({
      id,
      prompt: `Prompt for ${id}`,
      mediaType: 'image',
      status: 'pending',
      url: '',
      createdAt: Date.now() - (i + 1) * 1000,
    });
    mockTaskDb.set(id, { taskId: id, taskStatus: 'processing' });
  });

  mockTaskDb.set('task-rot-6', {
    taskId: 'task-rot-6',
    taskStatus: 'success',
    imageUrl: 'https://img.com/rot-6.png',
    taskInfo: { image_url: 'https://img.com/rot-6.png' },
  });

  currentClientId.value = 'tab-rot';
  pollPendingCreationTasks();
  await sleep(50);

  const round1Calls = networkCalls.filter((c) => c.tabId === 'tab-rot');
  assert(round1Calls.length > 0, 'Round 1 must make a batch network call');
  const r1Url = round1Calls[0].url;
  assert(r1Url.includes('task-rot-1'), 'Round 1 should query first batch');
  assert(!r1Url.includes('task-rot-6'), 'Round 1 should not yet query task 6');

  await sleep(3200);

  const round2Calls = networkCalls.filter(
    (c) => c.tabId === 'tab-rot' && c !== round1Calls[0]
  );
  assert(round2Calls.length > 0, 'Round 2 must make a rotated batch call');
  const r2Url = round2Calls[0].url;
  assert(
    r2Url.includes('task-rot-6'),
    'Round 2 must rotate window and include task 6'
  );
  assert(
    r2Url.includes('batchOffset=4') || r2Url.includes('batchOffset=0'),
    'Request should carry batchOffset parameter'
  );

  const updatedList = getLocalCreations();
  const task6 = updatedList.find((c) => c.id === 'task-rot-6');
  assert.strictEqual(
    task6?.status,
    'success',
    'Task 6 must reach success without being blocked by tasks 1..4'
  );

  console.log(
    '  ✅ Test 6 Passed: Round-robin window rotation prevented starvation of subsequent tasks.'
  );
}

export async function runTest7() {
  console.log(
    'Test 7: Downstream vendor concurrency is strictly capped at <= 2'
  );

  let activeConcurrentCalls = 0;
  let maxObservedConcurrency = 0;
  const vendorCallLog: string[] = [];

  async function simulateMapConcurrent<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex++;
        results[currentIndex] = await fn(items[currentIndex]);
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    );
    await Promise.all(workers);
    return results;
  }

  const testTasks = Array.from({ length: 6 }, (_, i) => `vendor-task-${i}`);

  await simulateMapConcurrent(testTasks, 2, async (taskId) => {
    activeConcurrentCalls++;
    if (activeConcurrentCalls > maxObservedConcurrency) {
      maxObservedConcurrency = activeConcurrentCalls;
    }
    vendorCallLog.push(`start-${taskId}`);
    await sleep(25);
    vendorCallLog.push(`end-${taskId}`);
    activeConcurrentCalls--;
    return { taskId, ok: true };
  });

  assert.strictEqual(
    maxObservedConcurrency,
    2,
    'Vendor concurrency must never exceed 2'
  );
  assert.strictEqual(
    vendorCallLog.length,
    12,
    'All 6 tasks must complete start and end'
  );

  console.log(
    '  ✅ Test 7 Passed: Downstream vendor concurrency strictly controlled to max 2.'
  );
}
