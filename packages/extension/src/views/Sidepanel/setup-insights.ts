import {
  type CaptureMode,
  type CoopSpaceType,
  type SetupInsightsInput,
  emptySetupInsightsInput,
} from '@coop/shared';

export interface CreateFormState extends SetupInsightsInput {
  spaceType: CoopSpaceType;
  creatorDisplayName: string;
  seedContribution: string;
  captureMode: CaptureMode;
  createGreenGoodsGarden: boolean;
  archiveSpaceDid: string;
  archiveAgentPrivateKey: string;
  archiveSpaceDelegation: string;
  archiveGatewayUrl: string;
}

export const initialCreateForm: CreateFormState = {
  ...emptySetupInsightsInput,
  spaceType: 'community',
  creatorDisplayName: '',
  seedContribution: '',
  captureMode: 'manual',
  createGreenGoodsGarden: false,
  archiveSpaceDid: '',
  archiveAgentPrivateKey: '',
  archiveSpaceDelegation: '',
  archiveGatewayUrl: '',
};

export function hasArchiveConfig(form: CreateFormState): boolean {
  return form.archiveSpaceDid.trim().length > 0 && form.archiveSpaceDelegation.trim().length > 0;
}
export { toSetupInsights } from '@coop/shared';
