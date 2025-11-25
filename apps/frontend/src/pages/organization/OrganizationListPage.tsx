import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Building2, Users, Plus, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  _count?: {
    members: number;
  };
  role?: string;
}

export default function OrganizationListPage() {
  const { data: organizations, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await api.get('/api/organizations');
      return response.data.data as Organization[];
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground">
              Manage your organizations and team memberships
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load organizations'}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && organizations && organizations.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No organizations yet</h3>
              <p className="mb-4 text-center text-sm text-muted-foreground">
                Get started by creating your first organization
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && organizations && organizations.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Link key={org.id} to={`/organizations/${org.id}`}>
                <Card className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {org.logo ? (
                          <img
                            src={org.logo}
                            alt={org.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-foreground">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{org.name}</CardTitle>
                          <CardDescription className="text-xs">@{org.slug}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{org._count?.members || 0} members</span>
                      </div>
                      {org.role && (
                        <Badge variant={org.role === 'owner' ? 'default' : 'secondary'}>
                          {org.role}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
