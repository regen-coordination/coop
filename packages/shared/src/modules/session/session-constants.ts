import type { Hex } from 'viem';
import { toFunctionSelector } from 'viem';
import type { PolicyActionClass, SessionCapableActionClass } from '../../contracts/schema';
import { sessionCapableActionClassSchema } from '../../contracts/schema';
import { getGreenGoodsDeployment } from '../greengoods/greengoods';

export const SESSION_CAPABLE_ACTION_CLASSES = [
  'green-goods-create-garden',
  'green-goods-sync-garden-profile',
  'green-goods-set-garden-domains',
  'green-goods-create-garden-pools',
] as const satisfies SessionCapableActionClass[];

export const GREEN_GOODS_ACTION_SELECTORS: Record<SessionCapableActionClass, Hex[]> = {
  'green-goods-create-garden': [
    toFunctionSelector(
      'mintGarden((string name,string slug,string description,string location,string bannerImage,string metadata,bool openJoining,uint8 weightScheme,uint8 domainMask,address[] gardeners,address[] operators))',
    ),
  ],
  'green-goods-sync-garden-profile': [
    toFunctionSelector('updateName(string)'),
    toFunctionSelector('updateDescription(string)'),
    toFunctionSelector('updateLocation(string)'),
    toFunctionSelector('updateBannerImage(string)'),
    toFunctionSelector('updateMetadata(string)'),
    toFunctionSelector('setOpenJoining(bool)'),
    toFunctionSelector('setMaxGardeners(uint256)'),
  ],
  'green-goods-set-garden-domains': [toFunctionSelector('setGardenDomains(address,uint8)')],
  'green-goods-create-garden-pools': [toFunctionSelector('createGardenPools(address)')],
};

export function isSessionCapableActionClass(
  actionClass: PolicyActionClass,
): actionClass is SessionCapableActionClass {
  return SESSION_CAPABLE_ACTION_CLASSES.includes(actionClass as SessionCapableActionClass);
}

export function parseSessionCapableActionClass(value: string) {
  return sessionCapableActionClassSchema.parse(value);
}

/** Minimal hex address check shared across session sub-modules. */
export function isAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}
