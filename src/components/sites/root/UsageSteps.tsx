'use client';

import React from 'react';
import { Compass, Sparkles, Wand2 } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';

export function UsageSteps() {
  const steps = [
    {
      step: '01',
      title: m['landing.steps.s1_title'](),
      desc: m['landing.steps.s1_desc'](),
    },
    {
      step: '02',
      title: m['landing.steps.s2_title'](),
      desc: m['landing.steps.s2_desc'](),
    },
    {
      step: '03',
      title: m['landing.steps.s3_title'](),
      desc: m['landing.steps.s3_desc'](),
    },
  ];

  return (
    <section className="border-border/60 bg-background relative border-t py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary mb-3.5 px-3 py-1 text-xs font-semibold"
          >
            <Sparkles className="mr-1.5 size-3" />
            <span>{m['landing.steps.badge']()}</span>
          </Badge>
          <h2 className="text-foreground font-serif text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {m['landing.steps.title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.steps.desc']()}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="bg-card border-border/80 relative rounded-2xl border p-8 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <span className="text-primary/40 dark:text-primary/30 mb-4 block font-mono text-4xl font-extrabold sm:text-5xl">
                {item.step}
              </span>
              <h3 className="text-foreground mb-3 text-xl font-bold">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
