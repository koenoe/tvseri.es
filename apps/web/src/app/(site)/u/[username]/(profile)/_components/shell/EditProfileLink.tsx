import Link from 'next/link';
import { HIT_Y } from '@/components/ui/button/hitArea';
import { pencilGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

const LOOK = {
  // A 32px pill (44px to the thumb) with a 2px inner ring, "Edit" (the
  // icon's side 2px closer)
  compact: {
    className: `${HIT_Y[6]} relative h-8 shrink-0 rounded-full pr-3 pl-2.5 text-meta font-semibold shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)] active:scale-96`,
    icon: 'size-4',
    label: 'Edit',
  },
  // 42px tall, 10px corners, full width; the same 2px inner ring
  sidebar: {
    className:
      'h-[42px] w-full rounded-10 px-[18px] text-[14px] font-medium shadow-[inset_0_0_0_2px_rgb(255_255_255/0.25)] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)] active:scale-96',
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
