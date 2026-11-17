'use client';

import { useEffect, useState, useTransition } from 'react';

import Header from '@/components/header/Header';

import DataDownView from './DataDownView';
import { isDataDown } from './dataDown';
import OfflineView from './OfflineView';
import RetryButton from './RetryButton';
import ServerErrorView from './ServerErrorView';
import useOnline from './useOnline';

type Props = Readonly<{
  /** What the boundary caught (an `Error` from the server, anything from the client). */
  error: unknown;
  /** The boundary's `retry()`: refetch and re-render its children. */
  retry: () => void;
}>;

const digestOf = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'digest' in error &&
  typeof error.digest === 'string'
    ? error.digest
    : undefined;

/**
 * What an error boundary shows: offline when the browser
 * has no connection (it retries by itself once it's back), data down for a
 * `DataDownError`, else the 500 with the Error ID. Try again is the
 * boundary's `retry()`, in a transition, so the button shows it's working
 * and the offline page stays up until the retry settles.
 */
export default function AppErrorView({ error, retry }: Props) {
  const header = <Header />;
  const online = useOnline();
  const [retrying, startRetry] = useTransition();
  // Once off air, stay off air while the retry it started is still running.
  const [wasOffline, setWasOffline] = useState(false);
  if (!online && !wasOffline) {
    setWasOffline(true);
  }
  const tryAgain = () => startRetry(retry);
  const button = <RetryButton onClick={tryAgain} pending={retrying} />;

  useEffect(() => {
    if (online) {
      return;
    }
    // “this one retries when you’re back”
    const onOnline = () => startRetry(retry);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [online, retry]);

  if (!online || (wasOffline && retrying)) {
    return <OfflineView header={header} retry={button} />;
  }
  if (isDataDown(error)) {
    return <DataDownView header={header} retry={button} />;
  }
  return (
    <ServerErrorView errorId={digestOf(error)} header={header} retry={button} />
  );
}
