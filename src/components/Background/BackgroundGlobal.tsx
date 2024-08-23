import { type Props } from './Background';
import BackgroundGlobalBase from './BackgroundGlobalBase';
import BackgroundGlobalDynamic from './BackgroundGlobalDynamic';

function BackgroundGlobal({
  variant = 'static',
  color,
}: Pick<Props, 'variant' | 'color'>) {
  return variant === 'static' ? (
    <BackgroundGlobalBase color={color} />
  ) : (
    <BackgroundGlobalDynamic />
  );
}

export default BackgroundGlobal;
