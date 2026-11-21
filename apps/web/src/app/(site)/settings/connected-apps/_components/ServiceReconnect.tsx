'use client';

import type { ExtensionCheck } from '@/lib/extension/extension';
import ServiceConnectActions from './ServiceConnectActions';
import { useConnectedService } from './ServiceContext';

/**
 * The service signed the stored session out, so nothing syncs until the
 * extension links it again; what's synced stays. Above the connected body,
 * so Disconnect is still there. Its corners are Connect again's plus the
 * padding (20 + 16).
 */
export default function ServiceReconnect({
  extension,
  onConnect,
  pending,
}: Readonly<{
  extension: ExtensionCheck;
  onConnect: () => void;
  pending: boolean;
}>) {
  const { copy } = useConnectedService();
  return (
    <div className="flex flex-col gap-3 rounded-[36px] bg-black/28 p-4">
      <p className="text-meta text-white/80">{copy.reconnect}</p>
      <ServiceConnectActions
        extension={extension}
        label="Connect again"
        onConnect={onConnect}
        pending={pending}
      />
    </div>
  );
}
