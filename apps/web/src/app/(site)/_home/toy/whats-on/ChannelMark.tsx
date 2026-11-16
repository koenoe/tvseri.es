import type { WhatsOnChannel } from '@tvseri.es/schemas';
import ServiceIcon, {
  type ServiceIconLayout,
} from '@/components/ui/service/ServiceIcon';

/** Each place keeps its own look on purpose; don't unify them. */
const MARK: ServiceIconLayout = {
  className: 'block size-7 rounded-6 object-contain',
  size: 28,
};

/**
 * The service on a channel row: its square icon
 * (28px, 6px corners), always; the wordmark is the screen's caption's only.
 * Without a square icon the 28px slot stays empty, so the rows line up (as
 * elsewhere a service without its logo is left out).
 */
export default function ChannelMark({
  network,
}: Readonly<{ network: WhatsOnChannel['network'] }>) {
  if (network.logoKind !== 'icon' || !network.logo) {
    return <span aria-hidden="true" className="block size-7" />;
  }
  return <ServiceIcon alt="" layout={MARK} logo={network.logo} sizes="28px" />;
}
