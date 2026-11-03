import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getBalance, getHistory } from '@/modules/credits/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    const balance = await getBalance(session.user.id);
    if (new URL(request.url).searchParams.get('summary') === '1') {
      return respData({ balance });
    }

    const history = await getHistory(session.user.id);

    return respData({ balance, history });
  } catch (error: any) {
    console.error('credits request failed:', error);
    return respErr('Failed to get credits');
  }
}

export const Route = createFileRoute('/api/credits')({
  server: {
    handlers: { GET },
  },
});
