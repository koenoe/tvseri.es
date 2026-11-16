import { landingSlugForId } from '@tvseri.es/constants';
import type { WhatsOnChannel } from '@tvseri.es/schemas';
import Image from 'next/image';

import landingPath from '@/lib/routing/landingPath';
import { TOY_TITLE } from '../../moments';
import ChannelCaption from './ChannelCaption';
import ChannelMark from './ChannelMark';
import { channelNumber } from './layout';
import WhatsOnRemote from './WhatsOnRemote';

/**
 * What's on (HMFinal `e2-tv e3-tv`): one show airing now per service, as a
 * TV you zap through. The screen on the left (backdrop, CH 01 and the
 * service, the show's logo, facts and actions), the six numbered channels on
 * the right under the remote's label row (the block's heading, with up/down).
 * Everything is rendered here on the server; the remote island (which
 * frames the moment, for its label-row arrows) only picks which channel is
 * on.
 */
export default function WhatsOn({
  channels,
}: Readonly<{ channels: ReadonlyArray<WhatsOnChannel> }>) {
  const backdrops = channels.map(({ series }) =>
    series.backdropImage ? (
      <Image
        alt=""
        className="object-cover"
        fill
        key={series.id}
        sizes="(min-width: 1024px) 600px, 100vw"
        src={series.backdropImage}
      />
    ) : null,
  );
  const captions = channels.map((channel, index) => {
    const slug = landingSlugForId('network', channel.network.id);
    return (
      <ChannelCaption
        channel={channel}
        key={channel.series.id}
        networkHref={slug ? landingPath('network', slug) : undefined}
        number={channelNumber(index)}
      />
    );
  });
  const rows = channels.map((channel, index) => ({
    label: `Channel ${channelNumber(index)}, ${channel.network.name}: ${channel.series.title}`,
    mark: <ChannelMark network={channel.network} />,
    network: channel.network.name,
    number: channelNumber(index),
    show: channel.series.title,
  }));

  return (
    <WhatsOnRemote
      backdrops={backdrops}
      captions={captions}
      rows={rows}
      title={TOY_TITLE['whats-on']}
    />
  );
}
