export type VoiceMoment = 'one-left' | 'three-in-a-row' | 'bread-pigeon';

export const frenchLines: Record<VoiceMoment, string> = {
  'one-left': 'Encore une ! Allez, allez !',
  'three-in-a-row': 'Un, deux, trois ! Bravo, les champions !',
  'bread-pigeon': 'Oh là là ! Deux pigeons de plus !',
};

let audioContext: AudioContext | null = null;
let voiceQuietUntil = 0;

function getAudioContext(): AudioContext | null {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  } catch { return null; }
}

function note(context: AudioContext, frequency: number, start: number, duration: number, volume: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playTone(enabled: boolean, correct: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  note(context, correct ? 690 : 210, context.currentTime, .18, .045);
}

export function playFanfare(enabled: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  const start = context.currentTime;
  [392, 523, 659, 784].forEach((frequency, index) =>
    note(context, frequency, start + index * .18, index === 3 ? .65 : .28, .075));
}

export function speakFrench(enabled: boolean, moment: VoiceMoment): boolean {
  if (!enabled || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;
  const voice = window.speechSynthesis;
  const now = performance.now();
  // Drie groepen delen één luidspreker: andere meldingen vervallen in plaats van te wachten.
  if (now < voiceQuietUntil || voice.speaking || voice.pending) return false;
  try {
    const utterance = new SpeechSynthesisUtterance(frenchLines[moment]);
    utterance.lang = 'fr-FR';
    utterance.voice = voice.getVoices().find((option) => option.lang.toLowerCase().startsWith('fr')) ?? null;
    utterance.rate = .92;
    utterance.pitch = 1.12;
    utterance.volume = .9;
    voiceQuietUntil = now + 4200;
    voice.speak(utterance);
    return true;
  } catch { return false; }
}

export function stopFrenchVoice() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
