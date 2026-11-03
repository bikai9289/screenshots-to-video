'use client';

import React from 'react';
import {
  Layers,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
  Wand2,
} from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';

export function IntroduceBenefits() {
  const benefits = [
    {
      title: m['landing.benefits.b1_title'](),
      description: m['landing.benefits.b1_desc'](),
      icon: Layers,
    },
    {
      title: m['landing.benefits.b2_title'](),
      description: m['landing.benefits.b2_desc'](),
      icon: UserCheck,
    },
    {
      title: m['landing.benefits.b3_title'](),
      description: m['landing.benefits.b3_desc'](),
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="border-border/60 bg-muted/20 border-t py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary mb-3.5 px-3 py-1 text-xs font-semibold"
          >
            <Sparkles className="mr-1.5 size-3" />
            <span>{m['landing.benefits.badge']()}</span>
          </Badge>
          <h2 className="text-foreground font-serif text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {m['landing.benefits.title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.benefits.desc']()}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group bg-card border-border/80 hover:border-primary/50 relative overflow-hidden rounded-2xl border p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-5 flex size-12 items-center justify-center rounded-xl transition-colors duration-300">
                  <Icon className="size-6" />
                </div>
                <h3 className="text-foreground mb-2.5 text-lg font-bold sm:text-xl">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
