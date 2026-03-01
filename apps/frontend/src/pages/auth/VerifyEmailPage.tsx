import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const verifyMutation = useMutation({
    mutationFn: async (verifyToken: string) => {
      const response = await api.get('/api/auth/verify-email', {
        params: { token: verifyToken },
      });
      return response.data;
    },
  });

  useEffect(() => {
    if (token && !verifyMutation.isSuccess && !verifyMutation.isPending && !verifyMutation.isError) {
      verifyMutation.mutate(token);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // No token — show a "check your email" message
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
            <CardDescription>
              We sent you a verification link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center py-4">
              <Mail className="h-16 w-16 text-muted-foreground" />
            </div>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Please check your inbox and click the verification link to activate your account.
                If you don't see it, check your spam folder.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Verifying...
  if (verifyMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verification failed
  if (verifyMutation.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Verification failed</CardTitle>
            <CardDescription>
              We couldn't verify your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {verifyMutation.error instanceof Error
                  ? verifyMutation.error.message
                  : 'The verification link is invalid or has expired. Please try signing up again or request a new verification email.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Link to="/signup" className="w-full">
              <Button className="w-full">Sign up again</Button>
            </Link>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Verification successful
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Email verified</CardTitle>
          <CardDescription>
            Your email address has been verified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Your email has been successfully verified. You can now sign in to your account.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Link to="/login" className="w-full">
            <Button className="w-full">Sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
