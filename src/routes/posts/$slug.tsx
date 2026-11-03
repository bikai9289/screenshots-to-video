import React from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { LazyImage } from '@/components/lazy';
import {
  BLOG_POSTS,
  type BlogPost,
} from '@/components/sites/shared/posts-data';

export const Route = createFileRoute('/posts/$slug')({
  loader: ({ params }): { post: BlogPost } => {
    const post = BLOG_POSTS[params.slug];
    if (!post) {
      throw notFound();
    }
    return { post };
  },
  head: ({ loaderData, params }) => {
    const post = (loaderData as { post?: BlogPost } | undefined)?.post;
    const appName = envConfigs.app_name || 'App';
    const appUrl =
      (typeof window !== 'undefined' && window.location?.origin) ||
      envConfigs.app_url ||
      'http://localhost:3000';
    if (!post) {
      return {
        meta: [{ title: `Post Not Found - ${appName}` }],
      };
    }
    const pageUrl = `${appUrl}/posts/${params.slug}`;
    const articleJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      image: post.image ? [post.image] : undefined,
      datePublished: post.date,
      author: {
        '@type': 'Organization',
        name: `${appName} Team`,
      },
      publisher: {
        '@type': 'Organization',
        name: appName,
        logo: {
          '@type': 'ImageObject',
          url: `${appUrl}/logo.svg`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': pageUrl,
      },
    };

    return {
      meta: [
        { title: `${post.title} - ${appName}` },
        { name: 'description', content: post.description },
        { name: 'keywords', content: `${post.tag}, AI, ${appName}, guide` },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: post.title },
        { property: 'og:description', content: post.description },
        { property: 'og:url', content: pageUrl },
        ...(post.image ? [{ property: 'og:image', content: post.image }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: post.title },
        { name: 'twitter:description', content: post.description },
        ...(post.image ? [{ name: 'twitter:image', content: post.image }] : []),
      ],
      links: [{ rel: 'canonical', href: pageUrl }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(articleJsonLd),
        },
      ],
    };
  },
  component: PostDetailPage,
});

function PostDetailPage() {
  const { post } = Route.useLoaderData() as { post: BlogPost };

  if (!post) return null;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
      <Header />
      <main className="flex-1 pt-[65px]">
        <article className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
          {/* Breadcrumbs */}
          <nav className="mb-6">
            <ol className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <li>
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  {m['stp.nav.home']()}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href="/posts"
                  className="hover:text-foreground transition-colors"
                >
                  {m['stp.nav.blog']()}
                </Link>
              </li>
              <li>/</li>
              <li className="text-foreground max-w-[200px] truncate font-semibold sm:max-w-none">
                {post.title}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-0.5 text-xs font-semibold text-blue-500">
                {post.tag}
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                {post.date}
              </span>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs font-medium">
                {post.readTime}
              </span>
            </div>

            <h1 className="text-foreground text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            <p className="text-muted-foreground text-base leading-relaxed font-normal sm:text-lg">
              {post.description}
            </p>
          </div>

          {/* Featured Image */}
          {post.image && (
            <div className="bg-muted border-border relative mb-10 aspect-video w-full overflow-hidden rounded-2xl border shadow-md">
              <LazyImage
                src={post.image}
                alt={post.title}
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full"
              />
            </div>
          )}

          {/* Article Body */}
          <div className="prose prose-gray dark:prose-invert text-foreground/90 max-w-none space-y-8 text-base leading-relaxed">
            {post.content.map((sec, idx) => (
              <section key={idx} className="space-y-3">
                {sec.heading && (
                  <h2 className="text-foreground pt-2 text-xl font-bold tracking-tight sm:text-2xl">
                    {sec.heading}
                  </h2>
                )}
                {sec.paragraphs.map((para, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-muted-foreground leading-relaxed"
                  >
                    {para}
                  </p>
                ))}
                {sec.list && (
                  <ul className="text-muted-foreground list-disc space-y-1.5 pl-6">
                    {sec.list.map((item, lIdx) => (
                      <li key={lIdx}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Back link & CTA */}
          <div className="border-border mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {m['stp.common.back_to_articles']()}
            </Link>

            <Link
              href="/ai-video-generator"
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700"
            >
              {m['stp.common.try_free']()}
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
