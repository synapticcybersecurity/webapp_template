import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Users,
  Settings,
  UserPlus,
  Loader2,
  AlertCircle,
  Mail,
  Shield,
  Crown,
  Trash2,
} from 'lucide-react';

export default function OrganizationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['organization', id],
    queryFn: async () => {
      const { data, error } = await authClient.organization.getFull({
        query: { orgId: id! },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail,
        organizationId: id!,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', id] });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default' as const;
      case 'admin':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !organization) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load organization'}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const members = organization.members || [];
  const currentUserMember = members.find((m: any) => m.userId === user?.id);
  const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {organization.logo ? (
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground">
                {organization.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
              <p className="text-muted-foreground">@{organization.slug}</p>
            </div>
          </div>
          {isOwnerOrAdmin && (
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          )}
        </div>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">
              <Users className="mr-2 h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="overview">
              <Building2 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage who has access to this organization
                    </CardDescription>
                  </div>
                  {isOwnerOrAdmin && (
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.user?.name || 'Unknown User'}</p>
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {getRoleIcon(member.role)}
                              <span className="ml-1">{member.role}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {member.user?.email}
                          </div>
                        </div>
                      </div>
                      {isOwnerOrAdmin && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg">{organization.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Slug</p>
                    <p className="text-lg">@{organization.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-lg">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Members</span>
                    <span className="text-2xl font-bold">{members.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Admins</span>
                    <span className="text-2xl font-bold">
                      {members.filter((m: any) => m.role === 'admin').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Owners</span>
                    <span className="text-2xl font-bold">
                      {members.filter((m: any) => m.role === 'owner').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
