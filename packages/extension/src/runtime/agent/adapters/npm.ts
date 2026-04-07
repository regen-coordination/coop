import type { StructuredContent } from './types';

interface NPMPackageData {
  name: string;
  description?: string;
  readme?: string;
  homepage?: string;
  license?: string;
  repository?: { type: string; url: string };
  'dist-tags'?: Record<string, string>;
  versions?: Record<string, { version: string; keywords?: string[] }>;
}

/**
 * Parse an NPM registry response into StructuredContent.
 */
export function parseNPMPackageInfo(data: NPMPackageData, packageName: string): StructuredContent {
  const latestVersion = data['dist-tags']?.latest ?? 'unknown';
  const versionMeta = data.versions?.[latestVersion];

  const bodyParts: string[] = [];
  if (data.description) bodyParts.push(data.description);
  if (data.readme) bodyParts.push(data.readme);

  return {
    title: packageName,
    body: bodyParts.join('\n\n'),
    metadata: {
      version: latestVersion,
      license: data.license ?? null,
      homepage: data.homepage ?? null,
      keywords: versionMeta?.keywords ?? [],
      repository: data.repository?.url ?? null,
    },
    sourceRef: `npm:${packageName}`,
    fetchedAt: new Date().toISOString(),
  };
}
