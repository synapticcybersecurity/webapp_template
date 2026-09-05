import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { billingAPI, meteringAPI } from '@/lib/api';
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
  Receipt,
  Download,
  ExternalLink,
  Activity,
} from 'lucide-react';
import type { BillingOverview, BillingInterval, Invoice, UsageSummary } from '@webapp/shared';

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
      return <Badge className="border-transparent bg-success/15 text-success">Active</Badge>;
    case 'trialing':
      return <Badge className="border-transparent bg-info/15 text-info">Trial</Badge>;
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

  const { data: invoices } = useQuery({
    queryKey: ['billing', orgId, 'invoices'],
    queryFn: async () => {
      const res = await billingAPI.getInvoices(orgId!);
      return res.data.data as Invoice[];
    },
    enabled: !!orgId,
  });

  const { data: usageSummary } = useQuery({
    queryKey: ['metering', orgId],
    queryFn: async () => {
      const res = await meteringAPI.getUsageSummary(orgId!);
      return res.data.data as UsageSummary;
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
      <>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load billing information'}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const subscription = billing?.subscription;
  const plan = billing?.plan;
  const usage = billing?.usage;
  const isFreePlan = !subscription?.stripeSubscriptionId;

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and billing details.</p>
        </div>

        {/* Success/Cancel alerts */}
        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-success" />
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
                      ],
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

        {/* Metered usage */}
        {usageSummary && usageSummary.metrics.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle>Metered Usage</CardTitle>
              </div>
              <CardDescription>
                Current billing period: {formatDate(usageSummary.period.start)} —{' '}
                {formatDate(usageSummary.period.end)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {usageSummary.metrics.map((m) => (
                  <div key={m.metric} className="rounded-lg border p-4 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground capitalize">
                      {m.metric.replace(/_/g, ' ')}
                    </p>
                    <p className="text-2xl font-bold">{m.total.toLocaleString()}</p>
                  </div>
                ))}
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

        {/* Invoice History */}
        {invoices && invoices.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                <CardTitle>Billing History</CardTitle>
              </div>
              <CardDescription>Recent invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{invoice.number || invoice.id}</span>
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.created * 1000).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatPrice(invoice.amountPaid || invoice.amountDue)}
                      </span>
                      <div className="flex gap-1">
                        {invoice.hostedInvoiceUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={invoice.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {invoice.invoicePdf && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function InvoiceStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'paid':
      return <Badge className="border-transparent bg-success/15 text-success">Paid</Badge>;
    case 'open':
      return <Badge className="border-transparent bg-info/15 text-info">Open</Badge>;
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'void':
      return <Badge variant="secondary">Void</Badge>;
    case 'uncollectible':
      return <Badge variant="destructive">Uncollectible</Badge>;
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  }
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
              isNearLimit ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
