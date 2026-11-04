import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Clapperboard,
  FileVideo2,
  Image,
  Maximize,
  Menu,
  Minimize,
  MousePointer2,
  MoveRight,
  PanelsTopLeft,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ScanEye,
  Sparkles,
  X,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

import { RealDemo } from './real-demo';
import type { ScreenshotsCopy } from './types';

import './screenshots.css';
import './layout.css';

const asset = '/imgs/screenshots-to-video/orbit-dashboard.png';
const scenes = ['launch', 'feature', 'social'] as const;

function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

export function ScreenshotBrand() {
  return (
    <Link className="brand" href="/" aria-label="Screenshots to Video">
      <span className="brandmark">
        <img src="/logo.svg" width="36" height="36" alt="" />
      </span>
      <span>
        screenshots<span className="brand-to">to</span>video
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}

export function ScreenshotHeader({ copy }: { copy: ScreenshotsCopy }) {
  const [menu, setMenu] = useState(false);
  const ready = useReady();
  return (
    <header className="header wrap">
      <ScreenshotBrand />
      <nav
        className={menu ? 'open' : ''}
        aria-label={copy.navigation}
        onClick={() => setMenu(false)}
      >
        <Link href="/#examples">{copy.examplesNav}</Link>
        <Link href="/#how-it-works">{copy.howNav}</Link>
        <Link href="/pricing">{copy.pricingNav}</Link>
        <Link className="mobile-account" href={copy.accountHref}>
          {copy.accountLabel}
        </Link>
      </nav>
      <Link className="account-link" href={copy.accountHref}>
        {copy.accountLabel}
      </Link>
      <Link className="button dark nav-cta" href="/studio">
        {copy.create}
        <ArrowUpRight aria-hidden="true" />
      </Link>
      <button
        type="button"
        className="icon-button menu-toggle"
        disabled={!ready}
        aria-label={menu ? copy.closeMenu : copy.openMenu}
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        {menu ? <X /> : <Menu />}
      </button>
    </header>
  );
}

export function ScreenshotFooter({ copy }: { copy: ScreenshotsCopy }) {
  return (
    <footer className="footer wrap">
      <ScreenshotBrand />
      <p>{copy.footerTagline}</p>
      <Link href="/#examples">
        {copy.explore}
        <ArrowUpRight aria-hidden="true" />
      </Link>
      <div className="footer-policies">
        <Link href="/privacy">{copy.privacy}</Link>
        <Link href="/terms">{copy.terms}</Link>
        <Link href="/contact">{copy.contact}</Link>
        <Link
          href="/"
          locale="en"
          onClick={(event) => {
            event.preventDefault();
            void import('@/paraglide/runtime.js').then(
              ({ setLocale, getLocale }) =>
                setLocale(getLocale() === 'en' ? 'zh' : 'en')
            );
          }}
        >
          {copy.language}
        </Link>
      </div>
      <span>© {new Date().getFullYear()} Screenshots to Video</span>
    </footer>
  );
}

function Film({ copy }: { copy: ScreenshotsCopy }) {
  const ready = useReady();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!preference.matches);
    const change = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    let handle: number;
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      if (!document.hidden) setTime((value) => (value + delta) % 18);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing]);
  useEffect(() => {
    frame.current
      ?.querySelectorAll('.product-shot,.focus-ring,.shot-cursor')
      .forEach((element) => {
        element.getAnimations().forEach((animation) => {
          animation.pause();
          animation.currentTime = time * 1000;
        });
      });
  }, [time]);
  useEffect(() => {
    if (!expanded) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
        expandButton.current?.focus();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(
          frame.current?.querySelectorAll<HTMLElement>('button,input') ?? []
        );
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    expandButton.current?.focus();
    document.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', close);
    };
  }, [expanded]);
  return (
    <div className="film-section">
      <div className="film-caption wrap">
        <span>
          <span className="live-dot" />
          {copy.filmEyebrow}
        </span>
        <span>
          {copy.filmCaption}
          <ArrowDownRight aria-hidden="true" />
        </span>
      </div>
      <div className="film-wrap wrap">
        <div
          className={`film ${expanded ? 'expanded' : ''}`}
          ref={frame}
          role={expanded ? 'dialog' : undefined}
          aria-modal={expanded || undefined}
          aria-label={copy.motionPreview}
        >
          <div className="film-top">
            <span className="film-label">ORBIT / {copy.launchLabel}</span>
            <span className="format-label">
              16:9 <span>·</span> {copy.demoLabel}
            </span>
          </div>
          <div className="film-scene">
            <div className="film-wordmark">
              {copy.filmTitle1}
              <br />
              <span>{copy.filmTitle2}</span>
            </div>
            <div className="product-shot">
              <img
                src={asset}
                alt={copy.dashboardAlt}
                width={1000}
                height={650}
                fetchPriority="high"
              />
              <div className="focus-ring" />
              <div className="shot-cursor">
                <MousePointer2 aria-hidden="true" />
              </div>
            </div>
            <div className="floating-label">
              <span className="live-dot" />
              {copy.focusCaption}
            </div>
            <span className="scene-counter">
              {copy.scene} 0{Math.min(3, Math.floor(time / 6) + 1)} / 03
            </span>
          </div>
          <div className="film-controls">
            <button
              type="button"
              className="icon-button play-control"
              disabled={!ready}
              aria-label={playing ? copy.pause : copy.play}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Pause /> : <Play />}
            </button>
            <span className="timecode">
              00:{String(Math.floor(time)).padStart(2, '0')} / 00:18
            </span>
            <input
              className="scrubber"
              disabled={!ready}
              type="range"
              min={0}
              max={18}
              step={0.1}
              value={time}
              aria-label={copy.playbackPosition}
              onChange={(event) => setTime(Number(event.target.value))}
            />
            <span className="preview-label">{copy.motionPreview}</span>
            <button
              ref={expandButton}
              type="button"
              className="icon-button fullscreen"
              disabled={!ready}
              aria-label={expanded ? copy.collapse : copy.expand}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize /> : <Maximize />}
            </button>
          </div>
        </div>
        <div className="source-strip">
          <span className="source-heading">
            <Image aria-hidden="true" />
            {copy.source}
          </span>
          <span className="source-arrow">
            <MoveRight aria-hidden="true" />
          </span>
          <span className="source-result">{copy.sourceResult}</span>
          <span className="source-detail">{copy.sourceDetail}</span>
        </div>
      </div>
    </div>
  );
}

