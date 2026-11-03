import React from 'react';

import { Link } from '@/core/i18n/navigation';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={className}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="text-muted-foreground/75 flex items-center gap-1.5 text-xs font-medium">
            {breadcrumbs.map((b, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <li className="text-muted-foreground/40 text-[10px]">/</li>
                  )}
                  <li>
                    {b.href && !isLast ? (
                      <Link
                        href={b.href}
                        className="hover:text-foreground transition-colors"
                      >
                        {b.label}
                      </Link>
                    ) : (
                      <span className="text-foreground font-semibold">
                        {b.label}
                      </span>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </nav>
      )}
      <h1 className="text-foreground font-serif text-3xl font-extrabold tracking-tight break-words sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mt-1.5 max-w-3xl text-sm leading-relaxed break-words">
          {description}
        </p>
      )}
    </div>
  );
}
