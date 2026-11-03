# Data, credits and operations

- Credit consumption, task creation, success/failure transitions, and refunds must remain atomic/idempotent. Revoke credits on failed or unusable results, including provider errors.
- Protect list queries from join multiplication and slow counts; use safe pagination and multi-field search conditions.
- Soft-deleted local/server creations must not resurrect. Guard localStorage/cache updates against cross-session races and duplicate polling.
- Scheduled tasks that sync R2 must verify the actual storage operation and persisted task state.
- Hide providers/features that are not implemented (for example PayPal) until their complete adapter exists.