function Examples({ copy }: { copy: ScreenshotsCopy }) {
  const ready = useReady();
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const key = scenes[selected];
  function onTabKey(event: KeyboardEvent, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % scenes.length;
    else if (event.key === 'ArrowLeft')
      next = (index + scenes.length - 1) % scenes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = scenes.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    setPlaying(false);
    tabRefs.current[next]?.focus();
  }
  return (
    <section className="examples wrap section" id="examples">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{copy.examplesEyebrow}</p>
          <h2>
            {copy.examplesTitle1}
            <br />
            {copy.examplesTitle2}
          </h2>
        </div>
        <p>
          {copy.examplesDescription1}
          <br />
          {copy.examplesDescription2}
        </p>
      </div>
      <div className="tabs" role="tablist" aria-label={copy.examplesNav}>
        {scenes.map((scene, index) => (
          <button
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            key={scene}
            id={`tab-${scene}`}
            className={`tab ${index === selected ? 'active' : ''}`}
            type="button"
            role="tab"
            disabled={!ready}
            aria-selected={index === selected}
            aria-controls="example-panel"
            tabIndex={index === selected ? 0 : -1}
            onKeyDown={(event) => onTabKey(event, index)}
            onClick={() => {
              setSelected(index);
              setPlaying(false);
            }}
          >
            {copy[`${scene}Tab`]}
            <ArrowUpRight aria-hidden="true" />
          </button>
        ))}
      </div>
      <div
        className="example-grid"
        id="example-panel"
        role="tabpanel"
        aria-labelledby={`tab-${key}`}
        tabIndex={0}
      >
        <div
          className={`example-visual ${key === 'launch' ? '' : `${key}-example`}`}
        >
          <span className="example-kicker">{copy[`${key}Kicker`]}</span>
          <div className={`mini-browser ${playing ? 'playing' : ''}`}>
            <div className="browser-dots">
              <b />
              <b />
              <b />
              <span>orbit.app</span>
            </div>
            <img
              src={asset}
              alt={copy.dashboardAlt}
              width={1000}
              height={650}
              loading="lazy"
            />
          </div>
          <button
            type="button"
            className="example-play icon-button"
            disabled={!ready}
            aria-label={playing ? copy.pause : copy.play}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <span className="example-duration">
            {key === 'social'
              ? '00:10 / 9:16'
              : key === 'feature'
                ? '00:12 / 16:9'
                : '00:18 / 16:9'}
          </span>
        </div>
        <div className="example-info">
          <span className="number-label">
            0{selected + 1} / {copy[`${key}Tab`]}
          </span>
          <h3>
            {copy[`${key}Title1`]}
            <br />
            {copy[`${key}Title2`]}
          </h3>
          <p>{copy[`${key}Description`]}</p>
          <div className="example-tags">
            <span>{copy.productLed}</span>
            <span>{copy.readyToShare}</span>
          </div>
          <Link className="inline-link" href="/studio">
            {copy.makeLikeThis}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      <p className="sample-note">{copy.sampleNote}</p>
    </section>
  );
}

