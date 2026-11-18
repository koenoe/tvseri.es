import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { type ErrorComponentProps, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthUnavailableError, SessionEndedError } from '@/lib/auth-session';

function copyFor(error: unknown) {
  if (error instanceof AuthUnavailableError) {
    return {
      action: 'Try again',
      description: 'You are still signed in. Try again in a moment.',
      title: 'Can’t reach the sign-in service',
    };
  }
  if (error instanceof SessionEndedError) {
    return {
      action: 'Sign in',
      description: 'Sign in again to continue.',
      title: 'Your session has ended',
    };
  }
  return {
    action: 'Try again',
    description: 'This page could not be loaded.',
    title: 'Something went wrong',
  };
}

/**
 * The router's error state. "Try again" re-runs the route (and the root's
 * sign-in check) and lets failed queries fetch again; after a session ended,
 * that same re-run sends the admin to sign in.
 */
export function ErrorState({ error }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();
  const { action, description, title } = copyFor(error);

  const handleRetry = useCallback(() => {
    queryErrorResetBoundary.reset();
    void router.invalidate();
  }, [queryErrorResetBoundary, router]);

  return (
    <div className="flex min-h-[60svh] w-full flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm" role="alert">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRetry}>{action}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

ErrorState.displayName = 'ErrorState';
