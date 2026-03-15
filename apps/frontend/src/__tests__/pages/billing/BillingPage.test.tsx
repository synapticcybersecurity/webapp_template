import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/test-utils';
import BillingPage from '../../../pages/billing/BillingPage';

const mockBillingAPI = vi.hoisted(() => ({
  getBillingOverview: vi.fn(),
  createCheckout: vi.fn(),
  createPortal: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ orgId: 'org-1' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@/lib/api', () => ({
  billingAPI: mockBillingAPI,
}));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading spinner initially', () => {
    mockBillingAPI.getBillingOverview.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<BillingPage />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('should show error state on API failure', async () => {
    mockBillingAPI.getBillingOverview.mockRejectedValue(new Error('API Error'));
    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should display free plan with upgrade button', async () => {
    mockBillingAPI.getBillingOverview.mockResolvedValue({
      data: {
        data: {
          subscription: { plan: 'free', status: 'inactive', stripeSubscriptionId: null },
          plan: {
            id: 'free',
            name: 'Free',
            features: ['3 members'],
            pricing: { monthly: 0, yearly: 0 },
          },
          usage: {
            members: { current: 1, limit: 3 },
            projects: { current: 2, limit: 5 },
          },
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
    });
    expect(screen.getByText(/you are on the free plan/i)).toBeInTheDocument();
  });

  it('should display paid plan with manage button', async () => {
    mockBillingAPI.getBillingOverview.mockResolvedValue({
      data: {
        data: {
          subscription: {
            plan: 'pro',
            status: 'active',
            stripeSubscriptionId: 'sub_1',
            billingInterval: 'monthly',
            currentPeriodEnd: '2025-02-01T00:00:00Z',
            cancelAtPeriodEnd: false,
          },
          plan: {
            id: 'pro',
            name: 'Pro',
            features: ['20 members', 'Unlimited projects'],
            pricing: { monthly: 2900, yearly: 29000 },
          },
          usage: {
            members: { current: 5, limit: 20 },
            projects: { current: 10, limit: -1 },
          },
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
    });
    expect(screen.getByText('$29')).toBeInTheDocument();
  });

  it('should show usage bars with correct values', async () => {
    mockBillingAPI.getBillingOverview.mockResolvedValue({
      data: {
        data: {
          subscription: { plan: 'free', status: 'inactive', stripeSubscriptionId: null },
          plan: {
            id: 'free',
            name: 'Free',
            features: [],
            pricing: { monthly: 0, yearly: 0 },
          },
          usage: {
            members: { current: 2, limit: 3 },
            projects: { current: 4, limit: 5 },
          },
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument();
    });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
  });

  it('should show unlimited for enterprise usage', async () => {
    mockBillingAPI.getBillingOverview.mockResolvedValue({
      data: {
        data: {
          subscription: {
            plan: 'enterprise',
            status: 'active',
            stripeSubscriptionId: 'sub_2',
            billingInterval: 'yearly',
          },
          plan: {
            id: 'enterprise',
            name: 'Enterprise',
            features: ['Unlimited everything'],
            pricing: { monthly: 9900, yearly: 99000 },
          },
          usage: {
            members: { current: 50, limit: -1 },
            projects: { current: 100, limit: -1 },
          },
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('50 / Unlimited')).toBeInTheDocument();
      expect(screen.getByText('100 / Unlimited')).toBeInTheDocument();
    });
  });

  it('should show active status badge', async () => {
    mockBillingAPI.getBillingOverview.mockResolvedValue({
      data: {
        data: {
          subscription: {
            plan: 'pro',
            status: 'active',
            stripeSubscriptionId: 'sub_1',
            billingInterval: 'monthly',
          },
          plan: {
            id: 'pro',
            name: 'Pro',
            features: [],
            pricing: { monthly: 2900, yearly: 29000 },
          },
          usage: {
            members: { current: 1, limit: 20 },
            projects: { current: 1, limit: -1 },
          },
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('should display plan features', async () => {
    mockBillingAPI.getBillingOverview.mockResolvedValue({
      data: {
        data: {
          subscription: {
            plan: 'pro',
            status: 'active',
            stripeSubscriptionId: 'sub_1',
            billingInterval: 'monthly',
          },
          plan: {
            id: 'pro',
            name: 'Pro',
            features: ['20 members', 'Unlimited projects', 'Priority support'],
            pricing: { monthly: 2900, yearly: 29000 },
          },
          usage: {
            members: { current: 1, limit: 20 },
            projects: { current: 1, limit: -1 },
          },
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('20 members')).toBeInTheDocument();
      expect(screen.getByText('Priority support')).toBeInTheDocument();
    });
  });
});