export function ScreenshotLanding({ copy }: { copy: ScreenshotsCopy }) {
  return (
    <div className="stv-site">
      <ScreenshotHeader copy={copy} />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap hero-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              {copy.heroEyebrow}
            </div>
            <h1 id="hero-title">
              {copy.heroTitle1}
              <br />
              <span>{copy.heroTitle2}</span>
            </h1>
            <p className="hero-description">
              {copy.heroDescription1}
              <br />
              {copy.heroDescription2}
            </p>
            <div className="hero-actions">
              <Link className="button dark large" href="/studio">
                {copy.createYourVideo}
                <ArrowUpRight aria-hidden="true" />
              </Link>
              <Link className="button text-button" href="#examples">
                <Play aria-hidden="true" />
                {copy.seeAction}
              </Link>
            </div>
            <p className="paid-note">
              <Sparkles aria-hidden="true" />
              {copy.heroNote}
            </p>
            <p className="duration-note">{copy.durationOptions}</p>
          </div>
          <Film copy={copy} />
        </section>
        <Examples copy={copy} />
        <section className="workflow section" id="how-it-works">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{copy.stepsEyebrow}</p>
                <h2>
                  {copy.stepsTitle1}
                  <br />
                  {copy.stepsTitle2}
                </h2>
              </div>
              <p>
                {copy.stepsDescription1}
                <br />
                {copy.stepsDescription2}
              </p>
            </div>
            <div className="steps">
              <article className="step">
                <div className="step-visual upload-visual">
                  <div className="paper paper-back" />
                  <div className="paper paper-front">
                    <img
                      src={asset}
                      alt={copy.dashboardAlt}
                      width={1000}
                      height={650}
                      loading="lazy"
                    />
                  </div>
                  <span className="upload-icon">
                    <ArrowUp aria-hidden="true" />
                  </span>
                </div>
                <div className="step-title">
                  <span>01</span>
                  <h3>{copy.step1Title}</h3>
                </div>
                <p>{copy.step1Description}</p>
              </article>
              <article className="step">
                <div className="step-visual direction-visual">
                  <div className="brief">
                    <Sparkles aria-hidden="true" />
                    <span>
                      {copy.brief1}
                      <br />
                      {copy.brief2}
                      <br />
                      {copy.brief3}
                    </span>
                    <span className="brief-send">
                      <ArrowUp aria-hidden="true" />
                    </span>
                  </div>
                </div>
                <div className="step-title">
                  <span>02</span>
                  <h3>{copy.step2Title}</h3>
                </div>
                <p>{copy.step2Description}</p>
              </article>
              <article className="step">
                <div className="step-visual export-visual">
                  <span className="export-orbit">
                    <Clapperboard aria-hidden="true" />
                  </span>
                  <div className="export-file">
                    <FileVideo2 aria-hidden="true" />
                    <span>your-next-launch.mp4</span>
                    <Check aria-hidden="true" />
                  </div>
                </div>
                <div className="step-title">
                  <span>03</span>
                  <h3>{copy.step3Title}</h3>
                </div>
                <p>{copy.step3Description}</p>
              </article>
            </div>
          </div>
        </section>
        <section className="details-section wrap section">
          <div className="detail-heading">
            <p className="eyebrow">{copy.valueEyebrow}</p>
            <h2>
              {copy.valueTitle1}
              <br />
              {copy.valueTitle2}
            </h2>
            <p>
              {copy.valueDescription1}
              <br />
              {copy.valueDescription2}
            </p>
          </div>
          <div className="detail-list">
            {[ScanEye, PanelsTopLeft, RefreshCw].map((Icon, index) => (
              <article key={index}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{copy[`value${index + 1}Title`]}</h3>
                  <p>{copy[`value${index + 1}Description`]}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <RealDemo copy={copy} />
        <section className="paid-section" id="paid-access">
          <div className="wrap paid-inner">
            <div>
              <p className="eyebrow">{copy.paidEyebrow}</p>
              <h2>
                {copy.paidTitle1}
                <br />
                {copy.paidTitle2}
              </h2>
              <p>
                {copy.paidDescription1}
                <br />
                {copy.paidDescription2}
              </p>
              <Link className="button lime large" href="/studio">
                {copy.createYourVideo}
                <ArrowUpRight aria-hidden="true" />
              </Link>
              <span className="access-note">{copy.paidNote}</span>
            </div>
            <div className="end-frame">
              <span className="end-frame-label">{copy.endLabel}</span>
              <span className="end-frame-type">
                {copy.endTitle1}
                <br />
                <em>{copy.endTitle2}</em>
              </span>
              <span className="end-frame-bottom">
                <Clapperboard aria-hidden="true" />
                {copy.endNote}
              </span>
            </div>
          </div>
        </section>
        <section className="faq wrap section" id="faq">
          <div>
            <p className="eyebrow">{copy.faqEyebrow}</p>
            <h2>
              {copy.faqTitle1}
              <br />
              {copy.faqTitle2}
            </h2>
          </div>
          <div className="faq-list">
            {Array.from({ length: 11 }, (_, index) => index + 1).map(
              (index) => (
                <details key={index}>
                  <summary>
                    {copy[`faq${index}Question`]}
                    <Plus aria-hidden="true" />
                  </summary>
                  <p>{copy[`faq${index}Answer`]}</p>
                </details>
              )
            )}
          </div>
        </section>
      </main>
      <ScreenshotFooter copy={copy} />
    </div>
  );
}
