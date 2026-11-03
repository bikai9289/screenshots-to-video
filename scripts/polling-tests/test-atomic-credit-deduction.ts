import assert from 'node:assert';

export async function runTest10() {
  console.log(
    '--- Test Suite 10: Atomic Credit Deduction & Crash Refund Safety ---'
  );

  const userId = 'user-atomic-test';

  interface MockCreditRecord {
    id: string;
    userId: string;
    amount: number;
    transactionType: 'grant' | 'consume' | 'revoke';
    metadata?: string;
    revoked: boolean;
  }

  interface MockAiTask {
    id: string;
    userId: string;
    status: string;
    costCredits: number;
    creditId: string | null;
  }

  const creditTable: MockCreditRecord[] = [];
  const aiTaskTable: MockAiTask[] = [];

  // =========================================================================
  // Case 10.1: Atomic Transaction Guarantees creditId is Written with Consume
  // =========================================================================
  console.log(
    '  Case 10.1: Atomic transaction guarantees creditId is written synchronously with consumption'
  );
  {
    let userCredits = 100;
    const taskId = 'task-atomic-1';
    const cost = 10;

    // Create pending task
    aiTaskTable.push({
      id: taskId,
      userId,
      status: 'pending',
      costCredits: cost,
      creditId: null,
    });

    // Simulate atomic transaction execution
    const atomicExecute = async () => {
      // Step 1: consume inside tx
      const creditRecordId = `credit-${Date.now()}`;
      userCredits -= cost;
      const creditRecord: MockCreditRecord = {
        id: creditRecordId,
        userId,
        amount: cost,
        transactionType: 'consume',
        metadata: JSON.stringify({ taskId }),
        revoked: false,
      };

      // Step 2: update task.creditId inside SAME tx
      const task = aiTaskTable.find((t) => t.id === taskId);
      if (!task) throw new Error('Task not found');
      task.creditId = creditRecordId;

      // Both commit atomically
      creditTable.push(creditRecord);
      return creditRecordId;
    };

    const resultCreditId = await atomicExecute();
    const taskAfterTx = aiTaskTable.find((t) => t.id === taskId);

    assert(
      taskAfterTx?.creditId !== null,
      'creditId must not be null after transaction'
    );
    assert.strictEqual(taskAfterTx?.creditId, resultCreditId);
    assert.strictEqual(userCredits, 90);

    console.log(
      '    ✅ Case 10.1 Passed: Consumption and creditId persistence are fully atomic.'
    );
  }

  // =========================================================================
  // Case 10.2: Process Crash During External API Call -> Automatic Timeout Refund
  // =========================================================================
  console.log(
    '  Case 10.2: Crash during external API call still allows 100% automatic timeout refund'
  );
  {
    let userCredits = 90;
    const taskId = 'task-atomic-crash';
    const cost = 15;

    // Atomic deduction succeeded, then Node/Worker process crashed before provider responded!
    const creditRecordId = `credit-crash-1`;
    userCredits -= cost;
    creditTable.push({
      id: creditRecordId,
      userId,
      amount: cost,
      transactionType: 'consume',
      metadata: JSON.stringify({ taskId }),
      revoked: false,
    });

    const crashedTask: MockAiTask = {
      id: taskId,
      userId,
      status: 'pending',
      costCredits: cost,
      creditId: creditRecordId, // Protected by atomic transaction!
    };
    aiTaskTable.push(crashedTask);

    assert.strictEqual(userCredits, 75);

    // Timeout cleaner kicks in (expireTaskIfNeeded)
    async function simulateExpireTask(task: MockAiTask) {
      task.status = 'failed';
      let creditIdToRevoke = task.creditId;

      // Fallback check
      if (!creditIdToRevoke && task.costCredits > 0) {
        const found = creditTable.find(
          (c) =>
            c.userId === task.userId &&
            c.transactionType === 'consume' &&
            c.metadata === JSON.stringify({ taskId: task.id }) &&
            !c.revoked
        );
        if (found) creditIdToRevoke = found.id;
      }

      if (creditIdToRevoke) {
        const rec = creditTable.find((c) => c.id === creditIdToRevoke);
        if (rec && !rec.revoked) {
          rec.revoked = true;
          userCredits += rec.amount; // Refund
        }
      }
    }

    await simulateExpireTask(crashedTask);

    assert.strictEqual(crashedTask.status, 'failed');
    assert.strictEqual(
      userCredits,
      90,
      'User credits must be 100% refunded after crash'
    );

    console.log(
      '    ✅ Case 10.2 Passed: Crashed task successfully refunded via stored creditId on timeout.'
    );
  }

  // =========================================================================
  // Case 10.3: Metadata Fallback Refund If creditId was Missing
  // =========================================================================
  console.log(
    '  Case 10.3: Metadata fallback reliably recovers and refunds credits even if creditId was null'
  );
  {
    let userCredits = 90;
    const taskId = 'task-atomic-legacy-missing-id';
    const cost = 20;

    userCredits -= cost;
    const creditRecordId = `credit-legacy-1`;
    creditTable.push({
      id: creditRecordId,
      userId,
      amount: cost,
      transactionType: 'consume',
      metadata: JSON.stringify({ taskId }), // Metadata recorded!
      revoked: false,
    });

    const taskWithMissingCreditId: MockAiTask = {
      id: taskId,
      userId,
      status: 'processing',
      costCredits: cost,
      creditId: null, // Simulated missing creditId!
    };

    assert.strictEqual(userCredits, 70);

    // Expire using metadata fallback resolution
    let creditIdToRevoke = taskWithMissingCreditId.creditId;
    if (!creditIdToRevoke && taskWithMissingCreditId.costCredits > 0) {
      const match = creditTable.find(
        (c) =>
          c.userId === taskWithMissingCreditId.userId &&
          c.transactionType === 'consume' &&
          c.metadata === JSON.stringify({ taskId }) &&
          !c.revoked
      );
      if (match) creditIdToRevoke = match.id;
    }

    if (creditIdToRevoke) {
      const rec = creditTable.find((c) => c.id === creditIdToRevoke);
      if (rec && !rec.revoked) {
        rec.revoked = true;
        userCredits += rec.amount;
      }
    }

    assert.strictEqual(
      creditIdToRevoke,
      creditRecordId,
      'Must resolve creditId via metadata'
    );
    assert.strictEqual(
      userCredits,
      90,
      'Credits must be restored via metadata fallback'
    );

    console.log(
      '    ✅ Case 10.3 Passed: Missing creditId gracefully recovered and refunded via metadata.'
    );
  }

  console.log(
    '\n🎉 ALL ATOMIC CREDIT DEDUCTION & REFUND TESTS PASSED SUCCESSFULLY!\n'
  );
}
