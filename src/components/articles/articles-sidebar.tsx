'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useMobileViewport } from '@/features/terminal/hooks/use-mobile-viewport';
import type { ArticleMonthGroup } from '@/lib/articles/grouping';

type ArticlesSidebarProps = {
  groups: ArticleMonthGroup[];
  activeSlug?: string;
};

export function ArticlesSidebar({ groups, activeSlug }: ArticlesSidebarProps) {
  // Start with null to avoid hydration mismatch, then set based on viewport
  const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);
  const isMobile = useMobileViewport();

  // Set initial collapsed state after hydration based on viewport
  useEffect(() => {
    if (isCollapsed === null) {
      setIsCollapsed(isMobile);
    }
  }, [isMobile, isCollapsed]);

  const activeGroupId = activeSlug
    ? (groups.find((group) => group.entries.some((entry) => entry.slug === activeSlug))?.id ?? null)
    : null;

  // Use false as default during SSR/hydration to avoid mismatch
  const collapsed = isCollapsed ?? false;

  return (
    <div
      className={clsx('articles-sidebar', collapsed && 'articles-sidebar--collapsed')}
      data-testid="articles-sidebar"
    >
      <button
        type="button"
        className="articles-sidebar__mobile-toggle"
        onClick={() => setIsCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show navigation' : 'Hide navigation'}
      >
        {collapsed ? '☰ Navigation' : '✕ Close'}
      </button>

      <div className="articles-sidebar__content">
        <div className="articles-sidebar__header">
          <p className="articles-sidebar__eyebrow">Articles</p>
          <h2>Field Notes & Logs</h2>
          <p className="articles-sidebar__hint">Select a title to load it in the reader.</p>
        </div>
        <div className="articles-sidebar__groups">
          {!groups.length ? (
            <div className="articles-sidebar__hint" role="status" aria-live="polite">
              <p>No articles are published yet. Publish your first entry in the admin console.</p>
              <Link className="admin-button-accent" href="/admin">
                Open admin
              </Link>
            </div>
          ) : (
            groups.map((group, index) => {
              const isOpen = activeGroupId ? group.id === activeGroupId : index === 0;
              const listId = `articles-group-${group.id}`;
              return (
                <details
                  key={group.id}
                  className="articles-sidebar__group"
                  open={isOpen}
                  data-testid="articles-sidebar-group"
                >
                  <summary
                    className="articles-sidebar__group-toggle"
                    aria-controls={listId}
                    data-testid="articles-sidebar-group-toggle"
                  >
                    <span>{group.label}</span>
                    <span className="articles-sidebar__group-count">{group.entries.length}</span>
                  </summary>
                  <ul className="articles-sidebar__list" id={listId}>
                    {group.entries.map((entry) => {
                      const isActive = entry.slug === activeSlug;
                      return (
                        <li key={entry.id}>
                          <Link
                            className={clsx('articles-sidebar__link', isActive && 'is-active')}
                            href={`/articles/${entry.slug}`}
                            data-testid="articles-sidebar-link"
                            data-article-slug={entry.slug}
                            data-article-title={entry.title}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => setIsCollapsed(true)}
                          >
                            <span className="articles-sidebar__link-title">{entry.title}</span>
                            {entry.subtitle ? (
                              <span className="articles-sidebar__link-subtitle">
                                {entry.subtitle}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
