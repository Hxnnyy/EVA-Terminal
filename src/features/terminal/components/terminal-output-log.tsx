'use client';

import clsx from 'clsx';
import React, { useEffect, useMemo, useRef } from 'react';

const LINK_REGEX = /(https?:\/\/[^\s]+)/g;

export type RenderableLine = {
  text: string;
  kind?: string;
  id: string;
  segments?: { text: string; kind?: string; href?: string }[];
};

type Props = {
  output: RenderableLine[];
  typingLine?: { id: string; kind?: string; visibleText: string } | null;
};

function renderSpan(text: string, kind: string | undefined, key: string) {
  if (!text) return null;
  return (
    <span key={key} className={clsx('terminal-segment', kind)}>
      {text}
    </span>
  );
}

function renderTextWithLinks(text: string, kind: string | undefined, keyPrefix: string) {
  const matches = [...text.matchAll(LINK_REGEX)];
  if (!matches.length) {
    return renderSpan(text, kind, keyPrefix);
  }
  const nodes: Array<string | React.ReactNode> = [];
  let lastIndex = 0;
  matches.forEach((match, index) => {
    const url = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(renderSpan(text.slice(lastIndex, start), kind, `${keyPrefix}-text-${index}`));
    }
    nodes.push(
      <a
        key={`${keyPrefix}-link-${index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="terminal-link"
      >
        {url}
      </a>,
    );
    lastIndex = start + url.length;
  });
  if (lastIndex < text.length) {
    nodes.push(renderSpan(text.slice(lastIndex), kind, `${keyPrefix}-tail`));
  }
  return nodes;
}

function renderSegment(
  segment: { text: string; kind?: string; href?: string },
  fallbackKind: string | undefined,
  key: string,
) {
  if (segment.href) {
    const isInternal = segment.href.startsWith('#');
    return (
      <a
        key={key}
        href={segment.href}
        {...(isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        className={clsx('terminal-link', segment.kind ?? fallbackKind)}
      >
        {segment.text}
      </a>
    );
  }
  return renderTextWithLinks(segment.text, segment.kind ?? fallbackKind, key);
}

function renderLineContent(line: RenderableLine) {
  if (line.segments?.length) {
    return line.segments.flatMap((segment, index) =>
      renderSegment(segment, line.kind, `${line.id}-seg-${index}`),
    );
  }
  return renderTextWithLinks(line.text, line.kind, `${line.id}-full`);
}

export function TerminalOutputLog({ output, typingLine }: Props) {
  const outputRef = useRef<HTMLDivElement>(null);

  const renderedLines = useMemo(() => {
    if (!typingLine) return output;
    return [
      ...output,
      {
        id: `${typingLine.id}-typing`,
        kind: typingLine.kind,
        text: typingLine.visibleText,
      },
    ];
  }, [output, typingLine]);

  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [renderedLines.length, typingLine?.visibleText]);

  return (
    <div
      className="terminal-output"
      ref={outputRef}
      role="log"
      aria-live="polite"
      aria-label="Terminal output"
    >
      {renderedLines.map((line) => (
        <span key={line.id} className={clsx('terminal-line', line.kind)}>
          {renderLineContent(line)}
        </span>
      ))}
    </div>
  );
}
