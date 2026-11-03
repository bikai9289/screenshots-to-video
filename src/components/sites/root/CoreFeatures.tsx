'use client';

import React from 'react';
import {
  Clapperboard,
  FastForward,
  Layers,
  Ratio,
  Sparkles,
  UserCheck,
  Wand2,
} from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';

export function CoreFeatures() {
  const features = [
    {
      title: m['landing.core_features.f1_title'](),
      desc: m['landing.core_features.f1_desc'](),
      icon: Wand2,
    },
    {
      title: m['landing.core_features.f2_title'](),
      desc: m['landing.core_features.f2_desc'](),
      icon: Clapperboard,
    },
    {
      title: m['landing.core_features.f3_title'](),
      desc: m['landing.core_features.f3_desc'](),
      icon: UserCheck,
    },
    {
      title: m['landing.core_features.f4_title'](),
      desc: m['landing.core_features.f4_desc'](),
      icon: Layers,
    },
    {
      title: m['landing.core_features.f5_title'](),
      desc: m['landing.core_features.f5_desc'](),
      icon: Ratio,
    },
    {
      title: m['landing.core_features.f6_title'](),
      desc: m['landing.core_features.f6_desc'](),
      icon: FastForward,
    },
  ];

  return (
    <section className="border-border/60 bg-muted/20 border-t py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary mb-3.5 px-3 py-1 text-xs font-semibold"
          >
            <Sparkles className="mr-1.5 size-3" />
            <span>{m['landing.core_features.badge']()}</span>
          </Badge>
          <h2 className="text-foreground font-serif text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {m['landing.core_features.title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.core_features.desc']()}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-card border-border/80 hover:border-primary/40 group relative rounded-2xl border p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-4 flex size-11 items-center justify-center rounded-xl transition-colors duration-200">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-foreground mb-2 text-lg font-bold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
