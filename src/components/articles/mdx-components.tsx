/* eslint-disable @next/next/no-img-element */
import Image from 'next/image';
import type { ComponentProps } from 'react';

import { env } from '@/lib/env';

const isExternal = (href?: string | null) => (href ? /^https?:\/\//.test(href) : false);

const allowedHosts = (() => {
  const hosts = new Set(['images.unsplash.com', 'cdn.example.dev']);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      hosts.add(new URL(supabaseUrl).hostname);
    } catch {
      // ignore malformed env
    }
  }
  return hosts;
})();

const canUseNextImage = (src: string, width: number, height: number) => {
  if (!src || !Number.isFinite(width) || !Number.isFinite(height)) {
    return false;
  }
  if (src.startsWith('/')) {
    return true;
  }
  try {
    const { hostname } = new URL(src);
    return allowedHosts.has(hostname);
  } catch {
    return false;
  }
};

function ArticleLink(props: ComponentProps<'a'>) {
  const external = isExternal(props.href ?? undefined);
  return (
    <a
      {...props}
      target={external ? '_blank' : props.target}
      rel={external ? 'noreferrer noopener' : props.rel}
      className="articles-mdx-link"
    />
  );
}

function ArticleImage(props: ComponentProps<'img'>) {
  const { alt, src, width, height, className, loading, ...rest } = props;
  const resolvedSrc = typeof src === 'string' ? src : '';
  const resolvedWidth = typeof width === 'number' ? width : Number(width);
  const resolvedHeight = typeof height === 'number' ? height : Number(height);
  const classes = ['articles-mdx-image', className].filter(Boolean).join(' ');
  const useOptimized = canUseNextImage(resolvedSrc, resolvedWidth, resolvedHeight);
  const loadingMode = loading === 'eager' ? 'eager' : 'lazy';

  if (useOptimized) {
    return (
      <Image
        src={resolvedSrc}
        alt={alt ?? ''}
        width={resolvedWidth}
        height={resolvedHeight}
        className={classes}
        loading={loadingMode}
        sizes="(min-width: 960px) 720px, 90vw"
      />
    );
  }

  return (
    <img
      {...rest}
      src={resolvedSrc}
      alt={alt ?? ''}
      width={width}
      height={height}
      loading={loadingMode}
      className={classes}
    />
  );
}

function ArticlePre(props: ComponentProps<'pre'>) {
  return <pre {...props} className="articles-mdx-pre" />;
}

function ArticleCode(props: ComponentProps<'code'>) {
  return <code {...props} className="articles-mdx-code" />;
}

export const articlesMdxComponents = {
  a: ArticleLink,
  img: ArticleImage,
  pre: ArticlePre,
  code: ArticleCode,
};
