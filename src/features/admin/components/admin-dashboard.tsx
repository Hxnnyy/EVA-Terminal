'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { AdminMetrics } from '@/features/admin/components/admin-metrics';
import {
  ContactEditor,
  SingletonTextareaEditor,
} from '@/features/admin/components/singleton-editor';
import type { AdminDashboardData, SectionState } from '@/features/admin/types';
import { createLogger } from '@/lib/logger';

function AdminLoader({ title }: { title: string }) {
  return (
    <div className="admin-card admin-card--loading" role="status" aria-live="polite">
      <h3>{title}</h3>
      <p>Loading...</p>
    </div>
  );
}

const LinksManager = dynamic(
  () => import('@/features/admin/components/links-manager').then((m) => m.LinksManager),
  { ssr: false, loading: () => <AdminLoader title="Links" /> },
);
const ProjectsManager = dynamic(
  () => import('@/features/admin/components/projects-manager').then((m) => m.ProjectsManager),
  { ssr: false, loading: () => <AdminLoader title="Projects" /> },
);
const ArticlesManager = dynamic(
  () => import('@/features/admin/components/articles-manager').then((m) => m.ArticlesManager),
  { ssr: false, loading: () => <AdminLoader title="Articles" /> },
);
const ReelManager = dynamic(
  () => import('@/features/admin/components/reel-manager').then((m) => m.ReelManager),
  { ssr: false, loading: () => <AdminLoader title="Reel" /> },
);
const CvManager = dynamic(
  () => import('@/features/admin/components/cv-manager').then((m) => m.CvManager),
  { ssr: false, loading: () => <AdminLoader title="CV" /> },
);
const InvestmentsPanel = dynamic(
  () => import('@/features/admin/components/investments-panel').then((m) => m.InvestmentsPanel),
  { ssr: false, loading: () => <AdminLoader title="Investments" /> },
);

type SectionKey = keyof AdminDashboardData['sections'];

const SECTION_LABELS: Record<SectionKey, string> = {
  bio: 'Bio',
  currently: 'Currently',
  contact: 'Contact',
  articles: 'Articles',
  links: 'Links',
  projects: 'Projects',
  investments: 'Investments',
  reel: 'Reel',
  onepager: 'One-Pager',
};

