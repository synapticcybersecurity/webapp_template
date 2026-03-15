import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { billingAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  AlertCircle,
  CreditCard,
  ArrowUpRight,
  CheckCircle2,
  Users,
  FolderKanban,
} from 'lucide-react';
import type { BillingOverview, BillingInterval } from '@webapp/shared';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(date: string | Date | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'trialing':
      return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
    case 'past_due':
      return <Badge variant="destructive">Past Due</Badge>;
    case 'canceled':
      return <Badge variant="secondary">Canceled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function BillingPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  const {
    data: billing,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['billing', orgId],
    queryFn: async () => {
      const res = await billingAPI.getBillingOverview(orgId!);
      return res.data.data as BillingOverview;
    },
    enabled: !!orgId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: BillingInterval }) => {
      const res = await billingAPI.createCheckout(orgId!, { plan, interval });
      return res.data.data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await billingAPI.createPortal(orgId!);
      return res.data.data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load billing information'}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const subscription = billing?.subscription;
  const plan = billing?.plan;
  const usage = billing?.usage;
  const isFreePlan = !subscription?.stripeSubscriptionId;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and billing details.</p>
        </div>

        {/* Success/Cancel alerts */}
        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Your subscription has been activated. It may take a moment to update.
            </AlertDescription>
          </Alert>
        )}
        {canceled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Checkout was canceled. No charges were made.</AlertDescription>
          </Alert>
        )}

        {/* Current plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  {isFreePlan
                    ? 'You are on the free plan'
                    : `You are subscribed to the ${plan?.name} plan`}
                </CardDescription>
              </div>
              {subscription && getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {plan
                  ? formatPrice(
                      plan.pricing[
                        (subscription?.billingInterval as 'monthly' | 'yearly') || 'monthly'
                      ]
                    )
                  : '$0'}
              </span>
              {!isFreePlan && subscription?.billingInterval && (
                <span className="text-muted-foreground">
                  /{subscription.billingInterval === 'monthly' ? 'month' : 'year'}
                </span>
              )}
            </div>

            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                {subscription.cancelAtPeriodEnd
                  ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                  : `Next billing date: ${formatDate(subscription.currentPeriodEnd)}`}
              </p>
            )}

            <div className="flex gap-3">
              {isFreePlan ? (
                <Button
                  onClick={() => checkoutMutation.mutate({ plan: 'pro', interval: 'monthly' })}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        {usage && (
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Current usage against your plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <UsageBar
                  icon={<Users className="h-5 w-5" />}
                  label="Team Members"
                  current={usage.members.current}
                  limit={usage.members.limit}
                />
                <UsageBar
                  icon={<FolderKanban className="h-5 w-5" />}
                  label="Projects"
                  current={usage.projects.current}
                  limit={usage.projects.limit}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan features */}
        {plan && (
          <Card>
            <CardHeader>
              <CardTitle>{plan.name} Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 md:grid-cols-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function UsageBar({
  icon,
  label,
  current,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {current} / {isUnlimited ? 'Unlimited' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 w-full rounded-full bg-secondary">
          <div
            className={`h-2 rounded-full transition-all ${
              isNearLimit ? 'bg-orange-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
