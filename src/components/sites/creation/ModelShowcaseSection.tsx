'use client';

import React from 'react';

import type { FeatureType } from '@/components/sites/shared/inspirations-data';
import {
  FEATURE_MODEL_DETAILS,
  type ModelDetail,
} from '@/components/sites/shared/showcase-models-data';

export type { ModelDetail };

interface ModelShowcaseSectionProps {
  title?: string;
  subtitle?: string;
  feature?: FeatureType;
  models?: ModelDetail[];
}

export function ModelShowcaseSection({
  title = 'Featured AI Models',
  subtitle = 'Choose from cutting-edge industry models tailored for every use case',
  feature,
  models,
}: ModelShowcaseSectionProps) {
  const resolvedModels =
    models ?? (feature ? FEATURE_MODEL_DETAILS[feature] : []) ?? [];
  if (!resolvedModels.length) return null;

  return (
    <section className="border-border/50 border-t py-10">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="text-foreground text-2xl leading-tight font-bold md:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground mt-2 text-xs sm:text-sm">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {resolvedModels.map((model, idx) => (
          <div
            key={idx}
            className="group border-border/70 bg-card/70 hover:bg-card hover:border-primary/40 text-card-foreground hover:shadow-primary/5 flex flex-col justify-between rounded-2xl border p-5 shadow-2xs backdrop-blur-xs transition-all duration-300 hover:shadow-lg"
          >
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-foreground group-hover:text-primary truncate text-base font-bold transition-colors sm:text-lg">
                  {model.name}
                </h3>
                {model.badge && (
                  <span className="border-border/80 bg-muted/60 text-muted-foreground shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold">
                    {model.badge}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                {model.description}
              </p>
            </div>

            <div className="border-border/60 mt-4 flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-foreground font-semibold">
                {model.credits}
              </span>
              <span className="text-muted-foreground bg-muted/60 border-border/50 rounded-lg border px-2 py-0.5 text-[11px] font-medium">
                {model.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
