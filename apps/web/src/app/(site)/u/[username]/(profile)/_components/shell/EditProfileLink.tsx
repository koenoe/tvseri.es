import Link from 'next/link';
import { pencilGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

const LOOK = {
  // A 32px pill with a 2px inner ring, "Edit"
  compact: {
    className:
      'h-8 shrink-0 rounded-full px-3 text-meta font-semibold shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)] transition-shadow hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)]',
    icon: 'size-4',
    label: 'Edit',
  },
  // 42px tall, 10px corners, full width
  sidebar: {
    className:
      'h-[42px] w-full rounded-10 border-2 border-white/25 px-4 text-[14px] font-medium transition-colors hover:border-white/50',
    icon: 'size-[15px]',
    label: 'Edit profile',
  },
} as const;

/** The owner's button: "Edit profile" in the sidebar, "Edit" in the compact identity */
export default function EditProfileLink({
  size = 'sidebar',
}: Readonly<{ size?: keyof typeof LOOK }>) {
  const look = LOOK[size];
  const className = `flex items-center justify-center gap-2 whitespace-nowrap ${look.className}`;
  return (
    <Link className={className} href="/settings/profile">
      <Icon className={look.icon} glyph={pencilGlyph} size={13} />
      {look.label}
    </Link>
  );
}
