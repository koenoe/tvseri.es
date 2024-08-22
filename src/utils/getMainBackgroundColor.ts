import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

const getMainBackgroundColor = () =>
  document.querySelector('main')?.style.backgroundColor ??
  DEFAULT_BACKGROUND_COLOR;

export default getMainBackgroundColor;
