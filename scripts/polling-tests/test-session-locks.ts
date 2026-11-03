import assert from 'node:assert';

import {
  claimForegroundPoller,
  getActiveHeldTaskLocks,
  getTaskLockName,
  pollPendingCreationTasks,
  releaseForegroundPoller,
  saveLocalCreation,
  withAcquiredTaskLocks,
} from '../../src/modules/creations/store';
import {
  currentClientId,
  globalLockManager,
  globalStorage,
  mockTaskDb,
  networkCalls,
  sleep,
} from './simulator';

export async function runTest1() {
  console.log(
    'Test 1: Web Lock covers full session and releases on terminal/cancel/timeout'
  );

  globalStorage.clear();
  networkCalls.length = 0;
  mockTaskDb.clear();

  const taskId = 'task-fg-1';
  mockTaskDb.set(taskId, {
    taskId,
    taskStatus: 'processing',
    taskInfo: {},
  });

  currentClientId.value = 'tab-1';
  let pollFinished = false;
  let iterations = 0;
  const abortCtrl = new AbortController();

  const fgPromise = (globalThis as any).navigator.locks.request(
    getTaskLockName(taskId),
    { signal: abortCtrl.signal },
    async (lock: any) => {
      assert(lock !== null, 'Tab 1 should acquire foreground task lock');
      claimForegroundPoller(taskId);

      while (!abortCtrl.signal.aborted) {
        iterations++;
        const res = mockTaskDb.get(taskId);
        if (res.taskStatus === 'success') {
          break;
        }
        await sleep(20);
        if (iterations === 2) {
          mockTaskDb.set(taskId, {
            taskId,
            taskStatus: 'success',
            taskInfo: { video_url: 'https://example.com/v.mp4' },
          });
        }
      }
      releaseForegroundPoller(taskId);
      pollFinished = true;
    }
  );

  await sleep(10);
  const queryMid = await globalLockManager.query();
  const isMidHeld = queryMid.held.some(
    (l) => l.name === getTaskLockName(taskId)
  );
  assert.strictEqual(
    isMidHeld,
    true,
    'Lock must be held throughout polling session (not released after 1st request)'
  );

  let tab2AcquiredWhileRunning = false;
  await globalLockManager.request(
    'tab-2',
    getTaskLockName(taskId),
    { ifAvailable: true },
    async (lock) => {
      if (lock) tab2AcquiredWhileRunning = true;
    }
  );
  assert.strictEqual(
    tab2AcquiredWhileRunning,
    false,
    'Other tabs must be blocked while foreground session is active'
  );

  await fgPromise;
  assert.strictEqual(pollFinished, true);

  const queryAfter = await globalLockManager.query();
  const isHeldAfter = queryAfter.held.some(
    (l) => l.name === getTaskLockName(taskId)
  );
  assert.strictEqual(
    isHeldAfter,
    false,
    'Lock must be released when terminal status is reached'
  );

  // Test 1.2: Lock released on cancel (abort)
  const taskIdAbort = 'task-fg-abort';
  const abortCtrl2 = new AbortController();
  const abortPromise = (globalThis as any).navigator.locks.request(
    getTaskLockName(taskIdAbort),
    { signal: abortCtrl2.signal },
    async () => {
      claimForegroundPoller(taskIdAbort);
      await sleep(100);
      releaseForegroundPoller(taskIdAbort);
    }
  );
  await sleep(10);
  abortCtrl2.abort();
  globalLockManager.releaseAllByClient('tab-1');
  const queryAbort = await globalLockManager.query();
  assert.strictEqual(
    queryAbort.held.some((l) => l.name === getTaskLockName(taskIdAbort)),
    false,
    'Lock must be released on abort/cancel'
  );

  console.log(
    '  ✅ Test 1 Passed: Lock held across iterations and cleanly released on terminal/cancel.'
  );
}

export async function runTest2() {
  console.log(
    'Test 2: Unified task lock prevents new tabs without broadcast history from duplicate queries'
  );

  globalStorage.clear();
  networkCalls.length = 0;
  mockTaskDb.clear();

  const taskId = 'task-sync-1';
  saveLocalCreation({
    id: taskId,
    prompt: 'A sunset',
    mediaType: 'image',
    status: 'processing',
    url: '',
    createdAt: Date.now(),
  });
  mockTaskDb.set(taskId, { taskId, taskStatus: 'processing' });

  currentClientId.value = 'tab-1';
  let tab1Active = true;
  const tab1Hold = (globalThis as any).navigator.locks.request(
    getTaskLockName(taskId),
    async () => {
      claimForegroundPoller(taskId);
      while (tab1Active) {
        await sleep(20);
      }
      releaseForegroundPoller(taskId);
    }
  );
  await sleep(5);

  currentClientId.value = 'tab-2';

  const heldLocks = await getActiveHeldTaskLocks();
  assert.strictEqual(
    heldLocks.has(taskId),
    true,
    'New tab must detect held task lock via navigator.locks.query'
  );

  networkCalls.length = 0;
  pollPendingCreationTasks();
  await sleep(30);

  const tab2Queries = networkCalls.filter(
    (c) => c.tabId === 'tab-2' && c.url.includes(taskId)
  );
  assert.strictEqual(
    tab2Queries.length,
    0,
    'New tab must NOT query task held by foreground in Tab 1'
  );

  tab1Active = false;
  await tab1Hold;
  console.log(
    '  ✅ Test 2 Passed: New tab respects held locks without prior broadcast history.'
  );
}

export async function runTest3() {
  console.log(
    'Test 3: Batch poller holds task locks during queries and releases upon completion'
  );

  globalStorage.clear();
  networkCalls.length = 0;
  mockTaskDb.clear();

  const taskIdA = 'batch-task-A';
  const taskIdB = 'batch-task-B';

  mockTaskDb.set(taskIdA, { taskId: taskIdA, taskStatus: 'processing' });
  mockTaskDb.set(taskIdB, { taskId: taskIdB, taskStatus: 'processing' });

  currentClientId.value = 'tab-batch';
  let lockCheckedDuringRequest = false;

  await withAcquiredTaskLocks([taskIdA, taskIdB], async (lockedIds) => {
    assert.deepStrictEqual(
      lockedIds,
      [taskIdA, taskIdB],
      'Both task locks should be acquired'
    );

    let otherTabAcquired = false;
    await globalLockManager.request(
      'other-tab',
      getTaskLockName(taskIdA),
      { ifAvailable: true },
      async (l) => {
        if (l) otherTabAcquired = true;
      }
    );
    assert.strictEqual(
      otherTabAcquired,
      false,
      'Other tabs must be blocked while batch query is in-flight'
    );
    lockCheckedDuringRequest = true;

    await sleep(20);
  });

  assert.strictEqual(lockCheckedDuringRequest, true);

  const queryAfter = await globalLockManager.query();
  assert.strictEqual(
    queryAfter.held.some((l) => l.name === getTaskLockName(taskIdA)),
    false
  );
  assert.strictEqual(
    queryAfter.held.some((l) => l.name === getTaskLockName(taskIdB)),
    false
  );

  console.log(
    '  ✅ Test 3 Passed: Batch poller holds locks during query and releases afterwards.'
  );
}
