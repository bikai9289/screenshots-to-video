import { sql } from 'drizzle-orm';

import { screenshotCreditAllocation, screenshotTask } from '@/config/db/schema';

// Both reservations and completed videos consume rights. Terminal failures release them.
export const allocatedVideoCredits = (orderId: string) =>
  sql`coalesce((select sum(a.credits) from ${screenshotCreditAllocation} as a inner join ${screenshotTask} as t on t.id = a.task_id where a.order_id = ${orderId} and t.status <> 'failed'), 0)`;
export const videoPackUsage = (orderId: string) =>
  sql`(select count(*) from ${screenshotTask} as t where t.status <> 'failed' and (t.order_id = ${orderId} or t.id in (select a.task_id from ${screenshotCreditAllocation} as a where a.order_id = ${orderId})))`;
