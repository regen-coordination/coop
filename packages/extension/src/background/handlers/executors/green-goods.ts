import {
  type GreenGoodsGardenState,
  type PolicyActionClass,
  addGreenGoodsGardener,
  applyGreenGoodsGardenerActionSuccess,
  applyGreenGoodsMemberBindingError,
  createGreenGoodsAssessment,
  createGreenGoodsGarden,
  createGreenGoodsGardenPools,
  nowIso,
  removeGreenGoodsGardener,
  resolveGreenGoodsGapAdminChanges,
  resolveScopedActionPayload,
  setGreenGoodsGardenDomains,
  submitGreenGoodsWorkApproval,
  syncGreenGoodsGapAdmins,
  syncGreenGoodsGardenProfile,
  updateGreenGoodsState,
} from '@coop/shared';
import {
  configuredOnchainMode,
  configuredPimlicoApiKey,
  ensureReceiverSyncOffscreenDocument,
  updateCoopGreenGoodsState,
} from '../../context';
import { logPrivilegedAction } from '../../operator';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';
import { emitAgentObservationIfMissing, requestAgentCycle } from '../agent';
import { buildGreenGoodsSessionExecutor } from '../session';

export function buildGreenGoodsExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle, trustedNodeContext } = ctx;

  return {
    'green-goods-create-garden': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-create-garden',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const provisioningCoop = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current?.enabled) {
              throw new Error('Green Goods is not enabled for this coop.');
            }
            return updateGreenGoodsState(current, {
              status: 'provisioning',
              provisioningAt: nowIso(),
              name: scopedPayload.normalizedPayload.name as string,
              slug: scopedPayload.normalizedPayload.slug as string | undefined,
              description: scopedPayload.normalizedPayload.description as string,
              location: scopedPayload.normalizedPayload.location as string,
              bannerImage: scopedPayload.normalizedPayload.bannerImage as string,
              metadata: scopedPayload.normalizedPayload.metadata as string,
              openJoining: scopedPayload.normalizedPayload.openJoining as boolean,
              maxGardeners: scopedPayload.normalizedPayload.maxGardeners as number,
              weightScheme: scopedPayload.normalizedPayload
                .weightScheme as GreenGoodsGardenState['weightScheme'],
              domains: scopedPayload.normalizedPayload.domains as GreenGoodsGardenState['domains'],
              statusNote: 'Provisioning Green Goods garden via the coop Safe.',
              lastError: undefined,
            });
          },
        });
        const provisioningGarden = provisioningCoop.greenGoods;
        if (!provisioningGarden) {
          throw new Error('Green Goods state is missing.');
        }

        const result = await createGreenGoodsGarden({
          mode: configuredOnchainMode,
          coopId: bundle.coopId,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: provisioningCoop.onchainState,
          garden: provisioningGarden,
          operatorAddresses: scopedPayload.normalizedPayload.operatorAddresses as `0x${string}`[],
          gardenerAddresses: scopedPayload.normalizedPayload.gardenerAddresses as `0x${string}`[],
          liveExecutor: await buildGreenGoodsSessionExecutor({
            coop: provisioningCoop,
            bundle,
          }),
        });

        const linkedCoop = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) {
              throw new Error('Green Goods state is missing.');
            }
            return updateGreenGoodsState(current, {
              status: 'linked',
              gardenAddress: result.gardenAddress,
              tokenId: result.tokenId,
              gapProjectUid: result.gapProjectUid,
              gapAdminAddresses: [],
              linkedAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });

        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Created Green Goods garden ${result.gardenAddress}.`,
          coop: linkedCoop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        await emitAgentObservationIfMissing({
          trigger: 'green-goods-sync-needed',
          title: `Green Goods sync needed for ${linkedCoop.profile.name}`,
          summary: `Garden ${result.gardenAddress} should be synced to the latest coop state.`,
          coopId: linkedCoop.profile.id,
          payload: {
            gardenAddress: result.gardenAddress,
            status: linkedCoop.greenGoods?.status,
            lastProfileSyncAt: linkedCoop.greenGoods?.lastProfileSyncAt,
            lastDomainSyncAt: linkedCoop.greenGoods?.lastDomainSyncAt,
            lastPoolSyncAt: linkedCoop.greenGoods?.lastPoolSyncAt,
          },
        });
        const desiredAdmins = linkedCoop.members
          .filter((member) => member.role === 'creator' || member.role === 'trusted')
          .map((member) => member.address);
        const currentAdmins = (linkedCoop.greenGoods?.gapAdminAddresses ?? []) as `0x${string}`[];
        const gapChanges = resolveGreenGoodsGapAdminChanges({
          desiredAdmins: desiredAdmins as `0x${string}`[],
          currentAdmins,
        });
        if (gapChanges.addAdmins.length > 0 || gapChanges.removeAdmins.length > 0) {
          await emitAgentObservationIfMissing({
            trigger: 'green-goods-gap-admin-sync-needed',
            title: `Green Goods GAP admin sync needed for ${linkedCoop.profile.name}`,
            summary: `Karma GAP admins should match the trusted operators for ${linkedCoop.profile.name}.`,
            coopId: linkedCoop.profile.id,
            payload: {
              gardenAddress: result.gardenAddress,
              desiredAdmins,
              currentAdmins: linkedCoop.greenGoods?.gapAdminAddresses ?? [],
            },
          });
        }
        await ensureReceiverSyncOffscreenDocument();
        await requestAgentCycle(`green-goods-sync:${linkedCoop.profile.id}`, true);

        return { ok: true, data: linkedCoop.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods garden creation failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) {
                throw new Error(message);
              }
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          // Ignore follow-up state patch failures and return the original error.
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods garden creation failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-sync-garden-profile': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-sync-garden-profile',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const coop = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current?.gardenAddress) {
              throw new Error('Green Goods garden is not linked yet.');
            }
            return updateGreenGoodsState(current, {
              name: scopedPayload.normalizedPayload.name as string,
              description: scopedPayload.normalizedPayload.description as string,
              location: scopedPayload.normalizedPayload.location as string,
              bannerImage: scopedPayload.normalizedPayload.bannerImage as string,
              metadata: scopedPayload.normalizedPayload.metadata as string,
              openJoining: scopedPayload.normalizedPayload.openJoining as boolean,
              maxGardeners: scopedPayload.normalizedPayload.maxGardeners as number,
              status: 'linked',
              statusNote: 'Syncing Green Goods garden profile fields.',
              lastError: undefined,
            });
          },
        });
        const result = await syncGreenGoodsGardenProfile({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          output: {
            name: scopedPayload.normalizedPayload.name as string,
            description: scopedPayload.normalizedPayload.description as string,
            location: scopedPayload.normalizedPayload.location as string,
            bannerImage: scopedPayload.normalizedPayload.bannerImage as string,
            metadata: scopedPayload.normalizedPayload.metadata as string,
            openJoining: scopedPayload.normalizedPayload.openJoining as boolean,
            maxGardeners: scopedPayload.normalizedPayload.maxGardeners as number,
            domains: coop.greenGoods?.domains ?? [],
            ensurePools: true,
            rationale: 'Sync Green Goods garden profile fields.',
          },
          liveExecutor: await buildGreenGoodsSessionExecutor({
            coop,
            bundle,
          }),
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) {
              throw new Error('Green Goods state is missing.');
            }
            return updateGreenGoodsState(current, {
              status: 'linked',
              lastProfileSyncAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Synced Green Goods garden profile for ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods garden profile sync failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) {
                throw new Error(message);
              }
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          // Ignore follow-up state patch failures and return the original error.
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods garden profile sync failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-set-garden-domains': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-set-garden-domains',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const result = await setGreenGoodsGardenDomains({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          domains: scopedPayload.normalizedPayload.domains as GreenGoodsGardenState['domains'],
          liveExecutor: await buildGreenGoodsSessionExecutor({ coop, bundle }),
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              domains: scopedPayload.normalizedPayload.domains as GreenGoodsGardenState['domains'],
              lastDomainSyncAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Updated Green Goods garden domains for ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Green Goods domain sync failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods domain sync failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-create-garden-pools': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-create-garden-pools',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const result = await createGreenGoodsGardenPools({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          liveExecutor: await buildGreenGoodsSessionExecutor({ coop, bundle }),
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              lastPoolSyncAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Created Green Goods signal pools for ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods pool creation failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods pool creation failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-submit-work-approval': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-submit-work-approval',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const result = await submitGreenGoodsWorkApproval({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          output: {
            actionUid: scopedPayload.normalizedPayload.actionUid as number,
            workUid: scopedPayload.normalizedPayload.workUid as `0x${string}`,
            approved: scopedPayload.normalizedPayload.approved as boolean,
            feedback: scopedPayload.normalizedPayload.feedback as string,
            confidence: scopedPayload.normalizedPayload.confidence as number,
            verificationMethod: scopedPayload.normalizedPayload.verificationMethod as number,
            reviewNotesCid: scopedPayload.normalizedPayload.reviewNotesCid as string,
            rationale: 'Submit Green Goods work approval.',
          },
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              lastWorkApprovalAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Submitted Green Goods work approval for ${scopedPayload.normalizedPayload.workUid as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods work approval submission failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods work approval submission failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-create-assessment': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-create-assessment',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const result = await createGreenGoodsAssessment({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          output: {
            title: scopedPayload.normalizedPayload.title as string,
            description: scopedPayload.normalizedPayload.description as string,
            assessmentConfigCid: scopedPayload.normalizedPayload.assessmentConfigCid as string,
            domain: scopedPayload.normalizedPayload
              .domain as GreenGoodsGardenState['domains'][number],
            startDate: scopedPayload.normalizedPayload.startDate as number,
            endDate: scopedPayload.normalizedPayload.endDate as number,
            location: scopedPayload.normalizedPayload.location as string,
            rationale: 'Create Green Goods assessment.',
          },
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              lastAssessmentAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Created Green Goods assessment ${scopedPayload.normalizedPayload.title as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods assessment creation failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods assessment creation failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-add-gardener': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-add-gardener',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const coop = trustedNodeContext.coop;
        const result = await addGreenGoodsGardener({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) {
              throw new Error('Green Goods state is missing.');
            }
            return applyGreenGoodsGardenerActionSuccess({
              garden: current,
              memberId: scopedPayload.normalizedPayload.memberId as string,
              actionClass: 'green-goods-add-gardener',
              gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
              txHash: result.txHash,
              detail: result.detail,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Added gardener ${scopedPayload.normalizedPayload.gardenerAddress as string} to ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: { ...updated.greenGoods, txHash: result.txHash } };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Green Goods gardener add failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) {
                throw new Error(message);
              }
              return applyGreenGoodsMemberBindingError({
                garden: current,
                memberId: scopedPayload.normalizedPayload.memberId as string,
                error: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods gardener add failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-remove-gardener': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-remove-gardener',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }

      try {
        const coop = trustedNodeContext.coop;
        const result = await removeGreenGoodsGardener({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
        });
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) {
              throw new Error('Green Goods state is missing.');
            }
            return applyGreenGoodsGardenerActionSuccess({
              garden: current,
              memberId: scopedPayload.normalizedPayload.memberId as string,
              actionClass: 'green-goods-remove-gardener',
              gardenerAddress: scopedPayload.normalizedPayload.gardenerAddress as `0x${string}`,
              txHash: result.txHash,
              detail: result.detail,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Removed gardener ${scopedPayload.normalizedPayload.gardenerAddress as string} from ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: { ...updated.greenGoods, txHash: result.txHash } };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods gardener removal failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) {
                throw new Error(message);
              }
              return applyGreenGoodsMemberBindingError({
                garden: current,
                memberId: scopedPayload.normalizedPayload.memberId as string,
                error: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods gardener removal failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
    'green-goods-sync-gap-admins': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'green-goods-sync-gap-admins',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) return { ok: false, error: scopedPayload.reason };
      try {
        const coop = trustedNodeContext.coop;
        const addAdmins = scopedPayload.normalizedPayload.addAdmins as `0x${string}`[];
        const removeAdmins = scopedPayload.normalizedPayload.removeAdmins as `0x${string}`[];
        const result = await syncGreenGoodsGapAdmins({
          mode: configuredOnchainMode,
          authSession: trustedNodeContext.authSession,
          pimlicoApiKey: configuredPimlicoApiKey,
          onchainState: coop.onchainState,
          gardenAddress: scopedPayload.normalizedPayload.gardenAddress as `0x${string}`,
          addAdmins,
          removeAdmins,
        });
        const nextAdminAddresses = coop.members
          .filter((m) => m.role === 'creator' || m.role === 'trusted')
          .map((m) => m.address);
        const updated = await updateCoopGreenGoodsState({
          coopId: bundle.coopId,
          apply(current) {
            if (!current) throw new Error('Green Goods state is missing.');
            return updateGreenGoodsState(current, {
              status: 'linked',
              gapAdminAddresses: nextAdminAddresses,
              lastGapAdminSyncAt: nowIso(),
              lastTxHash: result.txHash,
              statusNote: result.detail,
              lastError: undefined,
            });
          },
        });
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'succeeded',
          detail: `Synced Green Goods GAP admins for ${scopedPayload.normalizedPayload.gardenAddress as string}.`,
          coop: updated,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: true, data: updated.greenGoods };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Green Goods GAP admin sync failed.';
        try {
          await updateCoopGreenGoodsState({
            coopId: bundle.coopId,
            apply(current) {
              if (!current) throw new Error(message);
              return updateGreenGoodsState(current, {
                status: 'error',
                lastError: message,
                statusNote: message,
              });
            },
          });
        } catch {
          /* ignore */
        }
        await logPrivilegedAction({
          actionType: 'green-goods-transaction',
          status: 'failed',
          detail: `Green Goods GAP admin sync failed: ${message}`,
          coop: trustedNodeContext.coop,
          memberId: trustedNodeContext.member.id,
          memberDisplayName: trustedNodeContext.member.displayName,
          authSession: trustedNodeContext.authSession,
        });
        return { ok: false, error: message };
      }
    },
  };
}
