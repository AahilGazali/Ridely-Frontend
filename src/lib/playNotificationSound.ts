/**
 * Play a short notification sound (e.g. for new ride request).
 * Uses Web Audio API so no asset file is required.
 * Browsers require user interaction before audio can play; we try anyway for subsequent calls.
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  try {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
  return audioContext;
}

export function playNotificationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const playBeep = (startTime: number, frequency: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  // Double beep (like Uber/Ola notification)
  const t = ctx.currentTime;
  playBeep(t, 880, 0.08);
  playBeep(t + 0.12, 880, 0.08);
}

/**
 * Play a short alert sound when SOS is sent (confirmation for the user).
 * Slightly more urgent tone than the regular notification.
 */
export function playSosSentSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const playBeep = (startTime: number, frequency: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const t = ctx.currentTime;
  playBeep(t, 660, 0.1);
  playBeep(t + 0.15, 880, 0.1);
  playBeep(t + 0.3, 660, 0.12);
}
