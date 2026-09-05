import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/test-utils';
import PricingPage from '../../../pages/billing/PricingPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/api', () => ({
  billingAPI: {
    listPlans: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'free',
            name: 'Free',
            description: 'For individuals',
            features: ['3 members', '5 projects'],
            limits: { members: 3, projects: 5, storage: 100 },
            pricing: { monthly: 0, yearly: 0 },
            stripePriceIds: { monthly: null, yearly: null },
          },
          {
            id: 'pro',
            name: 'Pro',
            description: 'For teams',
            features: ['20 members', 'Unlimited projects'],
            limits: { members: 20, projects: -1, storage: 10240 },
            pricing: { monthly: 2900, yearly: 29000 },
            stripePriceIds: { monthly: 'price_1', yearly: 'price_2' },
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'For large orgs',
            features: ['Unlimited everything'],
            limits: { members: -1, projects: -1, storage: -1 },
            pricing: { monthly: 9900, yearly: 99000 },
            stripePriceIds: { monthly: 'price_3', yearly: 'price_4' },
          },
        ],
      },
    }),
  },
}));

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner initially', () => {
    renderWithProviders(<PricingPage />);
    // The loading spinner has animate-spin class
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('should render plan cards after loading', async () => {
    renderWithProviders(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('should show "Most Popular" badge on Pro plan', async () => {
    renderWithProviders(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });
  });

  it('should toggle between monthly and yearly intervals', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('$29')).toBeInTheDocument();
    });

    // Click yearly
    await user.click(screen.getByText('Yearly'));

    expect(screen.getByText('$290')).toBeInTheDocument();
  });

  it('should display features for each plan', async () => {
    renderWithProviders(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('3 members')).toBeInTheDocument();
      expect(screen.getByText('20 members')).toBeInTheDocument();
    });
  });

  it('should navigate to organizations on free plan click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Get Started'));
    expect(mockNavigate).toHaveBeenCalledWith('/organizations');
  });

  it('should navigate with upgrade params on paid plan click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PricingPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Subscribe')).toHaveLength(2);
    });

    // Click the first "Subscribe" button (Pro)
    const subscribeButtons = screen.getAllByText('Subscribe');
    await user.click(subscribeButtons[0]!);
    expect(mockNavigate).toHaveBeenCalledWith('/organizations?upgrade=pro&interval=monthly');
  });
});
