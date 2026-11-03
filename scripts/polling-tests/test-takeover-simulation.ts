import assert from 'node:assert';

import {
  claimForegroundPoller,
  getLocalCreations,
  getTaskLockName,
  pollPendingCreationTasks,
  releaseForegroundPoller,
  saveLocalCreation,
} from '../../src/modules/creations/store';
import {
  currentClientId,
  globalLockManager,
  globalStorage,
  mockTaskDb,
  networkCalls,
  sleep,
} from './simulator';

export async function runTest4() {
  console.log(
    'Test 4: Poller timer preserved when tasks are locked; seamless takeover when holder tab closes'
  );

  globalStorage.clear();
  networkCalls.length = 0;
  mockTaskDb.clear();

  const taskId = 'task-takeover-1';
  saveLocalCreation({
    id: taskId,
    prompt: 'Cyberpunk city',
    mediaType: 'video',
    status: 'pending',
    url: '',
    createdAt: Date.now(),
  });
  mockTaskDb.set(taskId, { taskId, taskStatus: 'processing' });

  currentClientId.value = 'tab-1';
  let tab1Closed = false;
  const tab1Session = (globalThis as any).navigator.locks.request(
    getTaskLockName(taskId),
    async () => {
      claimForegroundPoller(taskId);
      while (!tab1Closed) {
        await sleep(15);
      }
      releaseForegroundPoller(taskId);
    }
  );
  await sleep(5);

  currentClientId.value = 'tab-2';
  pollPendingCreationTasks();
  await sleep(25);

  const initialTab2Calls = networkCalls.filter((c) => c.tabId === 'tab-2');
  assert.strictEqual(
    initialTab2Calls.length,
    0,
    'Tab 2 must not query while Tab 1 holds the lock'
  );

  tab1Closed = true;
  await tab1Session;
  globalLockManager.releaseAllByClient('tab-1');

  mockTaskDb.set(taskId, {
    taskId,
    taskStatus: 'success',
    videoUrl: 'https://example.com/cyberpunk.mp4',
    taskInfo: { video_url: 'https://example.com/cyberpunk.mp4' },
  });

  await sleep(3200);

  const takeoverCalls = networkCalls.filter(
    (c) => c.tabId === 'tab-2' && c.url.includes(taskId)
  );
  assert(
    takeoverCalls.length > 0,
    'Tab 2 must take over polling and query server'
  );
  const updatedList = getLocalCreations();
  const updatedItem = updatedList.find((c) => c.id === taskId);
  assert.strictEqual(
    updatedItem?.status,
    'success',
    'Task status must be updated to success by Tab 2'
  );

  console.log(
    '  ✅ Test 4 Passed: Reschedule timer remained active and seamlessly took over upon tab close.'
  );
}

export async function runTest5() {
  console.log(
    'Test 5: Realistic multi-tab simulation (3 tabs, 3 tasks, zero collision)'
  );

  globalStorage.clear();
  networkCalls.length = 0;
  mockTaskDb.clear();

  const task1 = 'task-multi-1'; // foreground on Tab 1
  const task2 = 'task-multi-2'; // background
  const task3 = 'task-multi-3'; // background

  saveLocalCreation({
    id: task1,
    prompt: 'p1',
    mediaType: 'image',
    status: 'pending',
    url: '',
    createdAt: Date.now(),
  });
  saveLocalCreation({
    id: task2,
    prompt: 'p2',
    mediaType: 'image',
    status: 'pending',
    url: '',
    createdAt: Date.now(),
  });
  saveLocalCreation({
    id: task3,
    prompt: 'p3',
    mediaType: 'image',
    status: 'pending',
    url: '',
    createdAt: Date.now(),
  });

  mockTaskDb.set(task1, { taskId: task1, taskStatus: 'processing' });
  mockTaskDb.set(task2, { taskId: task2, taskStatus: 'processing' });
  mockTaskDb.set(task3, { taskId: task3, taskStatus: 'processing' });

  currentClientId.value = 'tab-1';
  let tab1Done = false;
  const tab1Run = (globalThis as any).navigator.locks.request(
    getTaskLockName(task1),
    async () => {
      claimForegroundPoller(task1);
      let step = 0;
      while (!tab1Done) {
        step++;
        networkCalls.push({
          tabId: 'tab-1',
          url: `/api/ai/task?taskId=${task1}`,
          timestamp: Date.now(),
        });
        if (step >= 2) {
          mockTaskDb.set(task1, {
            taskId: task1,
            taskStatus: 'success',
            imageUrl: 'https://img.com/1.png',
            taskInfo: { image_url: 'https://img.com/1.png' },
          });
          saveLocalCreation({
            id: task1,
            prompt: 'p1',
            mediaType: 'image',
            status: 'success',
            url: 'https://img.com/1.png',
            createdAt: Date.now(),
          });
          break;
        }
        await sleep(20);
      }
      releaseForegroundPoller(task1);
    }
  );

  currentClientId.value = 'tab-2';
  pollPendingCreationTasks();

  currentClientId.value = 'tab-3';
  pollPendingCreationTasks();

  await sleep(60);

  mockTaskDb.set(task2, {
    taskId: task2,
    taskStatus: 'success',
    imageUrl: 'https://img.com/2.png',
    taskInfo: { image_url: 'https://img.com/2.png' },
  });
  mockTaskDb.set(task3, {
    taskId: task3,
    taskStatus: 'success',
    imageUrl: 'https://img.com/3.png',
    taskInfo: { image_url: 'https://img.com/3.png' },
  });

  await sleep(3200);

  tab1Done = true;
  await tab1Run;

  const bgQueriesForTask1 = networkCalls.filter(
    (c) => (c.tabId === 'tab-2' || c.tabId === 'tab-3') && c.url.includes(task1)
  );
  assert.strictEqual(
    bgQueriesForTask1.length,
    0,
    'Foreground Task 1 must never be queried by background tabs'
  );

  const finalList = getLocalCreations();
  assert.strictEqual(finalList.find((c) => c.id === task1)?.status, 'success');
  assert.strictEqual(finalList.find((c) => c.id === task2)?.status, 'success');
  assert.strictEqual(finalList.find((c) => c.id === task3)?.status, 'success');

  console.log(
    '  ✅ Test 5 Passed: Multi-tab real-life simulation succeeded with zero query collisions.'
  );
}
