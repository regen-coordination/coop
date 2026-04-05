import type { CoopMemoryProfile } from '../../contracts/schema';
import { nowIso } from '../../utils';

export function buildMemoryProfileSeed(profile?: Partial<CoopMemoryProfile>): CoopMemoryProfile {
  return {
    version: 1,
    updatedAt: nowIso(),
    topDomains: profile?.topDomains ?? [],
    topTags: profile?.topTags ?? [],
    categoryStats: profile?.categoryStats ?? [],
    ritualLensWeights: profile?.ritualLensWeights ?? [],
    exemplarArtifactIds: profile?.exemplarArtifactIds ?? [],
    archiveSignals: profile?.archiveSignals ?? {
      archivedTagCounts: {},
      archivedDomainCounts: {},
    },
  };
}
