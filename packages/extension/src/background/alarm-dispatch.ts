import { alarmNames, ensureDbReady, getCoops } from './context';
import { completeOnboardingBurst, runProactiveAgentCycle } from './handlers/agent';
import { emitKnowledgeLintObservation } from './handlers/agent-observation-emitters';
import { pollUnsealedArchiveReceipts } from './handlers/archive';
import { runCaptureCycle } from './handlers/capture';
import { handleAgentHeartbeat } from './handlers/heartbeat';

export async function handleAlarmEvent(alarm: Pick<chrome.alarms.Alarm, 'name'>) {
  await ensureDbReady();

  if (alarm.name === alarmNames.agentHeartbeat) {
    await handleAgentHeartbeat();
    return;
  }

  if (alarm.name === alarmNames.archiveStatusPoll) {
    await pollUnsealedArchiveReceipts();
    return;
  }

  if (alarm.name === alarmNames.capture) {
    await runCaptureCycle();
    return;
  }

  if (alarm.name === alarmNames.agentCadence) {
    await runProactiveAgentCycle({ reason: 'cadence-alarm' });
    return;
  }

  if (alarm.name === alarmNames.knowledgeLint) {
    const coops = await getCoops();
    for (const coop of coops) {
      await emitKnowledgeLintObservation({ coopId: coop.profile.id });
    }
    return;
  }

  if (alarm.name.startsWith(alarmNames.onboardingFollowUpPrefix)) {
    const onboardingKey = alarm.name.slice(alarmNames.onboardingFollowUpPrefix.length);
    await runProactiveAgentCycle({
      reason: 'onboarding-followup',
      onboardingKey,
    });
    await completeOnboardingBurst(onboardingKey);
  }
}
