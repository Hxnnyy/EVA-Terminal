import { render, screen } from '@testing-library/react';

import { type MdxContentComponent, RenderContent } from '@/lib/mdx/render-content';

describe('RenderContent helper', () => {
  it('forwards arbitrary props and the components map to the MDX component', () => {
    let receivedComponents: unknown;
    let receivedMessage: unknown;

    const StubMdx: MdxContentComponent = ({ components, message }) => {
      receivedComponents = components;
      receivedMessage = message;
      return <div data-testid="mdx-content">{String(message)}</div>;
    };

    const componentMap = { code: () => null };

    render(<RenderContent Content={StubMdx} components={componentMap} message="hello world" />);

    expect(screen.getByTestId('mdx-content')).toHaveTextContent('hello world');
    expect(receivedComponents).toBe(componentMap);
    expect(receivedMessage).toBe('hello world');
  });
});
