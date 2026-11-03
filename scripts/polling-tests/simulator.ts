/**
 * Browser multi-tab environment simulator for AI polling tests
 */

export interface SimulatedLock {
  name: string;
  mode: 'exclusive';
  clientId: string;
}

export class CrossTabLockManager {
  private held = new Map<
    string,
    { clientId: string; resolveRelease: () => void }
  >();
  private queues = new Map<
    string,
    Array<{ clientId: string; grant: () => void; signal?: AbortSignal }>
  >();

  async request<T>(
    clientId: string,
    name: string,
    optionsOrCallback: any,
    callbackMaybe?: (lock: SimulatedLock | null) => Promise<T>
  ): Promise<T> {
    const options =
      typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
    const callback =
      typeof optionsOrCallback === 'function'
        ? optionsOrCallback
        : callbackMaybe;

    if (options.signal?.aborted) {
      throw new DOMException('The lock request was aborted', 'AbortError');
    }

    if (options.ifAvailable) {
      if (this.held.has(name)) {
        return callback(null);
      }
      return this.acquireAndRun(clientId, name, callback);
    }

    // Exclusive queuing
    if (!this.held.has(name)) {
      return this.acquireAndRun(clientId, name, callback);
    }

    // Wait in queue
    return new Promise<T>((resolve, reject) => {
      let aborted = false;
      const onAbort = () => {
        aborted = true;
        const queue = this.queues.get(name) || [];
        this.queues.set(
          name,
          queue.filter((q) => q.grant !== grant)
        );
        reject(new DOMException('The lock request was aborted', 'AbortError'));
      };

      if (options.signal) {
        options.signal.addEventListener('abort', onAbort, { once: true });
      }

      const grant = async () => {
        if (aborted) return;
        if (options.signal) {
          options.signal.removeEventListener('abort', onAbort);
        }
        try {
          const res = await this.acquireAndRun<T>(clientId, name, callback);
          resolve(res as T);
        } catch (e) {
          reject(e);
        }
      };

      const queue = this.queues.get(name) || [];
      queue.push({ clientId, grant, signal: options.signal });
      this.queues.set(name, queue);
    });
  }

  private async acquireAndRun<T>(
    clientId: string,
    name: string,
    callback: (lock: SimulatedLock | null) => Promise<T>
  ): Promise<T> {
    let releaseLock!: () => void;
    const releasePromise = new Promise<void>((r) => {
      releaseLock = r;
    });
    this.held.set(name, { clientId, resolveRelease: releaseLock });

    try {
      const lock: SimulatedLock = { name, mode: 'exclusive', clientId };
      return await callback(lock);
    } finally {
      this.held.delete(name);
      releaseLock();

      const queue = this.queues.get(name);
      if (queue && queue.length > 0) {
        const next = queue.shift()!;
        if (queue.length === 0) this.queues.delete(name);
        next.grant();
      }
    }
  }

  async query(): Promise<{ held: SimulatedLock[]; pending: SimulatedLock[] }> {
    const held: SimulatedLock[] = [];
    for (const [name, info] of this.held.entries()) {
      held.push({ name, mode: 'exclusive', clientId: info.clientId });
    }
    const pending: SimulatedLock[] = [];
    for (const [name, list] of this.queues.entries()) {
      for (const item of list) {
        pending.push({ name, mode: 'exclusive', clientId: item.clientId });
      }
    }
    return { held, pending };
  }

  releaseAllByClient(clientId: string) {
    for (const [name, info] of Array.from(this.held.entries())) {
      if (info.clientId === clientId) {
        this.held.delete(name);
        info.resolveRelease();
        const queue = this.queues.get(name);
        if (queue && queue.length > 0) {
          const next = queue.shift()!;
          if (queue.length === 0) this.queues.delete(name);
          next.grant();
        }
      }
    }
  }

  clear() {
    this.held.clear();
    this.queues.clear();
  }
}