export function AdminDashboard(props: AdminDashboardData) {
  const {
    userEmail,
    summaryMetrics,
    bucketStatuses,
    sections,
    reelBucketStatus,
    cvBucketStatus,
    cvMeta,
    lastInvestmentFetch,
    warnings,
    correlationId,
  } = props;

  const failedSections = Object.entries(sections)
    .filter(([, state]) => state.status === 'error')
    .map(([key]) => SECTION_LABELS[key as SectionKey]);
  const inlineWarnings = [
    ...(warnings ?? []),
    ...(failedSections.length
      ? ['Some panels are using fallback data. Retry after restoring Supabase connectivity.']
      : []),
  ];

  return (
    <main className="admin-dashboard" role="main" aria-label="Admin dashboard">
      <a className="skip-link" href="#admin-editors">
        Skip to admin editors
      </a>
      <header className="admin-dashboard__header">
        <div>
          <h2>Welcome back, {userEmail}</h2>
          <p>
            Use the editors below to update the content that powers the terminal. Changes save
            directly to Supabase.
          </p>
        </div>
      </header>

      <AdminMetrics metrics={summaryMetrics} />

      {bucketStatuses.some((status) => !status.ok) ? (
        <div className="admin-card admin-card--warning" role="status" aria-live="polite">
          <h3>Storage buckets need attention</h3>
          <ul>
            {bucketStatuses
              .filter((status) => !status.ok)
              .map((status) => (
                <li key={status.name}>
                  <strong>{status.name}</strong>: {status.message}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {inlineWarnings.length > 0 ? (
        <div className="admin-card admin-card--warning" role="status" aria-live="polite">
          <h3>Operating in fallback mode</h3>
          <p>
            Live Supabase data was unavailable. Editors remain usable with cached/fallback values.
          </p>
          <ul>
            {inlineWarnings.map((message, index) => (
              <li key={message + index.toString()}>{message}</li>
            ))}
            {failedSections.map((label) => (
              <li key={label}>{label} panel is using fallback data.</li>
            ))}
          </ul>
          {correlationId ? (
            <p className="error-meta">
              <span className="admin-card__pill">Correlation ID</span>
              <code>{correlationId}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        id="admin-editors"
        tabIndex={-1}
        className="admin-dashboard__grid"
        role="region"
        aria-label="Admin editors"
      >
        <AdminSectionGuard title="Bio" state={sections.bio} correlationId={correlationId}>
          <SingletonTextareaEditor
            title="Bio"
            description="Add your bio for Option 1."
            singletonKey="bio"
            initialBody={sections.bio.data.rawBody ?? ''}
            fullWidth
          />
        </AdminSectionGuard>

        <AdminSectionGuard
          title="One-Pager"
          state={sections.onepager}
          correlationId={correlationId}
        >
          <SingletonTextareaEditor
            title="One-Pager"
            description="Edit MDX content for the /onepager command overlay. This renders as a full-screen accessible CV/summary."
            singletonKey="onepager"
            initialBody={sections.onepager.data.rawBody ?? ''}
            fullWidth
          />
        </AdminSectionGuard>

        <AdminSectionGuard
          title="Currently"
          state={sections.currently}
          correlationId={correlationId}
        >
          <SingletonTextareaEditor
            title="Currently"
            description="Add what you're currently doing for Option 7."
            singletonKey="currently"
            initialBody={sections.currently.data.rawBody ?? ''}
            fullWidth
          />
        </AdminSectionGuard>

        <AdminSectionGuard title="Contact" state={sections.contact} correlationId={correlationId}>
          <ContactEditor
            title="Contact"
            description="Add your Email/Phone/Discord data for Option 8."
            initialEmail={sections.contact.data.email ?? ''}
            initialPhone={sections.contact.data.phone ?? ''}
            initialDiscord={sections.contact.data.discord ?? ''}
            fullWidth
          />
        </AdminSectionGuard>

        <AdminSectionGuard title="Articles" state={sections.articles} correlationId={correlationId}>
          <ArticlesManager
            initialArticles={sections.articles.data.map((article) => ({
              id: article.id,
              slug: article.slug,
              title: article.title,
              subtitle: article.subtitle,
              status: article.status,
              updatedAt: article.updatedAt,
              body: article.bodyMdx,
            }))}
          />
        </AdminSectionGuard>

        <AdminSectionGuard title="Links" state={sections.links} correlationId={correlationId}>
          <LinksManager
            initialLinks={sections.links.data.map((link) => ({
              id: link.id,
              category: link.category,
              label: link.label,
              url: link.url,
              order: link.order ?? 0,
            }))}
          />
        </AdminSectionGuard>

        <AdminSectionGuard title="Projects" state={sections.projects} correlationId={correlationId}>
          <ProjectsManager
            initialProjects={sections.projects.data.map((project) => ({
              ...project,
              order: project.order ?? 0,
            }))}
          />
        </AdminSectionGuard>

        <AdminSectionGuard
          title="Investments"
          state={sections.investments}
          correlationId={correlationId}
        >
          <InvestmentsPanel
            initialInvestments={sections.investments.data}
            lastRefreshed={lastInvestmentFetch}
          />
        </AdminSectionGuard>

        <AdminSectionGuard title="Reel" state={sections.reel} correlationId={correlationId}>
          <ReelManager initialReel={sections.reel.data} bucketStatus={reelBucketStatus} />
        </AdminSectionGuard>

        <AdminPanelBoundary title="CV">
          <CvManager
            lastUpdated={cvMeta?.last_updated ?? null}
            downloadUrl={cvMeta?.download_url ?? null}
            fileName={cvMeta?.file_name ?? null}
            bucketStatus={cvBucketStatus}
          />
        </AdminPanelBoundary>
      </div>
    </main>
  );
}

type AdminSectionGuardProps<T> = {
  title: string;
  state: SectionState<T>;
  correlationId?: string;
  children: React.ReactNode;
};

function AdminSectionGuard<T>({
  title,
  state,
  correlationId,
  children,
}: AdminSectionGuardProps<T>) {
  return (
    <AdminPanelBoundary
      title={title}
      correlationId={correlationId}
      fallbackMessage={state.status === 'error' ? state.message : undefined}
    >
      {state.status === 'error' ? (
        <AdminSectionFallback
          title={title}
          message={state.message ?? `${title} Data failed to load. Using fallback values.`}
          correlationId={correlationId}
        />
      ) : null}
      {children}
    </AdminPanelBoundary>
  );
}

type AdminPanelBoundaryProps = {
  title: string;
  fallbackMessage?: string;
  correlationId?: string;
  children: React.ReactNode;
};

type AdminPanelBoundaryState = {
  hasError: boolean;
  message?: string;
};

class AdminPanelBoundary extends React.Component<AdminPanelBoundaryProps, AdminPanelBoundaryState> {
  state: AdminPanelBoundaryState = { hasError: false, message: undefined };
  logger = createLogger({ scope: 'admin:panel-boundary' });

  static getDerivedStateFromError(error: Error): AdminPanelBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the specific panel to help debugging without breaking the whole dashboard.
    this.logger.error(`[Admin] ${this.props.title} panel crashed`, { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <AdminSectionFallback
          title={this.props.title}
          message={this.state.message ?? this.props.fallbackMessage}
          correlationId={this.props.correlationId}
        />
      );
    }

    return this.props.children;
  }
}

function AdminSectionFallback({
  title,
  message,
  correlationId,
}: {
  title: string;
  message?: string;
  correlationId?: string;
}) {
  return (
    <div className="admin-card admin-card--warning" role="status" aria-live="polite">
      <h3>{title} unavailable</h3>
      <p>
        {message ??
          'This section could not load live data. Refresh or retry after checking Supabase.'}
      </p>
      <p className="admin-card__description">
        We kept fallback values loaded so you can keep editing; save again after the connection is
        restored.
      </p>
      {correlationId ? (
        <p className="error-meta">
          <span className="admin-card__pill">Correlation ID</span>
          <code>{correlationId}</code>
        </p>
      ) : null}
    </div>
  );
}
