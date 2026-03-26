export function buildGreenGoodsCreateGardenPayload(input: {
  coopId: string;
  name: string;
  slug?: string;
  description: string;
  location?: string;
  bannerImage?: string;
  metadata?: string;
  openJoining?: boolean;
  maxGardeners?: number;
  weightScheme: 'linear' | 'exponential' | 'power';
  domains: string[];
  operatorAddresses?: string[];
  gardenerAddresses?: string[];
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    location: input.location,
    bannerImage: input.bannerImage,
    metadata: input.metadata,
    openJoining: input.openJoining ?? false,
    maxGardeners: input.maxGardeners ?? 0,
    weightScheme: input.weightScheme,
    domains: input.domains,
    ...(input.operatorAddresses?.length ? { operatorAddresses: input.operatorAddresses } : {}),
    ...(input.gardenerAddresses?.length ? { gardenerAddresses: input.gardenerAddresses } : {}),
  };
}

export function buildGreenGoodsSyncGardenProfilePayload(input: {
  coopId: string;
  gardenAddress: string;
  name: string;
  description: string;
  location?: string;
  bannerImage?: string;
  metadata?: string;
  openJoining?: boolean;
  maxGardeners?: number;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
    name: input.name,
    description: input.description,
    location: input.location,
    bannerImage: input.bannerImage,
    metadata: input.metadata,
    openJoining: input.openJoining ?? false,
    maxGardeners: input.maxGardeners ?? 0,
  };
}

export function buildGreenGoodsSetGardenDomainsPayload(input: {
  coopId: string;
  gardenAddress: string;
  domains: string[];
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
    domains: input.domains,
  };
}

export function buildGreenGoodsCreateGardenPoolsPayload(input: {
  coopId: string;
  gardenAddress: string;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
  };
}

export function buildGreenGoodsSubmitWorkApprovalPayload(input: {
  coopId: string;
  gardenAddress: string;
  actionUid: number;
  workUid: string;
  approved: boolean;
  feedback?: string;
  confidence: number;
  verificationMethod: number;
  reviewNotesCid?: string;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
    actionUid: input.actionUid,
    workUid: input.workUid,
    approved: input.approved,
    feedback: input.feedback ?? '',
    confidence: input.confidence,
    verificationMethod: input.verificationMethod,
    reviewNotesCid: input.reviewNotesCid ?? '',
  };
}

export function buildGreenGoodsCreateAssessmentPayload(input: {
  coopId: string;
  gardenAddress: string;
  title: string;
  description: string;
  assessmentConfigCid: string;
  domain: 'solar' | 'agro' | 'edu' | 'waste';
  startDate: number;
  endDate: number;
  location?: string;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
    title: input.title,
    description: input.description,
    assessmentConfigCid: input.assessmentConfigCid,
    domain: input.domain,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location ?? '',
  };
}

export function buildGreenGoodsSyncGapAdminsPayload(input: {
  coopId: string;
  gardenAddress: string;
  addAdmins?: string[];
  removeAdmins?: string[];
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
    addAdmins: input.addAdmins ?? [],
    removeAdmins: input.removeAdmins ?? [],
  };
}

export function buildGreenGoodsAddGardenerPayload(input: {
  coopId: string;
  memberId: string;
  gardenAddress: string;
  gardenerAddress: string;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    memberId: input.memberId,
    gardenAddress: input.gardenAddress,
    gardenerAddress: input.gardenerAddress,
  };
}

export function buildGreenGoodsRemoveGardenerPayload(input: {
  coopId: string;
  memberId: string;
  gardenAddress: string;
  gardenerAddress: string;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    memberId: input.memberId,
    gardenAddress: input.gardenAddress,
    gardenerAddress: input.gardenerAddress,
  };
}

export function buildGreenGoodsSubmitWorkSubmissionPayload(input: {
  coopId: string;
  gardenAddress: string;
  actionUid: number;
  title: string;
  feedback?: string;
  metadataCid: string;
  mediaCids?: string[];
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
    actionUid: input.actionUid,
    title: input.title,
    feedback: input.feedback ?? '',
    metadataCid: input.metadataCid,
    mediaCids: input.mediaCids ?? [],
  };
}

export function buildGreenGoodsSubmitImpactReportPayload(input: {
  coopId: string;
  gardenAddress: string;
  title: string;
  description: string;
  domain: string;
  reportCid: string;
  metricsSummary: string;
  reportingPeriodStart: number;
  reportingPeriodEnd: number;
  submittedBy: string;
}): Record<string, unknown> {
  return {
    coopId: input.coopId,
    gardenAddress: input.gardenAddress,
    title: input.title,
    description: input.description,
    domain: input.domain,
    reportCid: input.reportCid,
    metricsSummary: input.metricsSummary,
    reportingPeriodStart: input.reportingPeriodStart,
    reportingPeriodEnd: input.reportingPeriodEnd,
    submittedBy: input.submittedBy,
  };
}
