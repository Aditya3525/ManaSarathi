import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../src/components/ui/button';

const buttonLabel = 'Click me';

describe('Button component', () => {
  it('renders primary variant by default', () => {
    render(<Button>{buttonLabel}</Button>);

    const button = screen.getByRole('button', { name: buttonLabel });

    expect(button).toBeInTheDocument();
    expect(button.className).toContain('bg-primary');
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="outline" size="lg">
        {buttonLabel}
      </Button>
    );

    const button = screen.getByRole('button', { name: buttonLabel });

  expect(button.className).toContain('border');
  expect(button.className).toContain('h-10');
  });

  it('supports rendering as child element', () => {
    render(
      <Button asChild>
        <a href="#test">{buttonLabel}</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: buttonLabel });
    expect(link).toBeInTheDocument();
  });
});
