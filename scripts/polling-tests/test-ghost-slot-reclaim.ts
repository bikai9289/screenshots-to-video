import assert from 'node:assert';

import { currentClientId, mockTaskDb, networkCalls, sleep } from './simulator';

export async function runTest8() {
  console.log('--- Test Suite 8: Ghost Slot Reclaim & Concurrency Safety ---');

  const userId = 'user-ghost-suite';
  const MAX_ACTIVE_SLOTS = 10;
  const TASK_TIMEOUT_MS = 20 * 60 * 1000;

  // In-memory simulator for ai_task table with unique (userId, activeSlot) index
  interface DbAiTask {
    id: string;
    userId: string;
    taskId: string;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'canceled';
    activeSlot: number | null;
    createdAt: Date;
    pollLeaseExpiresAt: Date | null;
  }

  let dbAiTasks: DbAiTask[] = [];

  // Helper: simulates insert with unique index enforcement on (userId, activeSlot)
  function tryInsertTask(data: Omit<DbAiTask, 'pollLeaseExpiresAt'>): boolean {
    if (data.activeSlot !== null) {
      const conflict = dbAiTasks.some(
        (t) => t.userId === data.userId && t.activeSlot === data.activeSlot
      );
      if (conflict) {
        return false; // Unique index conflict
      }
    }
    dbAiTasks.push({ ...data, pollLeaseExpiresAt: null });
    return true;
  }

  // Helper: implementation of the generation endpoint's slot allocation logic
  async function simulateGenerateRequest(
    taskId: string,
    createdAt = new Date()
  ): Promise<{ success: boolean; error?: string; assignedSlot?: number }> {
    let reserved = false;
    let assignedSlot: number | undefined;

    // First attempt: try finding an available activeSlot (0..9)
    for (let slot = 0; slot < MAX_ACTIVE_SLOTS; slot++) {
      if (
        tryInsertTask({
          id: taskId,
          userId,
          taskId: `vendor-${taskId}`,
          status: 'pending',
          activeSlot: slot,
          createdAt,
        })
      ) {
        reserved = true;
        assignedSlot = slot;
        break;
      }
    }

    if (!reserved) {
      // Reclaim ghost slots
      await simulateReclaimUserGhostSlots(userId);

      // Retry allocation
      for (let slot = 0; slot < MAX_ACTIVE_SLOTS; slot++) {
        if (
          tryInsertTask({
            id: taskId,
            userId,
            taskId: `vendor-${taskId}`,
            status: 'pending',
            activeSlot: slot,
            createdAt,
          })
        ) {
          reserved = true;
          assignedSlot = slot;
          break;
        }
      }
    }

    if (!reserved) {
      return {
        success: false,
        error: `You already have ${MAX_ACTIVE_SLOTS} active generation tasks. Please wait for one to finish before submitting another.`,
      };
    }

    return { success: true, assignedSlot };
  }

  // Helper: implementation of reclaimUserGhostSlots in task.ts
  async function simulateReclaimUserGhostSlots(uid: string): Promise<number> {
    const held = dbAiTasks.filter(
      (t) =>
        t.userId === uid &&
        t.activeSlot !== null &&
        (t.status === 'pending' || t.status === 'processing')
    );

    const now = Date.now();
    let released = 0;

    for (const t of held) {
      // Check timeout window first (20m expiration)
      if (now - t.createdAt.getTime() > TASK_TIMEOUT_MS) {
        t.status = 'failed';
        t.activeSlot = null;
        released++;
        continue;
      }

      // Sync with vendor API
      const vendorResult = mockTaskDb.get(t.taskId);
      if (vendorResult?.taskStatus === 'success') {
        t.status = 'success';
        t.activeSlot = null; // Verified complete -> released!
        released++;
      } else if (
        vendorResult?.taskStatus === 'failed' ||
        vendorResult?.taskStatus === 'canceled'
      ) {
        t.status = vendorResult.taskStatus;
        t.activeSlot = null; // Verified failed -> released!
        released++;
      }
      // If vendorResult is 'processing' and within timeout window:
      // activeSlot remains strictly held!
    }

    return released;
  }

  // =========================================================================
  // Case 8.1: Ghost Slot Reclaim on Verified Vendor Completion (No 20m Lockup)
  // =========================================================================
  console.log(
    '  Case 8.1: Ghost slot reclaim when closed tab tasks finish at vendor'
  );
  {
    dbAiTasks = [];
    mockTaskDb.clear();

    // User creates 10 tasks, filling all 10 slots
    for (let i = 0; i < 10; i++) {
      const id = `task-8-1-${i}`;
      tryInsertTask({
        id,
        userId,
        taskId: `vendor-${id}`,
        status: 'processing',
        activeSlot: i,
        createdAt: new Date(Date.now() - 3 * 60 * 1000), // created 3m ago
      });
      // Vendor side: 4 of them finished, 6 still processing
      if (i < 3) {
        mockTaskDb.set(`vendor-${id}`, { taskStatus: 'success' });
      } else if (i === 3) {
        mockTaskDb.set(`vendor-${id}`, { taskStatus: 'failed' });
      } else {
        mockTaskDb.set(`vendor-${id}`, { taskStatus: 'processing' });
      }
    }

    // Prior to reclaim, all 10 slots are occupied
    assert.strictEqual(
      dbAiTasks.filter((t) => t.activeSlot !== null).length,
      10
    );

    // User submits task 11 after reopening the page
    const res = await simulateGenerateRequest('task-8-1-new');

    assert.strictEqual(
      res.success,
      true,
      'New task must successfully obtain a slot'
    );
    assert(res.assignedSlot !== undefined && res.assignedSlot < 4);

    // 4 slots were released by vendor sync, 1 was acquired by the new task -> 7 occupied
    const occupiedSlots = dbAiTasks.filter((t) => t.activeSlot !== null);
    assert.strictEqual(occupiedSlots.length, 7);

    console.log(
      '    ✅ Case 8.1 Passed: 4 ghost slots reclaimed immediately upon vendor confirmation without 20m lockup.'
    );
  }

  // =========================================================================
  // Case 8.2: Concurrency Enforcement for Genuine Slow Tasks (No Breach)
  // =========================================================================
  console.log(
    '  Case 8.2: Strict concurrency limit preserved for genuine slow tasks'
  );
  {
    dbAiTasks = [];
    mockTaskDb.clear();

    // All 10 tasks are genuinely running at vendor (processing, created 2m ago)
    for (let i = 0; i < 10; i++) {
      const id = `task-8-2-${i}`;
      tryInsertTask({
        id,
        userId,
        taskId: `vendor-${id}`,
        status: 'processing',
        activeSlot: i,
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      });
      mockTaskDb.set(`vendor-${id}`, { taskStatus: 'processing' });
    }

    // User attempts to submit task 11 while 10 tasks are legitimately in-flight
    const res = await simulateGenerateRequest('task-8-2-breach-attempt');

    assert.strictEqual(
      res.success,
      false,
      'Must NOT allow 11th task while 10 tasks are genuinely processing'
    );
    assert(res.error?.includes('already have 10 active generation tasks'));

    // Slots must remain strictly at 10
    const occupiedSlots = dbAiTasks.filter((t) => t.activeSlot !== null);
    assert.strictEqual(occupiedSlots.length, 10);

    console.log(
      '    ✅ Case 8.2 Passed: Slow running tasks are not prematurely evicted; 10-task limit strictly enforced.'
    );
  }

  // =========================================================================
  // Case 8.3: Timeout Window (20m) Fallback Reclaim
  // =========================================================================
  console.log(
    '  Case 8.3: Abandoned tasks exceeding 20m timeout window are reclaimed'
  );
  {
    dbAiTasks = [];
    mockTaskDb.clear();

    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      const id = `task-8-3-${i}`;
      // slots 0-1: 21 minutes old (timed out)
      // slots 2-9: 5 minutes old, still processing
      const ageMs = i < 2 ? 21 * 60 * 1000 : 5 * 60 * 1000;
      tryInsertTask({
        id,
        userId,
        taskId: `vendor-${id}`,
        status: 'processing',
        activeSlot: i,
        createdAt: new Date(now - ageMs),
      });
      mockTaskDb.set(`vendor-${id}`, { taskStatus: 'processing' });
    }

    // Submitting new task should trigger timeout reclaim on the 2 aged tasks
    const res = await simulateGenerateRequest('task-8-3-new');

    assert.strictEqual(res.success, true);
    assert(res.assignedSlot === 0 || res.assignedSlot === 1);

    // Timed out tasks should be marked failed
    const timedOut = dbAiTasks.filter(
      (t) =>
        (t.id === 'task-8-3-0' || t.id === 'task-8-3-1') &&
        t.status === 'failed'
    );
    assert.strictEqual(timedOut.length, 2);

    console.log(
      '    ✅ Case 8.3 Passed: Timed-out tasks reclaimed cleanly and slot re-assigned.'
    );
  }

  console.log('\n🎉 ALL GHOST SLOT TEST CASES PASSED SUCCESSFULLY!\n');
}