export const globalLockManager = new CrossTabLockManager();
export const globalStorage = new Map<string, string>();
const channelListeners = new Map<string, Set<any>>();

export class SimulatedBroadcastChannel {
  name: string;
  onmessage: ((ev: any) => void) | null = null;
  private closed = false;

  constructor(name: string) {
    this.name = name;
    if (!channelListeners.has(name)) {
      channelListeners.set(name, new Set());
    }
    channelListeners.get(name)!.add(this);
  }

  postMessage(data: any) {
    if (this.closed) return;
    const listeners = channelListeners.get(this.name);
    if (!listeners) return;
    for (const peer of listeners) {
      if (peer !== this && peer.onmessage) {
        try {
          peer.onmessage({ data });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  close() {
    this.closed = true;
    channelListeners.get(this.name)?.delete(this);
  }
}

export class SimulatedLocalStorage {
  getItem(key: string): string | null {
    return globalStorage.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    globalStorage.set(key, value);
  }
  removeItem(key: string): void {
    globalStorage.delete(key);
  }
  clear(): void {
    globalStorage.clear();
  }
}

export const currentClientId = { value: 'tab-1' };

export interface NetworkCall {
  tabId: string;
  url: string;
  timestamp: number;
}

export const networkCalls: NetworkCall[] = [];
export const mockTaskDb = new Map<string, any>();

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function resetSimulator() {
  globalStorage.clear();
  networkCalls.length = 0;
  mockTaskDb.clear();
  globalLockManager.clear();
}

// Initialize environment globals
(globalThis as any).window = globalThis;
(globalThis as any).location = { origin: 'http://localhost:3000' };
(globalThis as any).window.location = (globalThis as any).location;
(globalThis as any).localStorage = new SimulatedLocalStorage();
(globalThis as any).BroadcastChannel = SimulatedBroadcastChannel;

Object.defineProperty(navigator, 'locks', {
  value: {
    request: (name: string, optsOrCb: any, cbMaybe?: any) =>
      globalLockManager.request(currentClientId.value, name, optsOrCb, cbMaybe),
    query: () => globalLockManager.query(),
  },
  configurable: true,
  writable: true,
});

const windowListeners = new Map<string, Set<Function>>();
(globalThis as any).dispatchEvent = (event: any) => {
  const set = windowListeners.get(event.type);
  if (set) {
    for (const fn of set) fn(event);
  }
  return true;
};
(globalThis as any).addEventListener = (type: string, fn: Function) => {
  if (!windowListeners.has(type)) windowListeners.set(type, new Set());
  windowListeners.get(type)!.add(fn);
};
(globalThis as any).removeEventListener = (type: string, fn: Function) => {
  windowListeners.get(type)?.delete(fn);
};

(globalThis as any).fetch = async (url: string, init?: any) => {
  networkCalls.push({
    tabId: currentClientId.value,
    url: String(url),
    timestamp: Date.now(),
  });

  const parsedUrl = new URL(url, 'http://localhost');
  const taskId = parsedUrl.searchParams.get('taskId');
  const taskIds = parsedUrl.searchParams.get('taskIds');

  if (taskId) {
    const task = mockTaskDb.get(taskId) || {
      taskId,
      taskStatus: 'processing',
      taskInfo: {},
    };
    return {
      ok: true,
      json: async () => ({ code: 0, message: 'ok', data: task }),
    };
  }

  if (taskIds) {
    const ids = taskIds.split(',');
    const tasks = ids.map(
      (id) =>
        mockTaskDb.get(id) || {
          taskId: id,
          taskStatus: 'processing',
          taskInfo: {},
        }
    );
    return {
      ok: true,
      json: async () => ({ code: 0, message: 'ok', data: { tasks } }),
    };
  }

  return {
    ok: true,
    json: async () => ({ code: 0, message: 'ok', data: {} }),
  };
};
