import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../helpers/test-utils';
import { ThemeToggle } from '@/components/ThemeToggle';

const mockSetMode = vi.fn();
const mockUseTheme = vi.fn();

vi.mock('@/contexts/ThemeContext', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTheme: () => mockUseTheme(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseTheme.mockReturnValue({ mode: 'system', resolved: 'light', setMode: mockSetMode });
});

describe('ThemeToggle', () => {
  it('is reachable by its accessible name', () => {
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /change theme/i })).toBeInTheDocument();
  });

  it('offers light, dark and system', async () => {
    renderWithProviders(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: /change theme/i }));

    expect(await screen.findByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('selects a mode', async () => {
    renderWithProviders(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: /change theme/i }));
    await userEvent.click(await screen.findByText('Dark'));

    expect(mockSetMode).toHaveBeenCalledWith('dark');
  });

  it('reflects what is rendered, not what was chosen', () => {
    // Under "system" resolving to dark, showing a sun would misdescribe the
    // current state; the icon tracks `resolved` for that reason.
    mockUseTheme.mockReturnValue({ mode: 'system', resolved: 'dark', setMode: mockSetMode });
    const { container } = renderWithProviders(<ThemeToggle />);

    expect(container.querySelector('.lucide-moon')).toBeTruthy();
  });
});
