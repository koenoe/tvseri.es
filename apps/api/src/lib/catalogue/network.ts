import type { Network } from '@tvseri.es/schemas';
import { detectLogoSilhouette } from '@/lib/detectLogoSilhouette';
import { fetchNetworkDetails } from '@/lib/tmdb/reference';

/**
 * A network's facts (`fetchNetworkDetails`) and whether its logo reads as a
 * white silhouette (checked once per logo, stored for good)
 */
export async function fetchNetwork(id: number): Promise<Network | undefined> {
  const details = await fetchNetworkDetails(id);
  if (!details) {
    return undefined;
  }
  const { logoPath, network } = details;
  const logoSilhouette = logoPath
    ? await detectLogoSilhouette(logoPath)
    : undefined;
  return logoSilhouette === undefined
    ? network
    : { ...network, logoSilhouette };
}
