import { useState } from 'react';
import { useAuth, useUpdateProfile } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, CheckCircle2, User, Mail, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const updateProfileMutation = useUpdateProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const hasChanges = formData.name !== user?.name || formData.email !== user?.email;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View and update your personal account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{user?.name || 'User'}</h3>
                    {user?.role === 'admin' && (
                      <Badge variant="default">
                        <Shield className="mr-1 h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {user?.emailVerified ? (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Email verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <AlertCircle className="h-3 w-3" />
                      Email not verified
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <form onSubmit={handleSubmit} className="space-y-4">
                {updateProfileMutation.isSuccess && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Profile updated successfully!</AlertDescription>
                  </Alert>
                )}

                {updateProfileMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {updateProfileMutation.error instanceof Error
                        ? updateProfileMutation.error.message
                        : 'Failed to update profile. Please try again.'}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">
                    <User className="mr-2 inline-block h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={updateProfileMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="mr-2 inline-block h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={updateProfileMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Changing your email will require verification
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || !hasChanges}
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>Information about your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account ID</span>
                <span className="text-sm text-muted-foreground">{user?.id}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Role</span>
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                  {user?.role || 'user'}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Status</span>
                <Badge variant={user?.banned ? 'destructive' : 'success'}>
                  {user?.banned ? 'Banned' : 'Active'}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Member Since</span>
                <span className="text-sm text-muted-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Keep your account secure by using a strong password and enabling additional security features.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Change Password</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
