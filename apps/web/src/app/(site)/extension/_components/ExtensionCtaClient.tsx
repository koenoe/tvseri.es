'use client';

import { CONNECTION_SERVICES } from '@tvseri.es/schemas';
import { HowItWorksButton } from '@/components/extension/HowItWorks';
import ButtonLink from '@/components/ui/button/ButtonLink';
import {
  extensionGlyph,
  laptopGlyph,
  plugGlyph,
  updateGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { BrowserSupport } from '@/lib/extension/browserSupport';
import { extensionInstall } from '@/lib/extension/extension';
import { useExtensionPing } from '@/lib/extension/useExtension';
import { type ExtensionCta, extensionCta } from '../_lib/extensionCta';
import CopyButton from './CopyButton';
import {
  CTA_ROW,
  CTA_STACK,
  CtaSkeleton,
  CtaStatus,
  EdgeNote,
  InstallButton,
} from './CtaParts';

const UPDATE_LINK =
  'font-medium text-white/80 underline decoration-white/30 underline-offset-3 hover:text-white';

function ConnectButton() {
  return (
    <ButtonLink
      href="/settings/connected-apps"
      icon={plugGlyph}
      variant="primary"
    >
      Connect a service
    </ButtonLink>
  );
}

const INSTALL = extensionInstall();
/** From the store, Chrome updates it by itself; a manual install doesn't */
const STORE = INSTALL.external;

/** The store listing, else the zip to load again by hand */
function UpdateNow({ zip }: Readonly<{ zip: string }>) {
  if (STORE) {
    return (
      <a
        className={UPDATE_LINK}
        href={INSTALL.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        Update now<span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <a className={UPDATE_LINK} download href={zip}>
      Update now
    </a>
  );
}

function Status({ cta, zip }: Readonly<{ cta: ExtensionCta; zip: string }>) {
  switch (cta.kind) {
    case 'installed':
      return (
        <CtaStatus>
          <span className="size-2 shrink-0 rounded-full bg-cyan" />
          Installed · {cta.version}
        </CtaStatus>
      );
    case 'outdated':
      return (
        <CtaStatus>
          <Icon glyph={updateGlyph} size={14} />
          <span>
            {cta.latest} is out{STORE ? ' · Chrome updates it by itself' : ''}{' '}
            <UpdateNow zip={zip} />
          </span>
        </CtaStatus>
      );
    case 'unsupported':
      return (
        <CtaStatus>
          <Icon glyph={laptopGlyph} size={14} />
          Open this on a computer with Chrome or Edge
        </CtaStatus>
      );
    default:
      return (
        <CtaStatus>
          <Icon glyph={extensionGlyph} size={14} />
          Not installed in this browser
        </CtaStatus>
      );
  }
}

/** The part of /extension that depends on the browser; How it works shows in every state */
export default function ExtensionCtaClient({
  browser,
  latest,
  zip,
}: Readonly<{
  browser: BrowserSupport;
  /** The version this site serves */
  latest: string;
  zip: string;
}>) {
  const ping = useExtensionPing(true, browser);
  const cta = extensionCta(ping, CONNECTION_SERVICES, latest);
  if (cta.kind === 'checking') {
    return <CtaSkeleton />;
  }
  const unsupported = cta.kind === 'unsupported';
  const installed = cta.kind === 'installed' || cta.kind === 'outdated';
  let primary = <InstallButton />;
  if (unsupported) {
    primary = <CopyButton copied="Copied the link">Copy link</CopyButton>;
  } else if (installed) {
    primary = <ConnectButton />;
  }
  return (
    <div className={CTA_STACK}>
      <div className={CTA_ROW}>
        {primary}
        <HowItWorksButton />
      </div>
      <Status cta={cta} zip={zip} />
      <EdgeNote hidden={unsupported} />
    </div>
  );
}
