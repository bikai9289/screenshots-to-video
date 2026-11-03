'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { authClient, signIn } from '@/core/auth/client';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuickAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  callbackUrl?: string;
}

export function QuickAuthModal({ open, onOpenChange }: QuickAuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const configQuery = usePublicConfig();
  const configs = configQuery.data ?? {};
  const configsLoaded = configQuery.isSuccess;
  // 与登录页一致：邮箱默认开启（仅显式 false 关闭），社交需显式 true
  const emailEnabled = configs.email_auth_enabled !== 'false';
  const googleEnabled = configs.google_auth_enabled === 'true';
  const githubEnabled = configs.github_auth_enabled === 'true';
  const hasSocial = googleEnabled || githubEnabled;
  const hasAnyMethod = emailEnabled || hasSocial;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailEnabled) return;
    if (!email.trim() || !password.trim()) {
      setError(m['stp.auth.fill_fields']());
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (tab === 'signin') {
        const result: any = await signIn.email({
          email: email.trim(),
          password: password.trim(),
        });
        if (result?.error) {
          setError(result.error.message || 'Sign in failed');
          setLoading(false);
          return;
        }
      } else {
        const result: any = await authClient.signUp.email({
          email: email.trim(),
          password: password.trim(),
          name: name.trim() || email.split('@')[0],
        });
        if (result?.error) {
          setError(result.error.message || 'Sign up failed');
          setLoading(false);
          return;
        }
      }

      toast.success(
        tab === 'signin'
          ? m['stp.auth.signin_success']()
          : m['stp.auth.signup_success']()
      );

      // Refresh client session store (cookie is set; useSession can stay stale).
      try {
        authClient.$store.notify('$sessionSignal');
      } catch {}
      await new Promise((r) => setTimeout(r, 50));
      let sessionRes = await authClient.getSession();
      if (!sessionRes?.data?.user) {
        await new Promise((r) => setTimeout(r, 150));
        sessionRes = await authClient.getSession();
      }

      if (!sessionRes?.data?.user) {
        // Cookie missing — hard reload current page with cache bust.
        const url = new URL(window.location.href);
        url.searchParams.set('_auth', String(Date.now()));
        window.location.assign(url.toString());
        return;
      }

      onOpenChange(false);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    if (
      (provider === 'google' && !googleEnabled) ||
      (provider === 'github' && !githubEnabled)
    ) {
      return;
    }
    try {
      await signIn.social({
        provider,
        callbackURL: window.location.href,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Social sign in failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl p-6 shadow-2xl sm:max-w-md">
        <DialogHeader className="space-y-2 text-center">
          <div className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-2xl">
            <Sparkles className="size-6" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {emailEnabled && tab === 'signup'
              ? m['stp.auth.signup_title']()
              : m['stp.auth.signin_title']()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
            {m['stp.auth.modal_desc']()}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-xl border p-3 text-center text-xs">
            {error}
          </div>
        )}

        {configsLoaded && !hasAnyMethod ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium">
              {m['common.sign.no_methods_title']()}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {m['common.sign.no_methods_description']()}
            </p>
          </div>
        ) : (
          <>
            {hasSocial && (
              <div className="flex flex-col gap-2 pt-1">
                {googleEnabled && (
                  <Button
                    variant="outline"
                    type="button"
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-medium"
                    onClick={() => handleSocial('google')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="size-4"
                    >
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    {m['stp.auth.google']()}
                  </Button>
                )}
                {githubEnabled && (
                  <Button
                    variant="outline"
                    type="button"
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-medium"
                    onClick={() => handleSocial('github')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="size-4"
                    >
                      <path
                        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                        fill="currentColor"
                      />
                    </svg>
                    {m['stp.auth.github']()}
                  </Button>
                )}
                {emailEnabled && (
                  <div className="text-muted-foreground after:border-border relative my-2 text-center text-xs after:absolute after:inset-x-0 after:top-1/2 after:-z-10 after:border-t">
                    <span className="bg-popover px-2">
                      {m['stp.auth.or_email']()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {emailEnabled && (
              <form
                method="post"
                action="#"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleEmailAuth(e);
                }}
                className="space-y-3.5"
              >
                {tab === 'signup' && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {m['stp.auth.name_label']()}
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Creative Artist"
                      className="h-10 rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">
                    {m['stp.auth.email_label']()}
                  </Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    {m['stp.auth.password_label']()}
                  </Label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground h-11 w-full cursor-pointer rounded-xl font-bold transition-transform hover:scale-102"
                >
                  {loading
                    ? m['stp.auth.processing']()
                    : tab === 'signin'
                      ? m['stp.auth.signin_btn']()
                      : m['stp.auth.signup_btn']()}
                </Button>

                <div className="text-muted-foreground pt-1 text-center text-xs">
                  {tab === 'signin' ? (
                    <span>
                      {m['stp.auth.no_account']()}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('signup');
                          setError('');
                        }}
                        className="text-foreground hover:text-primary cursor-pointer font-bold underline"
                      >
                        {m['stp.auth.signup_link']()}
                      </button>
                    </span>
                  ) : (
                    <span>
                      {m['stp.auth.has_account']()}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('signin');
                          setError('');
                        }}
                        className="text-foreground hover:text-primary cursor-pointer font-bold underline"
                      >
                        {m['stp.auth.signin_link']()}
                      </button>
                    </span>
                  )}
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
