import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authClient } from '@/lib/auth-client';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, CheckCircle2, User, Mail, Shield, Lock } from 'lucide-react';
import { changePasswordSchema } from '@webapp/shared/validation';

function ChangePasswordCard() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors.length > 0) setValidationErrors([]);
    if (error) setError(null);
    if (isSuccess) setIsSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setValidationErrors(['Passwords do not match']);
      return;
    }

    const result = changePasswordSchema.safeParse({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    if (!result.success) {
      setValidationErrors(result.error.errors.map((err) => err.message));
      return;
    }

    setValidationErrors([]);
    setError(null);
    setIsPending(true);

    const { error: changeError } = await authClient.changePassword({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    setIsPending(false);

    if (changeError) {
      setError(
        changeError.message ||
          'Failed to change password. Please check your current password and try again.'
      );
    } else {
      setIsSuccess(true);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const passwordMismatch =
    formData.confirmPassword.length > 0 && formData.newPassword !== formData.confirmPassword;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your password to keep your account secure</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {isSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Password changed successfully!</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              <Lock className="mr-2 inline-block h-4 w-4" />
              Current Password
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Min. 8 characters"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength={8}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Must contain at least 8 characters, including uppercase, lowercase, number, and
              special character
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
              disabled={isPending}
            />
            {passwordMismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={
              isPending ||
              passwordMismatch ||
              !formData.currentPassword ||
              !formData.newPassword ||
              !formData.confirmPassword
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const { error: updateError } = await authClient.updateUser({
      name: formData.name,
    });

    setIsPending(false);

    if (updateError) {
      setError(updateError.message || 'Failed to update profile. Please try again.');
    } else {
      setIsSuccess(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (isSuccess) setIsSuccess(false);
    if (error) setError(null);
  };

  const hasChanges = formData.name !== (user?.name || '');

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
              <CardDescription>View and update your personal account details</CardDescription>
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
                {isSuccess && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Profile updated successfully!</AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
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
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    <Mail className="mr-2 inline-block h-4 w-4" />
                    Email Address
                  </Label>
                  <Input type="email" value={user?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">
                    Email changes are not yet supported
                  </p>
                </div>

                <Button type="submit" disabled={isPending || !hasChanges}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

          <ChangePasswordCard />
        </div>
      </div>
    </Layout>
  );
}
