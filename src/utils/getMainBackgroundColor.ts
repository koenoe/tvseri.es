import { DEFAULT_BACKGROUND_COLOR } from '@/constants';

const getMainBackgroundColor = () => {
  return (
    getComputedStyle(document.body)!.getPropertyValue(
      '--main-background-color',
    ) ?? DEFAULT_BACKGROUND_COLOR
  );
};

export default getMainBackgroundColor;
