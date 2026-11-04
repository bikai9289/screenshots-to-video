import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

import type { ScreenshotsCopy } from './types';

export function RealDemo({ copy }: { copy: ScreenshotsCopy }) {
  const [duration, setDuration] = useState<10 | 15>(10);
  const [started, setStarted] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const videoUrl = `https://media.screenshotstovideo.com/demos/orbit-${duration}s-20261104.mp4`;
  return (
    <section className="verified-demo wrap section" id="real-output">
      <div className="verified-demo-copy">
        <p className="eyebrow">{copy.realDemoEyebrow}</p>
        <h2>{copy.realDemoTitle}</h2>
        <p>{copy.realDemoDescription}</p>
        <a
          className="demo-source"
          href="/imgs/screenshots-to-video/orbit-dashboard.png"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/imgs/screenshots-to-video/orbit-dashboard.png"
            width="2000"
            height="1300"
            loading="lazy"
            alt={copy.demoSourceAlt}
          />
          <span>
            {copy.demoSourceLabel} <span aria-hidden="true">↗</span>
          </span>
        </a>
      </div>
      <figure>
        <div
          className="demo-duration-picker"
          role="group"
          aria-label={copy.durationLabel}
        >
          {[10, 15].map((seconds) => (
            <button
              key={seconds}
              type="button"
              aria-pressed={duration === seconds}
              onClick={() => {
                player.current?.pause();
                setStarted(false);
                setDuration(seconds as 10 | 15);
              }}
            >
              {seconds}s
            </button>
          ))}
          <span>16:9 · 720p MP4</span>
        </div>
        <div className="demo-player">
          <video
            ref={player}
            key={duration}
            controls={started}
            onPlay={() => setStarted(true)}
            playsInline
            preload="metadata"
            poster={`/videos/screenshots-to-video/orbit-${duration}s-poster.png`}
            width="1280"
            height="720"
            aria-label={`${copy.realDemoTitle} ${duration}s`}
          >
            <source src={videoUrl} type="video/mp4" />
            <a href={videoUrl}>{copy.realDemoDownload}</a>
          </video>
          {!started && (
            <button
              className="demo-launch"
              type="button"
              aria-label={`${copy.playRealDemo} ${duration}s`}
              onClick={() => {
                setStarted(true);
                void player.current?.play().catch(() => setStarted(false));
              }}
            >
              <Play aria-hidden="true" />
            </button>
          )}
        </div>
        <figcaption>{copy.realDemoCaption}</figcaption>
      </figure>
    </section>
  );
}
