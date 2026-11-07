import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Download,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { screenshotCreditCost } from '@/config/screenshots-product';
import type { PublicScreenshotTask } from '@/lib/screenshots-contract';

import { ScreenshotFooter, ScreenshotHeader } from './landing';
import type { ScreenshotsCopy } from './types';

import './studio.css';

export interface StudioSettings {
  prompt: string;
  duration: 5 | 10 | 15;
  aspectRatio: '16:9' | '9:16' | '1:1';
}
export interface StudioScreen {
  file: File;
  preview: string;
}
export interface StudioProps {
  copy: ScreenshotsCopy;
  signedIn: boolean;
  loading: boolean;
  balance: number;
  legacyBalance: number;
  available: boolean;
  screens: StudioScreen[];
  settings: StudioSettings;
  busy: boolean;
  error: string | null;
  tasks: PublicScreenshotTask[];
  selected: PublicScreenshotTask | null;
  checking: boolean;
  pendingSubmission: boolean;
  onSettings: (value: StudioSettings) => void;
  onAdd: (files: File[]) => void;
  onMove: (index: number, direction: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  onGenerate: () => void;
  onSelect: (id: string) => void;
  onCheck: () => void;
}

export function ScreenshotStudio(props: StudioProps) {
  const {
    copy,
    signedIn,
    loading,
    balance,
    legacyBalance,
    available,
    screens,
    settings,
    busy,
    error,
    tasks,
    selected,
    checking,
  } = props;
  return (
    <div className="stv-site">
      <ScreenshotHeader copy={copy} />
      <main className="wrap studio-main">
        <div className="studio-heading">
          <div>
            <p className="eyebrow">{copy.create}</p>
            <h1>{copy.studioTitle}</h1>
            <p>{copy.studioDescription}</p>
          </div>
          {signedIn && (
            <div className="studio-balance">
              <span>{copy.balanceLabel}</span>
              <strong>{balance}</strong>
              {legacyBalance > 0 && (
                <span>
                  {copy.legacyBalance.replace(
                    '__COUNT__',
                    String(legacyBalance)
                  )}
                </span>
              )}
              <Link href="/pricing">
                {copy.buyRenders}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
        {!signedIn ? (
          <section className="studio-sign-in">
            <ImagePlus aria-hidden="true" />
            <h2>{copy.signInStudio}</h2>
            <p>{copy.signInHint}</p>
            <Link className="button dark" href="/sign-in?callbackUrl=%2Fstudio">
              {copy.signInStudio}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <>
            {loading && (
              <p role="status">
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              </p>
            )}
            {!available && !loading && (
              <p className="studio-notice" role="status">
                {copy.studioUnavailable}
              </p>
            )}
            {balance < 1 && legacyBalance < 1 && !loading && (
              <p className="studio-notice">
                {copy.noRenders}{' '}
                <Link href="/pricing">
                  {copy.pricingNav}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </p>
            )}
            <div className="studio-workspace">
              <form
                className="studio-controls"
                onSubmit={(event) => {
                  event.preventDefault();
                  props.onGenerate();
                }}
              >
                <div className="studio-section-label">
                  <h2>{copy.screensLabel}</h2>
                  <button
                    className="icon-button"
                    type="button"
                    title={copy.clearDraft}
                    aria-label={copy.clearDraft}
                    disabled={busy || loading}
                    onClick={props.onClear}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                <label className="studio-upload">
                  <ImagePlus aria-hidden="true" />
                  <span>{copy.addScreens}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={busy || loading}
                    onChange={(event) => {
                      props.onAdd(Array.from(event.target.files ?? []));
                      event.target.value = '';
                    }}
                  />
                  <span className="sr-only">{copy.uploadHelp}</span>
                </label>
                <p className="studio-help">{copy.uploadHelp}</p>
                <p className="studio-help">{copy.dimensionHelp}</p>
                <ol className="studio-screens">
                  {screens.map((screen, index) => (
                    <li key={screen.preview}>
                      <img
                        src={screen.preview}
                        alt={`${copy.screensLabel} ${index + 1}`}
                      />
                      <span>{index + 1}</span>
                      <div>
                        <button
                          className="icon-button"
                          type="button"
                          disabled={busy || index === 0}
                          aria-label={`${copy.moveEarlier} ${index + 1}`}
                          title={copy.moveEarlier}
                          onClick={() => props.onMove(index, -1)}
                        >
                          <ArrowUp />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          disabled={busy || index === screens.length - 1}
                          aria-label={`${copy.moveLater} ${index + 1}`}
                          title={copy.moveLater}
                          onClick={() => props.onMove(index, 1)}
                        >
                          <ArrowDown />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          disabled={busy}
                          aria-label={`${copy.removeScreen} ${index + 1}`}
                          title={copy.removeScreen}
                          onClick={() => props.onRemove(index)}
                        >
                          <X />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
                <label className="studio-field" htmlFor="video-direction">
                  <span>{copy.directionLabel}</span>
                  <textarea
                    aria-label={copy.directionLabel}
                    id="video-direction"
                    rows={4}
                    maxLength={2000}
                    value={settings.prompt}
                    placeholder={copy.directionPlaceholder}
                    disabled={busy || loading}
                    onChange={(event) =>
                      props.onSettings({
                        ...settings,
                        prompt: event.target.value,
                      })
                    }
                  />
                </label>
                <div className="studio-setting-row">
                  <label className="studio-field" htmlFor="video-duration">
                    <span>{copy.durationLabel}</span>
                    <select
                      aria-label={copy.durationLabel}
                      id="video-duration"
                      value={settings.duration}
                      disabled={busy || loading}
                      onChange={(event) =>
                        props.onSettings({
                          ...settings,
                          duration: Number(event.target.value) as 5 | 10 | 15,
                        })
                      }
                    >
                      {[5, 10, 15].map((duration) => (
                        <option
                          value={duration}
                          key={duration}
                          disabled={
                            legacyBalance < 1 &&
                            balance <
                              screenshotCreditCost[duration as 5 | 10 | 15]
                          }
                        >
                          {duration}s ·{' '}
                          {screenshotCreditCost[duration as 5 | 10 | 15]}{' '}
                          {copy.creditUnit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset className="studio-field">
                    <legend>{copy.aspectLabel}</legend>
                    <div className="studio-ratios">
                      {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                        <label key={ratio}>
                          <input
                            type="radio"
                            name="video-ratio"
                            value={ratio}
                            checked={settings.aspectRatio === ratio}
                            disabled={busy || loading}
                            onChange={() =>
                              props.onSettings({
                                ...settings,
                                aspectRatio: ratio,
                              })
                            }
                          />
                          <span>{ratio}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <p className="studio-help">{copy.outputSettings}</p>
                <p className="studio-help">{copy.reviewNotice}</p>
                <p className="studio-charge">
                  {legacyBalance > 0
                    ? copy.legacyCharge
                    : copy.confirmCharge.replace(
                        '__COUNT__',
                        String(screenshotCreditCost[settings.duration])
                      )}
                </p>
                {error && (
                  <p className="studio-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="button dark studio-generate"
                  type="submit"
                  disabled={
                    busy ||
                    loading ||
                    !available ||
                    (!props.pendingSubmission &&
                      ((legacyBalance < 1 &&
                        balance < screenshotCreditCost[settings.duration]) ||
                        screens.length === 0))
                  }
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ArrowUpRight aria-hidden="true" />
                  )}
                  {busy
                    ? copy.generateBusy
                    : props.pendingSubmission
                      ? copy.checkStatus
                      : copy.generateVideo}
                </button>
                <p className="studio-help">{copy.localDraft}</p>
              </form>
              <section className="studio-preview">
                <div className="studio-section-label">
                  <h2>{copy.previewLabel}</h2>
                  <span>
                    {selected
                      ? copy[`status_${selected.status}`]
                      : copy.draftLabel}
                  </span>
                </div>
                <div
                  className={`studio-stage ratio-${settings.aspectRatio.replace(':', '-')}`}
                >
                  {selected?.status === 'success' && selected.videoUrl ? (
                    <video
                      src={selected.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={copy.previewLabel}
                    />
                  ) : screens[0] ? (
                    <img src={screens[0].preview} alt={copy.draftLabel} />
                  ) : (
                    <div className="studio-empty">
                      <ImagePlus aria-hidden="true" />
                      <h3>{copy.emptyScreens}</h3>
                      <p>{copy.emptyHint}</p>
                    </div>
                  )}
                </div>
                {selected && (
                  <div className="studio-task-result">
                    <p role="status">{copy[`status_${selected.status}`]}</p>
                    {selected.errorCode && (
                      <p>
                        {copy[`error_${selected.errorCode}`] ||
                          copy.error_INTERNAL_ERROR}
                      </p>
                    )}
                    {selected.status === 'success' ? (
                      <a
                        className="button dark"
                        href={`/api/screenshots/tasks/${selected.id}/download`}
                      >
                        <Download aria-hidden="true" />
                        {copy.downloadVideo}
                      </a>
                    ) : selected.status !== 'failed' ? (
                      <button
                        className="button text-button"
                        type="button"
                        disabled={checking}
                        onClick={props.onCheck}
                      >
                        <RefreshCw className={checking ? 'animate-spin' : ''} />
                        {copy.checkStatus}
                      </button>
                    ) : null}
                  </div>
                )}
                <p className="studio-help studio-storage">
                  {copy.storageNotice}
                </p>
                <div className="studio-history">
                  <h2>{copy.historyLabel}</h2>
                  {tasks.length ? (
                    <ul>
                      {tasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => props.onSelect(task.id)}
                            aria-pressed={selected?.id === task.id}
                          >
                            <span>
                              {task.createdAt.slice(0, 16).replace('T', ' ')}{' '}
                              UTC
                            </span>
                            <span>
                              {task.duration}s · {task.aspectRatio}
                            </span>
                            <span>{copy[`status_${task.status}`]}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{copy.noHistory}</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
      <ScreenshotFooter copy={copy} />
    </div>
  );
}
