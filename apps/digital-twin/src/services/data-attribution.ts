/**
 * Data attribution metadata for wearable providers.
 * Consumed by frontend apps to render provider branding/attribution.
 */

export interface DataAttribution {
  provider: string;
  text: string;
  color: string;
  logo?: string;
}

const PROVIDER_ATTRIBUTION: Record<string, DataAttribution> = {
  oura: {
    provider: 'oura',
    text: 'Data from Oura',
    color: '#D4AF37',
  },
  garmin: {
    provider: 'garmin',
    text: 'Data from Garmin',
    color: '#6DCFF6',
  },
  apple: {
    provider: 'apple',
    text: 'Data from Apple Health',
    color: '#FF2D55',
  },
  whoop: {
    provider: 'whoop',
    text: 'Data from WHOOP',
    color: '#00F19F',
  },
};

/**
 * Get attribution metadata for a given provider.
 * Returns a generic fallback for unknown providers.
 */
export function getAttribution(provider: string): DataAttribution {
  return PROVIDER_ATTRIBUTION[provider.toLowerCase()] ?? {
    provider,
    text: `Data from ${provider}`,
    color: '#888888',
  };
}

/**
 * Enrich a wearable summary row with dataSource attribution.
 * Use this when returning summaries to include provider metadata.
 */
export function withAttribution<T extends { provider: string }>(
  row: T,
): T & { dataSource: DataAttribution } {
  return { ...row, dataSource: getAttribution(row.provider) };
}
