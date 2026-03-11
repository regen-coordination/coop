import {
  type SoundEvent,
  type SoundPreferences,
  shouldPlaySound,
  soundPattern,
} from '@coop/shared';

let audioContext: AudioContext | null = null;

export async function playCoopSound(event: SoundEvent, preferences: SoundPreferences) {
  if (!shouldPlaySound(event, preferences, true)) {
    return;
  }

  const context = audioContext ?? new AudioContext();
  audioContext = context;

  if (context.state === 'suspended') {
    await context.resume();
  }

  let offset = context.currentTime;
  for (const step of soundPattern(event)) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = step.type;
    oscillator.frequency.value = step.frequency;
    gain.gain.value = step.gain;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(offset);
    oscillator.stop(offset + step.durationMs / 1000);
    offset += step.durationMs / 1000;
  }
}
