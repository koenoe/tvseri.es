import cn from '@/lib/cn';

import styles from './shows.module.css';

/** One column on phones, two on desktop */
export const LIST = cn(
  styles.list,
  'flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-6',
);
