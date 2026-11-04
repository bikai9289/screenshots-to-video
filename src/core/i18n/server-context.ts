import { AsyncLocalStorage } from 'node:async_hooks';

import {
  getLocale,
  overwriteServerAsyncLocalStorage,
  serverAsyncLocalStorage,
} from '@/paraglide/runtime.js';

type LocaleContext = {
  locale?: ReturnType<typeof getLocale>;
  origin?: string;
  messageCalls?: Set<string>;
};

export function initializeLocaleContext() {
  // Paraglide otherwise initializes storage after an async import on the first
  // request. Concurrent cold requests can replace another request's context.
  if (!serverAsyncLocalStorage) {
    overwriteServerAsyncLocalStorage(new AsyncLocalStorage<LocaleContext>());
  }
}

initializeLocaleContext();
