'use client';

import React from 'react';
import { Star } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';

export function StatsTestimonials() {
  const stats = [
    {
      value: '500K+',
      label: m['landing.testimonials.stat1_label'](),
      desc: m['landing.testimonials.stat1_desc'](),
    },
    {
      value: '1,000,000+',
      label: m['landing.testimonials.stat2_label'](),
      desc: m['landing.testimonials.stat2_desc'](),
    },
    {
      value: '60s',
      label: m['landing.testimonials.stat3_label'](),
      desc: m['landing.testimonials.stat3_desc'](),
    },
  ];

  const testimonials = [
    {
      name: 'Alex G.',
      role: m['landing.testimonials.t1_role'](),
      avatar: '/imgs/users/1.png',
      quote: m['landing.testimonials.t1_quote'](),
    },
    {
      name: 'Jenna R.',
      role: m['landing.testimonials.t2_role'](),
      avatar: '/imgs/users/2.png',
      quote: m['landing.testimonials.t2_quote'](),
    },
    {
      name: 'Carlos S.',
      role: m['landing.testimonials.t3_role'](),
      avatar: '/imgs/users/3.png',
      quote: m['landing.testimonials.t3_quote'](),
    },
    {
      name: 'Maria K.',
      role: m['landing.testimonials.t4_role'](),
      avatar: '/imgs/users/4.png',
      quote: m['landing.testimonials.t4_quote'](),
    },
  ];

  return (
    <section className="border-border/60 bg-background relative border-t py-20 sm:py-28">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="border-border/60 bg-card mb-20 grid grid-cols-1 divide-y rounded-3xl border shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((item, idx) => (
            <div key={idx} className="p-8 text-center sm:p-10">
              <div className="text-primary font-serif text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                {item.value}
              </div>
              <div className="text-foreground mt-2 text-base font-bold sm:text-lg">
                {item.label}
              </div>
              <div className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials Header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary mb-3.5 px-3 py-1 text-xs font-semibold"
          >
            <span>{m['landing.testimonials.badge']()}</span>
          </Badge>
          <h2 className="text-foreground font-serif text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {m['landing.testimonials.main_title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.testimonials.main_desc']()}
          </p>
        </div>

        {/* Testimonials 2x2 Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="bg-card border-border/80 hover:border-primary/40 relative flex flex-col justify-between rounded-2xl border p-7 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div>
                <div className="mb-4 flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-amber-500 text-amber-500"
                    />
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed sm:text-base">
                  "{item.quote}"
                </p>
              </div>

              <div className="border-border/60 mt-6 flex items-center gap-3.5 border-t pt-4">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="size-11 rounded-full object-cover shadow-inner"
                />
                <div>
                  <div className="text-foreground text-sm font-bold">
                    {item.name}
                  </div>
                  <div className="text-muted-foreground text-xs font-medium">
                    {item.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
