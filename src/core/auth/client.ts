import React, { createContext, useContext } from 'react';
import { oneTapClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const baseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : import.meta.env?.VITE_APP_URL || 'http://localhost:3000';

export const authClient = createAuthClient({ baseURL });

const rawUseSession = authClient.useSession;

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string | null;
    [key: string]: any;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date | string;
    [key: string]: any;
  };
}

const SessionContext = createContext<{
  initialSession: AuthSession | null;
}>({
  initialSession: null,
});

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: AuthSession | null;
}) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('_auth')) return;
    url.searchParams.delete('_auth');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    void authClient.getSession();
  }, []);

  return React.createElement(
    SessionContext.Provider,
    { value: { initialSession } },
    children
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  const clientSession = rawUseSession();

  // If client session query has data, use client state (reactive to updates/signout)
  if (clientSession.data) {
    return {
      data: clientSession.data,
      isPending: false,
      error: clientSession.error,
      refetch: clientSession.refetch,
    };
  }

  // If server preloaded session exists and client is still pending/fetching, use server session
  if (context.initialSession) {
    return {
      data: context.initialSession,
      isPending: false,
      error: null,
      refetch: clientSession.refetch,
    };
  }

  return clientSession;
}

export const { signIn, signUp, signOut, requestPasswordReset, resetPassword } =
  authClient;

/**
 * Resolve the current user for client actions (upload etc.).
 * Prefer live React session; if missing, re-read cookie via getSession —
 * modal sign-in can leave useSession stale while the cookie is already set.
 */
export async function ensureClientUser(
  sessionUser?: AuthSession['user'] | null
): Promise<AuthSession['user'] | null> {
  if (sessionUser?.id) return sessionUser;
  try {
    authClient.$store.notify('$sessionSignal');
  } catch {}
  await new Promise((r) => setTimeout(r, 30));
  const res = await authClient.getSession();
  return res?.data?.user ?? null;
}

// Build a per-call auth client with the Google One Tap plugin attached.
// The plugin needs the client_id at construction time, so we can't add
// it to the default `authClient` — callers must pass live configs.
export function getAuthClient(configs: Record<string, string>) {
  return createAuthClient({
    baseURL,
    plugins:
      configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [
            oneTapClient({
              clientId: configs.google_client_id,
              autoSelect: false,
              cancelOnTapOutside: false,
              context: 'signin',
              promptOptions: {
                baseDelay: 1000,
                maxAttempts: 1,
              },
            }),
          ]
        : [],
  });
}
