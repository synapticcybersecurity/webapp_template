import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { billingAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check } from 'lucide-react';
import type { PlanDetails, BillingInterval } from '@webapp/shared';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const navigate = useNavigate();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await billingAPI.listPlans();
      return res.data.data as PlanDetails[];
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

  return (
    <>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Choose the plan that fits your team. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Interval toggle */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={interval === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInterval('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={interval === 'yearly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInterval('yearly')}
          >
            Yearly
            <Badge variant="secondary" className="ml-2">
              Save ~17%
            </Badge>
          </Button>
        </div>

        {/* Plan cards */}
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans?.map((plan) => {
            const price = plan.pricing[interval];
            const isPopular = plan.id === 'pro';

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{formatPrice(price)}</span>
                    {price > 0 && (
                      <span className="text-muted-foreground">
                        /{interval === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                    {price === 0 && <span className="text-muted-foreground ml-1">forever</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => {
                      if (plan.id === 'free') {
                        navigate('/organizations');
                      } else {
                        navigate(`/organizations?upgrade=${plan.id}&interval=${interval}`);
                      }
                    }}
                  >
                    {plan.id === 'free' ? 'Get Started' : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
