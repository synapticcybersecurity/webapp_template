import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, FolderKanban, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Users',
      value: '2,543',
      description: '+12% from last month',
      icon: Users,
      trend: 'up',
    },
    {
      title: 'Organizations',
      value: '24',
      description: '+3 new this week',
      icon: Building2,
      trend: 'up',
    },
    {
      title: 'Active Projects',
      value: '86',
      description: '18 completed recently',
      icon: FolderKanban,
      trend: 'neutral',
    },
    {
      title: 'Activity',
      value: '1,234',
      description: 'Actions in last 7 days',
      icon: Activity,
      trend: 'up',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your account activity.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    action: 'Created new project',
                    name: 'Website Redesign',
                    time: '2 hours ago',
                  },
                  {
                    action: 'Invited user',
                    name: 'john@example.com',
                    time: '4 hours ago',
                  },
                  {
                    action: 'Updated organization',
                    name: 'Acme Corp',
                    time: '1 day ago',
                  },
                  {
                    action: 'Completed task',
                    name: 'Review documentation',
                    time: '2 days ago',
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.name}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{activity.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="flex w-full items-center justify-start rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50">
                  <FolderKanban className="mr-3 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Create Project</div>
                    <div className="text-xs text-muted-foreground">Start a new project</div>
                  </div>
                </button>

                <button className="flex w-full items-center justify-start rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50">
                  <Users className="mr-3 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Invite Team Member</div>
                    <div className="text-xs text-muted-foreground">Add someone to your org</div>
                  </div>
                </button>

                <button className="flex w-full items-center justify-start rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50">
                  <Building2 className="mr-3 h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">View Organizations</div>
                    <div className="text-xs text-muted-foreground">Manage your teams</div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
