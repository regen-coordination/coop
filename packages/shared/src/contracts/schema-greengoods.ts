import z from 'zod';

export const greenGoodsGardenStatusSchema = z.enum([
  'disabled',
  'requested',
  'provisioning',
  'linked',
  'error',
]);
export const greenGoodsDomainSchema = z.enum(['solar', 'agro', 'edu', 'waste']);
export const greenGoodsWeightSchemeSchema = z.enum(['linear', 'exponential', 'power']);
export const greenGoodsMemberRoleSchema = z.enum([
  'gardener',
  'operator',
  'assessor',
  'impact-reporter',
]);
export const greenGoodsHypercertDomainSchema = z.enum([
  'solar',
  'waste',
  'agroforestry',
  'education',
  'mutual_credit',
]);
export const greenGoodsHypercertDomainInputSchema = z.enum([
  'solar',
  'waste',
  'agro',
  'agroforestry',
  'edu',
  'education',
  'mutual_credit',
]);
export const greenGoodsHypercertCapitalSchema = z.enum([
  'living',
  'social',
  'material',
  'financial',
  'intellectual',
  'experiential',
  'spiritual',
  'cultural',
]);
export const greenGoodsMemberBindingStatusSchema = z.enum([
  'pending-account',
  'pending-sync',
  'synced',
  'error',
]);
export const greenGoodsMemberBindingSchema = z.object({
  memberId: z.string().min(1),
  actorAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  syncedActorAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  desiredRoles: z.array(greenGoodsMemberRoleSchema).default([]),
  currentRoles: z.array(greenGoodsMemberRoleSchema).default([]),
  status: greenGoodsMemberBindingStatusSchema.default('pending-account'),
  lastSyncedAt: z.string().datetime().optional(),
  lastError: z.string().optional(),
});

export const greenGoodsGardenStateSchema = z.object({
  enabled: z.boolean().default(false),
  status: greenGoodsGardenStatusSchema.default('disabled'),
  requestedAt: z.string().datetime().optional(),
  provisioningAt: z.string().datetime().optional(),
  linkedAt: z.string().datetime().optional(),
  lastMemberSyncAt: z.string().datetime().optional(),
  lastProfileSyncAt: z.string().datetime().optional(),
  lastDomainSyncAt: z.string().datetime().optional(),
  lastPoolSyncAt: z.string().datetime().optional(),
  lastGapAdminSyncAt: z.string().datetime().optional(),
  lastWorkSubmissionAt: z.string().datetime().optional(),
  lastWorkApprovalAt: z.string().datetime().optional(),
  lastAssessmentAt: z.string().datetime().optional(),
  lastHypercertMintAt: z.string().datetime().optional(),
  lastImpactReportAt: z.string().datetime().optional(),
  gardenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  tokenId: z.string().min(1).optional(),
  gapProjectUid: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().min(1),
  location: z.string().default(''),
  bannerImage: z.string().default(''),
  metadata: z.string().default(''),
  openJoining: z.boolean().default(false),
  maxGardeners: z.number().int().nonnegative().default(0),
  weightScheme: greenGoodsWeightSchemeSchema.default('linear'),
  domains: z.array(greenGoodsDomainSchema).default([]),
  memberBindings: z.array(greenGoodsMemberBindingSchema).default([]),
  gapAdminAddresses: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).default([]),
  domainMask: z.number().int().min(0).max(15).default(0),
  statusNote: z.string().default(''),
  lastError: z.string().optional(),
  lastTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/)
    .optional(),
  lastHypercertId: z.string().min(1).optional(),
  lastHypercertMetadataUri: z.string().min(1).optional(),
  lastHypercertAllowlistUri: z.string().min(1).optional(),
  lastUserOperationHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/)
    .optional(),
});

export const greenGoodsGardenBootstrapOutputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().min(1),
  location: z.string().default(''),
  bannerImage: z.string().default(''),
  metadata: z.string().default(''),
  openJoining: z.boolean().default(false),
  maxGardeners: z.number().int().nonnegative().default(0),
  weightScheme: greenGoodsWeightSchemeSchema.default('linear'),
  domains: z.array(greenGoodsDomainSchema).default([]),
  rationale: z.string().min(1),
});

export const greenGoodsGardenSyncOutputSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  location: z.string().default(''),
  bannerImage: z.string().default(''),
  metadata: z.string().default(''),
  openJoining: z.boolean().default(false),
  maxGardeners: z.number().int().nonnegative().default(0),
  domains: z.array(greenGoodsDomainSchema).default([]),
  ensurePools: z.boolean().default(true),
  rationale: z.string().min(1),
});

const baseWorkApprovalFields = {
  actionUid: z.number().int().nonnegative(),
  workUid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  approved: z.boolean(),
  feedback: z.string().default(''),
  confidence: z.number().int().min(0).max(255).default(100),
  verificationMethod: z.number().int().min(0).max(255).default(0),
  reviewNotesCid: z.string().default(''),
};

export const greenGoodsWorkApprovalRequestSchema = z.object({
  ...baseWorkApprovalFields,
  rationale: z.string().min(1).default('Queue a Green Goods work approval attestation.'),
});

