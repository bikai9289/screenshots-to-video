import React from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { LazyImage } from '@/components/lazy';
import { BLOG_POSTS_LIST } from '@/components/sites/shared/posts-data';

export const Route = createFileRoute('/posts/')({
  head: () => {
    const title = m['stp.blog.title']();
    const description = m['stp.blog.meta_desc']();
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        {
          name: 'keywords',
          content: `AI blog, tutorials, guides, AI video, AI image, ${envConfigs.app_name}`,
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    };
  },
  component: PostsIndexPage,
});

function PostsIndexPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
      <Header />
      <main className="flex-1 pt-[65px]">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h1 className="text-foreground mb-3 text-4xl font-extrabold tracking-tight">
              {m['stp.blog.heading']()}
            </h1>
            <p className="text-muted-foreground text-base">
              {m['stp.blog.subheading']()}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS_LIST.map((post) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="group border-border bg-card text-card-foreground flex flex-col overflow-hidden rounded-2xl border shadow-xs transition-all duration-300 hover:shadow-lg"
              >
                <div className="bg-muted relative aspect-video w-full overflow-hidden">
                  <LazyImage
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    wrapperClassName="h-full w-full"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
                    {post.tag}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                      <span>{post.date}</span>
                      <span>•</span>
                      <span>{post.readTime}</span>
                    </div>
                    <h2 className="text-foreground mt-1.5 mb-2 line-clamp-2 text-lg font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                      {post.description}
                    </p>
                  </div>

                  <span className="mt-4 inline-flex items-center text-xs font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5 dark:text-blue-400">
                    {m['stp.blog.read_more']()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
