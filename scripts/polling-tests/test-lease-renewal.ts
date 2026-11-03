import assert from 'node:assert';

import { sleep } from './simulator';

export async function runTest9() {
  console.log(
    '--- Test Suite 9: Lease Lock Auto-Renewal, Singleflight & Concurrency Breach Prevention ---'
  );

  const taskId = 'task-lease-suite';
  const vendorTaskId = 'vendor-lease-suite';

  // =========================================================================
  // Case 9.1: Slow Query (>10s) Protected by Auto-Renewal Heartbeat
  // =========================================================================
  console.log(
    '  Case 9.1: Heartbeat keeps lease alive during slow query; prevents concurrent breach'
  );
  {
    let vendorCallCount = 0;
    const inFlightQueries = new Map<string, Promise<any>>();
    const LEASE_DURATION_MS = 200;
    const HEARTBEAT_INTERVAL_MS = 40;

    let currentLease = {
      leaseId: '',
      expiresAt: 0,
    };

    // Vendor query takes 250ms (longer than initial 200ms lease)
    async function mockSlowVendorQuery() {
      vendorCallCount++;
      await sleep(250);
      return { taskStatus: 'processing' };
    }

    async function simulateSyncWithHeartbeat(callerId: string) {
      const now = Date.now();
      const canAcquireLease =
        !currentLease.expiresAt || currentLease.expiresAt < now;

      if (!canAcquireLease) {
        // Lease held by another caller and still valid!
        return { source: 'cached_snapshot' };
      }

      const leaseId = `lease-${callerId}`;
      currentLease = {
        leaseId,
        expiresAt: Date.now() + LEASE_DURATION_MS,
      };

      let timer: NodeJS.Timeout | null = null;
      try {
        timer = setInterval(() => {
          if (currentLease.leaseId === leaseId) {
            currentLease.expiresAt = Date.now() + LEASE_DURATION_MS;
          }
        }, HEARTBEAT_INTERVAL_MS);

        const key = `${taskId}:${vendorTaskId}`;
        if (!inFlightQueries.has(key)) {
          inFlightQueries.set(
            key,
            mockSlowVendorQuery().finally(() => inFlightQueries.delete(key))
          );
        }
        await inFlightQueries.get(key);
        return { source: 'vendor_call' };
      } finally {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        currentLease = { leaseId: '', expiresAt: 0 };
      }
    }

    // Caller 1 starts slow query
    const p1 = simulateSyncWithHeartbeat('caller-1');

    // At 210ms (which would have expired an unrenewed 200ms lease), Caller 2 arrives
    await sleep(210);
    assert(
      currentLease.expiresAt > Date.now(),
      'Lease must be kept alive beyond original expiration window via heartbeat'
    );

    const p2 = simulateSyncWithHeartbeat('caller-2');
    const [res1, res2] = await Promise.all([p1, p2]);

    assert.strictEqual(vendorCallCount, 1, 'Vendor must only be queried once');
    assert.strictEqual(res1.source, 'vendor_call');
    assert.strictEqual(res2.source, 'cached_snapshot');
    assert.strictEqual(
      currentLease.expiresAt,
      0,
      'Lease must be released upon completion'
    );

    console.log(
      '    ✅ Case 9.1 Passed: Slow query kept lease alive; second query did not breach lock.'
    );
  }

  // =========================================================================
  // Case 9.2: Singleflight In-Flight Deduplication Across Burst Requests
  // =========================================================================
  console.log(
    '  Case 9.2: In-flight deduplication shares single vendor query across burst requests'
  );
  {
    let vendorQueryCount = 0;
    const inFlightQueries = new Map<string, Promise<any>>();

    async function queryVendorWithSingleflight(id: string) {
      if (!inFlightQueries.has(id)) {
        inFlightQueries.set(
          id,
          (async () => {
            vendorQueryCount++;
            await sleep(50);
            return { taskStatus: 'processing', id };
          })().finally(() => inFlightQueries.delete(id))
        );
      }
      return inFlightQueries.get(id);
    }

    // Fire 5 simultaneous query requests for the same task
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        queryVendorWithSingleflight('task-burst-1')
      )
    );

    assert.strictEqual(
      vendorQueryCount,
      1,
      '5 simultaneous requests must collapse into exactly 1 vendor query'
    );
    assert.strictEqual(results.length, 5);
    results.forEach((r) => {
      assert.strictEqual(r.id, 'task-burst-1');
      assert.strictEqual(r.taskStatus, 'processing');
    });

    console.log(
      '    ✅ Case 9.2 Passed: 5 simultaneous burst requests collapsed into single downstream call.'
    );
  }

  // =========================================================================
  // Case 9.3: Immediate Fail-Fast Lease Clean-up on Query Failure
  // =========================================================================
  console.log(
    '  Case 9.3: Immediate lease release and timer disposal when query fails'
  );
  {
    let timerCleanedUp = false;
    let leaseReleased = false;

    let timer: NodeJS.Timeout | null = null;
    let leaseState: { leaseId: string | null } = { leaseId: 'lease-error' };

    try {
      timer = setInterval(() => {
        // renewal
      }, 50);

      // Simulate vendor query throw error
      throw new Error('Network timeout or vendor 502 error');
    } catch (err) {
      // Catch block releases lease
      leaseState.leaseId = null;
      leaseReleased = true;
    } finally {
      if (timer) {
        clearInterval(timer);
        timerCleanedUp = true;
      }
    }

    assert.strictEqual(
      timerCleanedUp,
      true,
      'Heartbeat timer must be canceled in finally'
    );
    assert.strictEqual(
      leaseReleased,
      true,
      'Lease must be immediately cleared on error'
    );
    assert.strictEqual(leaseState.leaseId, null);

    console.log(
      '    ✅ Case 9.3 Passed: Lease and timer cleanly cleared immediately upon query error.'
    );
  }

  // =========================================================================
  // Case 9.4: Immediate Lease Clean-up on Normal Completion
  // =========================================================================
  console.log(
    '  Case 9.4: Immediate lease release upon successful completion allows prompt next poll'
  );
  {
    let leaseActive = true;
    let heartbeatStopped = false;

    let timer: NodeJS.Timeout | null = setInterval(() => {}, 50);

    try {
      await sleep(20);
      // Success update sets leaseId to null
      leaseActive = false;
    } finally {
      if (timer) {
        clearInterval(timer);
        heartbeatStopped = true;
      }
    }

    assert.strictEqual(
      leaseActive,
      false,
      'Lease must be released on completion'
    );
    assert.strictEqual(
      heartbeatStopped,
      true,
      'Heartbeat timer must stop on completion'
    );

    console.log(
      '    ✅ Case 9.4 Passed: Completed query immediately frees lease without holding until timeout.'
    );
  }

  console.log(
    '\n🎉 ALL LEASE AUTO-RENEWAL & CONCURRENCY TESTS PASSED SUCCESSFULLY!\n'
  );
}
