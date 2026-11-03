'use client';

import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ImageGeneratorWorkspace } from '@/components/sites/generator/ImageGeneratorWorkspace';
import { ShowcasesFlowDynamic } from '@/components/sites/showcase/ShowcasesFlowDynamic';

function AIImageGeneratorPage() {
  const search = Route.useSearch();

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 px-4 pt-20 pb-16 sm:px-6 md:pt-24 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          {/* Header Banner */}
          <div className="mb-6 text-center md:mb-10 md:text-left">
            <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>Nanobanana Joyflix Studio</span>
            </div>
            <h1 className="text-foreground mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-5xl">
              {m['app.generator.image_title']()}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base md:text-lg">
              {m['app.generator.image_subtitle']()}
            </p>
          </div>

          {/* Generator Workspace */}
          <ImageGeneratorWorkspace search={search} />

          {/* Inspiration Gallery Section */}
          <div className="border-border/60 mt-14 border-t pt-12 sm:mt-20 sm:pt-16">
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                {m['app.generator.showcases_title']()}
              </h2>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {m['app.generator.showcases_subtitle']()}
              </p>
            </div>
            <ShowcasesFlowDynamic type="image" hideCreateButton={false} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/ai-image-generator')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      prompt: typeof search.prompt === 'string' ? search.prompt : undefined,
      model: typeof search.model === 'string' ? search.model : undefined,
      image: typeof search.image === 'string' ? search.image : undefined,
    };
  },
  component: AIImageGeneratorPage,
});
