import { FLAT } from '@/components/ui/ghost/ghosts';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import TabsFrame from './TabsFrame';
import { PROFILE_TABS, TAB } from './tabs';

/** Each tab as a flat pill the size of its unseen icon and label */
const TAB_GHOST = cn(TAB, FLAT, 'animate-ghost');

/**
 * The tab bar before the profile resolves: the same box, the five tabs as
 * flat pills (Circle and Stats show for most profiles; one without them
 * changes only the pills, not the bar)
 */
export default function TabsSkeleton() {
  return (
    <TabsFrame>
      {PROFILE_TABS.map((tab) => (
        <span aria-hidden="true" className={TAB_GHOST} key={tab.label}>
          <Icon glyph={tab.glyph} size={16} />
          {tab.label}
        </span>
      ))}
    </TabsFrame>
  );
}