export const greenGoodsWorkApprovalOutputSchema = z.object({
  ...baseWorkApprovalFields,
  rationale: z.string().min(1),
});

const baseAssessmentFields = {
  title: z.string().min(1),
  description: z.string().min(1),
  assessmentConfigCid: z.string().min(1),
  domain: greenGoodsDomainSchema.default('agro'),
  startDate: z.number().int().nonnegative(),
  endDate: z.number().int().nonnegative(),
  location: z.string().default(''),
};

function refineAssessmentDates(
  value: { startDate: number; endDate: number },
  ctx: z.RefinementCtx,
) {
  if (value.endDate < value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'endDate must be greater than or equal to startDate.',
    });
  }
}

export const greenGoodsAssessmentRequestSchema = z
  .object({
    ...baseAssessmentFields,
    rationale: z.string().min(1).default('Queue a Green Goods assessment attestation.'),
  })
  .superRefine(refineAssessmentDates);

export const greenGoodsAssessmentOutputSchema = z
  .object({
    ...baseAssessmentFields,
    rationale: z.string().min(1),
  })
  .superRefine(refineAssessmentDates);

export const greenGoodsGapAdminSyncOutputSchema = z.object({
  addAdmins: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).default([]),
  removeAdmins: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).default([]),
  rationale: z.string().min(1),
});

export const greenGoodsWorkSubmissionOutputSchema = z.object({
  gardenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  actionUid: z.number().int().nonnegative(),
  title: z.string().min(1),
  feedback: z.string().default(''),
  metadataCid: z.string().min(1),
  mediaCids: z.array(z.string().min(1)).default([]),
});

export const greenGoodsHypercertMetricValueSchema = z.object({
  value: z.number(),
  unit: z.string().min(1),
});

export const greenGoodsHypercertPredefinedMetricSchema = z.object({
  value: z.number(),
  unit: z.string().min(1),
  aggregation: z.enum(['sum', 'count', 'average', 'max']),
  label: z.string().min(1),
});

export const greenGoodsHypercertCustomMetricSchema = z.object({
  value: z.number(),
  unit: z.string().min(1),
  label: z.string().min(1),
});

export const greenGoodsHypercertOutcomeMetricsSchema = z.object({
  predefined: z.record(z.string(), greenGoodsHypercertPredefinedMetricSchema).default({}),
  custom: z.record(z.string(), greenGoodsHypercertCustomMetricSchema).default({}),
});

export const greenGoodsHypercertAllowlistEntrySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  units: z.number().int().positive(),
  label: z.string().min(1).optional(),
});

export const greenGoodsHypercertAttestationSchema = z.object({
  uid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  workUid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  title: z.string().min(1),
  domain: greenGoodsHypercertDomainInputSchema.optional(),
  workScope: z.array(z.string().min(1)).default([]),
  gardenerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  gardenerName: z.string().min(1).optional(),
  mediaUrls: z.array(z.string().min(1)).default([]),
  metrics: z.record(z.string(), greenGoodsHypercertMetricValueSchema).optional(),
  createdAt: z.number().int().nonnegative(),
  approvedAt: z.number().int().nonnegative(),
  approvedBy: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  feedback: z.string().optional(),
  actionType: z.string().min(1).optional(),
});

function refineGreenGoodsHypercertTimeframes(
  value: {
    workTimeframeStart?: number;
    workTimeframeEnd?: number;
    impactTimeframeStart?: number;
    impactTimeframeEnd?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (
    typeof value.workTimeframeStart === 'number' &&
    typeof value.workTimeframeEnd === 'number' &&
    value.workTimeframeEnd < value.workTimeframeStart
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['workTimeframeEnd'],
      message: 'workTimeframeEnd must be greater than or equal to workTimeframeStart.',
    });
  }

  if (
    typeof value.impactTimeframeStart === 'number' &&
    typeof value.impactTimeframeEnd === 'number' &&
    value.impactTimeframeEnd !== 0 &&
    value.impactTimeframeEnd < value.impactTimeframeStart
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['impactTimeframeEnd'],
      message: 'impactTimeframeEnd must be greater than or equal to impactTimeframeStart.',
    });
  }
}

function refineGreenGoodsHypercertAllowlist(
  value: {
    allowlist: Array<{
      address: string;
      units: number;
    }>;
  },
  ctx: z.RefinementCtx,
) {
  const totalUnits = value.allowlist.reduce((sum, entry) => sum + entry.units, 0);
  if (totalUnits !== 100_000_000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allowlist'],
      message: 'Green Goods Hypercert allowlists must total exactly 100000000 units.',
    });
  }
}

