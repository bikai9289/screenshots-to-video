'use client';

import React, { useState } from 'react';

import { m } from '@/paraglide/messages.js';
import {
  FEATURE_FAQS,
  type FAQItem,
} from '@/components/sites/shared/faqs-data';
import type { FeatureType } from '@/components/sites/shared/inspirations-data';

export type { FAQItem };

interface FAQSectionProps {
  title?: string;
  feature?: FeatureType;
  items?: FAQItem[];
}

export function FAQSection({ title, feature, items }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const resolvedItems = items ?? (feature ? FEATURE_FAQS[feature] : []) ?? [];
  if (!resolvedItems.length) return null;

  const resolvedTitle = title ?? m['stp.common.faq_title']();

  return (
    <section className="border-border/50 border-t py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground mb-8 text-center text-2xl font-bold md:text-3xl">
          {resolvedTitle}
        </h2>

        <div className="space-y-3">
          {resolvedItems.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="border-border bg-card text-card-foreground overflow-hidden rounded-xl border shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="text-foreground hover:bg-muted/40 flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold transition-colors md:text-base"
                >
                  <span>{faq.question}</span>
                  <span className="text-muted-foreground shrink-0 text-xl transition-transform duration-200">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="text-muted-foreground border-border/40 border-t px-5 pt-1 pb-4 text-xs leading-relaxed md:text-sm">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
