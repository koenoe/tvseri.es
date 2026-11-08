'use client';

import type { User } from '@tvseri.es/schemas';
import { useRef } from 'react';
import { toast } from 'sonner';
import { LinkIcon } from '@/components/Icons/LinkIcon';
import ContextMenuButton, {
  type ContextMenuButtonHandle,
} from './ContextMenuButton';
import { ContextMenuItem } from './ContextMenuItem';

export default function ContextMenuButtonUser({
  className,
  user,
}: Readonly<{
  className?: string;
  user: Pick<User, 'username'>;
}>) {
  const contextMenuButtonRef = useRef<ContextMenuButtonHandle>(null);

  const handleCopy = async () => {
    try {
      contextMenuButtonRef.current?.close();

      await navigator.clipboard.writeText(
        `${window.location.origin}/u/${user.username}/stats/${new Date().getFullYear()}`,
      );
      toast.success('Stats link copied to clipboard!');
    } catch (err) {
      const error = err as Error;
      toast.error(`Failed to copy stats link: ${error.message}`);
    }
  };

  return (
    <ContextMenuButton className={className} ref={contextMenuButtonRef}>
      <ContextMenuItem onClick={handleCopy}>
        <LinkIcon className="size-3 shrink-0" />
        <span>Copy stats link</span>
      </ContextMenuItem>
    </ContextMenuButton>
  );
}