const greenGoodsHypercertMintRequestBaseSchema = z.object({
  gardenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(1),
  description: z.string().min(1),
  workScopes: z.array(z.string().min(1)).default([]),
  impactScopes: z.array(z.string().min(1)).default(['all']),
  workTimeframeStart: z.number().int().nonnegative().optional(),
  workTimeframeEnd: z.number().int().nonnegative().optional(),
  impactTimeframeStart: z.number().int().nonnegative().optional(),
  impactTimeframeEnd: z.number().int().nonnegative().nullable().optional(),
  externalUrl: z.string().min(1).optional(),
  imageUri: z.string().min(1).optional(),
  domain: greenGoodsHypercertDomainInputSchema.optional(),
  sdgs: z.array(z.number().int().min(1).max(17)).default([]),
  capitals: z.array(greenGoodsHypercertCapitalSchema).default([]),
  outcomes: greenGoodsHypercertOutcomeMetricsSchema.default({
    predefined: {},
    custom: {},
  }),
  allowlist: z.array(greenGoodsHypercertAllowlistEntrySchema).min(1),
  attestations: z.array(greenGoodsHypercertAttestationSchema).min(1),
  rationale: z.string().min(1),
});

export const greenGoodsHypercertMintRequestSchema = greenGoodsHypercertMintRequestBaseSchema
  .superRefine(refineGreenGoodsHypercertTimeframes)
  .superRefine(refineGreenGoodsHypercertAllowlist);

export const greenGoodsHypercertMintActionPayloadSchema = greenGoodsHypercertMintRequestBaseSchema
  .extend({
    coopId: z.string().min(1),
  })
  .superRefine(refineGreenGoodsHypercertTimeframes)
  .superRefine(refineGreenGoodsHypercertAllowlist);

export const greenGoodsImpactReportOutputSchema = z
  .object({
    gardenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    title: z.string().min(1),
    description: z.string().min(1),
    domain: greenGoodsDomainSchema,
    reportCid: z.string().min(1),
    metricsSummary: z.string().min(1),
    reportingPeriodStart: z.number().int().nonnegative(),
    reportingPeriodEnd: z.number().int().nonnegative(),
    submittedBy: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  })
  .superRefine((value, ctx) => {
    if (value.reportingPeriodEnd < value.reportingPeriodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reportingPeriodEnd'],
        message: 'reportingPeriodEnd must be greater than or equal to reportingPeriodStart.',
      });
    }
  });

export type GreenGoodsDomain = z.infer<typeof greenGoodsDomainSchema>;
export type GreenGoodsGardenBootstrapOutput = z.infer<typeof greenGoodsGardenBootstrapOutputSchema>;
export type GreenGoodsMemberBinding = z.infer<typeof greenGoodsMemberBindingSchema>;
export type GreenGoodsMemberBindingStatus = z.infer<typeof greenGoodsMemberBindingStatusSchema>;
export type GreenGoodsMemberRole = z.infer<typeof greenGoodsMemberRoleSchema>;
export type GreenGoodsGardenState = z.infer<typeof greenGoodsGardenStateSchema>;
export type GreenGoodsGardenStatus = z.infer<typeof greenGoodsGardenStatusSchema>;
export type GreenGoodsGardenSyncOutput = z.infer<typeof greenGoodsGardenSyncOutputSchema>;
export type GreenGoodsWorkApprovalRequest = z.infer<typeof greenGoodsWorkApprovalRequestSchema>;
export type GreenGoodsAssessmentRequest = z.infer<typeof greenGoodsAssessmentRequestSchema>;
export type GreenGoodsWorkApprovalOutput = z.infer<typeof greenGoodsWorkApprovalOutputSchema>;
export type GreenGoodsAssessmentOutput = z.infer<typeof greenGoodsAssessmentOutputSchema>;
export type GreenGoodsGapAdminSyncOutput = z.infer<typeof greenGoodsGapAdminSyncOutputSchema>;
export type GreenGoodsWorkSubmissionOutput = z.infer<typeof greenGoodsWorkSubmissionOutputSchema>;
export type GreenGoodsHypercertDomain = z.infer<typeof greenGoodsHypercertDomainSchema>;
export type GreenGoodsHypercertDomainInput = z.infer<typeof greenGoodsHypercertDomainInputSchema>;
export type GreenGoodsHypercertCapital = z.infer<typeof greenGoodsHypercertCapitalSchema>;
export type GreenGoodsHypercertMetricValue = z.infer<typeof greenGoodsHypercertMetricValueSchema>;
export type GreenGoodsHypercertOutcomeMetrics = z.infer<
  typeof greenGoodsHypercertOutcomeMetricsSchema
>;
export type GreenGoodsHypercertAllowlistEntry = z.infer<
  typeof greenGoodsHypercertAllowlistEntrySchema
>;
export type GreenGoodsHypercertAttestation = z.infer<typeof greenGoodsHypercertAttestationSchema>;
export type GreenGoodsHypercertMintRequest = z.infer<typeof greenGoodsHypercertMintRequestSchema>;
export type GreenGoodsHypercertMintActionPayload = z.infer<
  typeof greenGoodsHypercertMintActionPayloadSchema
>;
export type GreenGoodsImpactReportOutput = z.infer<typeof greenGoodsImpactReportOutputSchema>;
export type GreenGoodsWeightScheme = z.infer<typeof greenGoodsWeightSchemeSchema>;
