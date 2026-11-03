export class ProviderGenerateRateLimiter {
  private state: any;

  constructor(state: any) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/consume' || request.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      limit?: number;
      windowMs?: number;
    };
    const limit = Math.max(1, Math.floor(payload.limit || 1));
    const windowMs = Math.max(1, Math.floor(payload.windowMs || 1000));
    const now = Date.now();
    const cutoff = now - windowMs;

    return await this.state.blockConcurrencyWhile(async () => {
      await this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS rate_limit_hits (
          timestamp INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_timestamp
        ON rate_limit_hits(timestamp);
      `);

      await this.state.storage.sql.exec(
        'DELETE FROM rate_limit_hits WHERE timestamp < ?',
        cutoff
      );

      const countCursor = this.state.storage.sql.exec(
        'SELECT COUNT(*) AS total, MIN(timestamp) AS oldest FROM rate_limit_hits'
      );
      const row = countCursor.one() as
        | { total?: number; oldest?: number | null }
        | undefined;
      const total = Number(row?.total || 0);

      if (total >= limit) {
        const oldest = Number(row?.oldest || now);
        const retryAfterMs = Math.max(1, windowMs - (now - oldest));
        return Response.json({ allowed: false, retryAfterMs }, { status: 429 });
      }

      await this.state.storage.sql.exec(
        'INSERT INTO rate_limit_hits (timestamp) VALUES (?)',
        now
      );
      return Response.json({ allowed: true, retryAfterMs: 0 });
    });
  }
}
