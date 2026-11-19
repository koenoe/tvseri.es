'use client';

import HowItWorksLink from '@/components/extension/HowItWorksLink';
import type { ExtensionCheck } from '@/lib/extension/extension';
import ServiceConnectActions from './ServiceConnectActions';
import { useConnectedService } from './ServiceContext';
import SetupSteps from './SetupSteps';

/**
 * Not connected, laid out like Plex's: the steps and what this browser can
 * do (Connect, Add to Chrome, or why it can't), with How it works (the
 * extension's page) at the end of the row. Where the extension can't run
 * there are no steps to follow; How it works stays, on a line of its own.
 */
export default function ServiceIdleBody({
  extension,
  onConnect,
  pending,
}: Readonly<{
  extension: ExtensionCheck;
  onConnect: () => void;
  pending: boolean;
}>) {
  const { copy, name } = useConnectedService();
  const label = `Connect ${name}`;
  if (extension === 'unsupported') {
    return (
      <>
        <ServiceConnectActions
          extension={extension}
          label={label}
          onConnect={onConnect}
          pending={pending}
        />
        <HowItWorksLink look="button" />
      </>
    );
  }
  return (
    <>
      <SetupSteps lines={copy.steps} />
      <ServiceConnectActions
        extension={extension}
        label={label}
        onConnect={onConnect}
        pending={pending}
      >
        <HowItWorksLink />
      </ServiceConnectActions>
    </>
  );
}
