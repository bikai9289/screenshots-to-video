import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, set } from 'idb-keyval';
import { z } from 'zod';

import { useSession } from '@/core/auth/client';
import { screenshotLimits } from '@/config/screenshots-product';
import { ApiError, apiGet, apiPost, apiUpload } from '@/lib/api-client';
import {
  screenshotRequestSchema,
  type PublicScreenshotTask,
  type ScreenshotRequest,
} from '@/lib/screenshots-contract';
import {
  ScreenshotStudio,
  type StudioScreen,
  type StudioSettings,
} from '@/components/screenshots-to-video/studio';

import { useScreenshotsCopy } from './use-copy';

type Account = {
  remainingCredits: number;
  legacyRenders: number;
  remainingRenders?: number;
  serviceAvailable: boolean;
  tasks: PublicScreenshotTask[];
};
const initialSettings: StudioSettings = {
  prompt: '',
  duration: 5,
  aspectRatio: '16:9',
};
const settingsSchema = z.object({
  prompt: z.string().max(2000),
  duration: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']),
});

export function ScreenshotsStudio() {
  const copy = useScreenshotsCopy();
  const { data: session, isPending } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [screens, setScreens] = useState<StudioScreen[]>([]);
  const screensRef = useRef(screens);
  screensRef.current = screens;
  const [draftReady, setDraftReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRequest = useRef<ScreenshotRequest | null>(null);
  const draftWrite = useRef<Promise<unknown>>(Promise.resolve());
  const startedAt = useRef(Date.now());
  const form = useForm({
    defaultValues: initialSettings,
    validators: { onSubmit: settingsSchema },
    onSubmit: async ({ value }) => {
      await draftWrite.current.catch(() => {});
      await generate.mutateAsync(value).catch(() => {});
    },
  });
  const account = useQuery({
    queryKey: ['screenshot-account', userId],
    queryFn: () => apiGet<Account>('/api/screenshots/account'),
    enabled: !!userId,
    retry: false,
  });
  const task = useQuery({
    queryKey: ['screenshot-task', userId, selectedId],
    queryFn: () =>
      apiGet<PublicScreenshotTask>(`/api/screenshots/tasks/${selectedId}`),
    enabled: !!userId && !!selectedId,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'success' ||
        status === 'failed' ||
        Date.now() - startedAt.current > 20 * 60 * 1000
        ? false
        : Math.min(
            30_000,
            3000 + Math.floor((Date.now() - startedAt.current) / 5000) * 1000
          );
    },
  });
  useEffect(() => {
    if (task.data?.status === 'success' || task.data?.status === 'failed')
      void queryClient.invalidateQueries({
        queryKey: ['screenshot-account', userId],
      });
  }, [task.data?.status, userId, queryClient]);
  useEffect(() => {
    if (!selectedId && account.data?.tasks.length) {
      setSelectedId(account.data.tasks[0].id);
      startedAt.current = Date.now();
    }
  }, [account.data, selectedId]);
  useEffect(() => {
    screensRef.current.forEach((screen) => URL.revokeObjectURL(screen.preview));
    setScreens([]);
    setSelectedId(null);
    setError(null);
    pendingRequest.current = null;
    form.reset();
    if (!userId) return;
    let active = true;
    setDraftReady(false);
    void get<{ files: File[]; settings: StudioSettings; expiresAt: number }>(
      `stv:draft:${userId}`
    )
      .then(async (saved) => {
        if (!active) return;
        const recovery = await get<ScreenshotRequest>(
          `stv:pending:${userId}`
        ).catch(() => null);
        if (!active) return;
        if (screenshotRequestSchema.safeParse(recovery).success)
          pendingRequest.current = recovery!;
        if (
          saved &&
          saved.expiresAt > Date.now() &&
          settingsSchema.safeParse(saved.settings).success &&
          saved.files.length <= 4 &&
          saved.files.every(
            (file) =>
              file instanceof File && file.size <= screenshotLimits.maxFileBytes
          )
        ) {
          setScreens(
            saved.files.map((file) => ({
              file,
              preview: URL.createObjectURL(file),
            }))
          );
          form.setFieldValue('prompt', saved.settings.prompt);
          form.setFieldValue('duration', saved.settings.duration);
          form.setFieldValue('aspectRatio', saved.settings.aspectRatio);
        } else if (saved) {
          await del(`stv:draft:${userId}`);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setDraftReady(true);
      });
    return () => {
      active = false;
      screensRef.current.forEach((screen) =>
        URL.revokeObjectURL(screen.preview)
      );
    };
  }, [userId]);
  useEffect(
    () => () =>
      screensRef.current.forEach((screen) =>
        URL.revokeObjectURL(screen.preview)
      ),
    []
  );
  const errorMessage = (failure: unknown) => {
    const key =
      failure instanceof ApiError
        ? (failure.data as { errorKey?: string } | undefined)?.errorKey
        : null;
    return (
      (key && copy[`error_${key}` as keyof typeof copy]) ||
      copy.error_INTERNAL_ERROR
    );
  };
  const generate = useMutation({
    mutationFn: async (settings: StudioSettings) => {
      setError(null);
      if (!pendingRequest.current) {
        const formData = new FormData();
        screens.forEach((screen) => formData.append('files', screen.file));
        const upload = await apiUpload<{ assets: { id: string }[] }>(
          '/api/screenshots/assets',
          formData
        );
        pendingRequest.current = {
          idempotencyKey: crypto.randomUUID(),
          assetIds: upload.assets.map((asset) => asset.id),
          ...settings,
        };
        // Persist before sending. A reload after a lost response must reuse the same key.
        await set(`stv:pending:${userId}`, pendingRequest.current);
      }
      return apiPost<PublicScreenshotTask>(
        '/api/screenshots/tasks/',
        pendingRequest.current
      );
    },
    onSuccess: (result) => {
      pendingRequest.current = null;
      void del(`stv:pending:${userId}`);
      setSelectedId(result.id);
      startedAt.current = Date.now();
      queryClient.setQueryData(['screenshot-task', userId, result.id], result);
      void queryClient.invalidateQueries({
        queryKey: ['screenshot-account', userId],
      });
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  function saveDraft(next: StudioScreen[], settings: StudioSettings) {
    if (userId && draftReady)
      draftWrite.current = draftWrite.current
        .catch(() => {})
        .then(() =>
          set(`stv:draft:${userId}`, {
            files: next.map((screen) => screen.file),
            settings,
            expiresAt: Date.now() + 86400000,
          })
        )
        .catch(() => {});
  }
  function resetPending() {
    if (pendingRequest.current) {
      setError(copy.pendingNotice);
      return false;
    }
    return true;
  }
  async function addFiles(files: File[]) {
    if (!resetPending()) return;
    const all = [...screens.map((screen) => screen.file), ...files];
    if (
      all.length > 4 ||
      all.some((file) => file.size > screenshotLimits.maxFileBytes) ||
      all.reduce((sum, file) => sum + file.size, 0) >
        screenshotLimits.maxTotalBytes
    ) {
      setError(copy.error_UPLOAD_LIMIT);
      return;
    }
    if (
      files.some(
        (file) =>
          !screenshotLimits.allowedMimeTypes.includes(file.type as never) ||
          !file.size
      )
    ) {
      setError(copy.error_INVALID_IMAGE);
      return;
    }
    for (const file of files) {
      try {
        const image = await createImageBitmap(file);
        const valid =
          image.width > 300 &&
          image.height > 300 &&
          image.width < 6000 &&
          image.height < 6000 &&
          image.width / image.height > 0.4 &&
          image.width / image.height < 2.5;
        image.close();
        if (!valid) {
          setError(copy.error_IMAGE_DIMENSIONS);
          return;
        }
      } catch {
        setError(copy.error_INVALID_IMAGE);
        return;
      }
    }
    const next = [
      ...screens,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ];
    setScreens(next);
    saveDraft(next, form.state.values);
    setError(null);
  }
  function move(index: number, direction: number) {
    if (!resetPending()) return;
    const next = [...screens];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setScreens(next);
    saveDraft(next, form.state.values);
  }
  function remove(index: number) {
    if (!resetPending()) return;
    URL.revokeObjectURL(screens[index].preview);
    const next = screens.filter((_, i) => i !== index);
    setScreens(next);
    saveDraft(next, form.state.values);
  }
  function clear() {
    if (!resetPending()) return;
    screens.forEach((screen) => URL.revokeObjectURL(screen.preview));
    setScreens([]);
    form.reset();
    if (userId) void del(`stv:draft:${userId}`);
  }
  return (
    <form.Subscribe selector={(state) => state.values}>
      {(settings) => (
        <ScreenshotStudio
          copy={copy}
          signedIn={!!userId}
          loading={
            isPending || (!!userId && (!draftReady || account.isPending))
          }
          balance={account.data?.remainingCredits ?? 0}
          legacyBalance={
            account.data?.legacyRenders ?? account.data?.remainingRenders ?? 0
          }
          available={account.data?.serviceAvailable ?? false}
          screens={screens}
          settings={settings}
          busy={generate.isPending}
          error={
            error ||
            (account.error
              ? errorMessage(account.error)
              : task.error
                ? errorMessage(task.error)
                : null)
          }
          tasks={account.data?.tasks ?? []}
          selected={task.data ?? null}
          checking={task.isFetching}
          pendingSubmission={pendingRequest.current !== null}
          onSettings={(value) => {
            if (resetPending()) {
              form.setFieldValue('prompt', value.prompt);
              form.setFieldValue('duration', value.duration);
              form.setFieldValue('aspectRatio', value.aspectRatio);
              saveDraft(screens, value);
            }
          }}
          onAdd={(files) => void addFiles(files)}
          onMove={move}
          onRemove={remove}
          onClear={clear}
          onGenerate={() => void form.handleSubmit()}
          onSelect={(id) => {
            setSelectedId(id);
            startedAt.current = Date.now();
          }}
          onCheck={() => void task.refetch()}
        />
      )}
    </form.Subscribe>
  );
}
