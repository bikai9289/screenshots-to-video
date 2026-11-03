'use client';

import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Sparkles, Video, Wand2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

export function FaqCta() {
  const faqs = [
    {
      q: m['landing.faq.q1'](),
      a: m['landing.faq.a1'](),
    },
    {
      q: m['landing.faq.q2'](),
      a: m['landing.faq.a2'](),
    },
    {
      q: m['landing.faq.q3'](),
      a: m['landing.faq.a3'](),
    },
    {
      q: m['landing.faq.q4'](),
      a: m['landing.faq.a4'](),
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <>
      {/* FAQ Section */}
      <section className="border-border/60 bg-muted/20 border-t py-20 sm:py-28">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary mb-3.5 px-3 py-1 text-xs font-semibold"
            >
              <span>{m['landing.faq.badge']()}</span>
            </Badge>
            <h2 className="text-foreground font-serif text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {m['landing.faq.main_title']()}
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base leading-relaxed">
              {m['landing.faq.main_desc']()}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-card border-border/80 overflow-hidden rounded-2xl border transition-colors"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="hover:bg-muted/40 flex w-full items-center justify-between p-5 text-left transition-colors sm:p-6"
                  >
                    <span className="text-foreground text-base font-semibold sm:text-lg">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        'text-muted-foreground size-5 shrink-0 transition-transform duration-200',
                        isOpen && 'text-primary rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="text-muted-foreground border-border/60 border-t px-5 pt-3 pb-5 text-sm leading-relaxed sm:px-6 sm:pb-6 sm:text-base">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-border/60 bg-background relative overflow-hidden border-t py-24 sm:py-32">
        {/* Glow */}
        <div className="from-primary/20 to-primary/20 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r via-purple-500/20 blur-[120px]" />

        <div className="relative z-10 container mx-auto max-w-5xl px-4 text-center sm:px-6">
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary mb-4 px-3.5 py-1 text-xs font-semibold"
          >
            <Sparkles className="mr-1.5 size-3" />
            <span>{m['landing.cta.badge']()}</span>
          </Badge>
          <h2 className="text-foreground mx-auto max-w-3xl font-serif text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {m['landing.cta.banner_title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg md:text-xl">
            {m['landing.cta.banner_desc']()}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ai-image-generator"
              search={{ prompt: undefined, model: undefined, image: undefined }}
              className={buttonVariants({
                size: 'lg',
                className:
                  'h-13 gap-2 rounded-xl px-8 text-base font-semibold shadow-lg hover:scale-105',
              })}
            >
              <Sparkles className="size-4.5" />
              <span>{m['app.generator.start_image']()}</span>
            </Link>

            <Link
              to="/ai-video-generator"
              search={{
                prompt: undefined,
                model: undefined,
                startImageUrl: undefined,
              }}
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className:
                  'border-border/80 hover:bg-muted/80 h-13 gap-2 rounded-xl px-8 text-base font-semibold shadow-sm hover:scale-105',
              })}
            >
              <Video className="size-4.5" />
              <span>{m['app.generator.start_video']()}</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
