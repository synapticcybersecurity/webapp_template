import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/ui/button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant class', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('destructive');
  });

  it('applies size class', () => {
    // Control heights follow the current shadcn scale: sm is h-8, default h-9.
    // The previous generation used h-9/h-10.
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').className).toContain('h-8');
  });

  it('uses the default size when none is given', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button').className).toContain('h-9');
  });

  it('sizes icons automatically', () => {
    // `[&_svg]:size-4` in the base class is why call sites no longer repeat
    // h-4 w-4 on every icon.
    render(<Button>Go</Button>);
    expect(screen.getByRole('button').className).toContain('[&_svg]:size-4');
  });
});
