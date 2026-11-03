import { Calendar } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { LazyImage } from '@/components/lazy';

export type BlogCardProps = {
  href: string;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  authorName?: string;
  authorImage?: string;
};

export function BlogCard({
  href,
  title,
  description,
  image,
  date,
  authorName,
  authorImage,
}: BlogCardProps) {
  return (
    <Link
      href={href}
      className="group border-border bg-card hover:border-foreground/20 relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:shadow-sm"
    >
      {image && (
        <LazyImage
          src={image}
          alt={title}
          width={640}
          height={360}
          className="aspect-video w-full object-cover object-center"
          wrapperClassName="aspect-video w-full"
        />
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="leading-snug font-medium group-hover:underline group-hover:underline-offset-4">
          {title}
        </h3>
        {description && (
          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
            {description}
          </p>
        )}
        <div className="text-muted-foreground mt-auto flex items-center gap-2 pt-2 text-xs">
          {date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {date}
            </span>
          )}
          <span className="flex-1" />
          {(authorName || authorImage) && (
            <span className="inline-flex items-center gap-2">
              {authorImage && (
                <LazyImage
                  src={authorImage}
                  alt={authorName || ''}
                  width={20}
                  height={20}
                  className="size-5 rounded-full object-cover"
                  wrapperClassName="size-5 rounded-full"
                />
              )}
              {authorName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
