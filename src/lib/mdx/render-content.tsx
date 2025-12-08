import type { ComponentType, ReactElement } from 'react';

type MdxContentProps = {
  components?: Record<string, unknown>;
} & Record<string, unknown>;

export type MdxContentComponent = ComponentType<MdxContentProps>;

type RenderContentProps = {
  Content: MdxContentComponent;
  components?: MdxContentProps['components'];
} & Omit<MdxContentProps, 'components'>;

/**
 * Renders an MDX component with an optional component map while keeping props typed.
 */
export function RenderContent({ Content, components, ...props }: RenderContentProps): ReactElement {
  return <Content components={components} {...props} />;
}
