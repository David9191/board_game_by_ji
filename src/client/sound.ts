const SOUND_STORAGE_KEY = 'bg_sfx_enabled';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean;

  constructor() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(SOUND_STORAGE_KEY) : null;
    this.enabled = saved === null ? true : saved === 'true';
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
    }
  }

  private ensureCtx(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, durationSec: number, type: OscillatorType = 'sine', gainLevel = 0.07, delaySec = 0): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec);
  }

  public vibrate(ms = 18): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore unsupported devices
      }
    }
  }

  public playDice(): void {
    this.vibrate(25);
    this.tone(360, 0.07, 'triangle', 0.08, 0);
    this.tone(480, 0.07, 'triangle', 0.08, 0.07);
    this.tone(640, 0.11, 'triangle', 0.09, 0.14);
  }

  public playTap(): void {
    this.vibrate(10);
    this.tone(520 + Math.random() * 160, 0.045, 'sine', 0.05, 0);
  }

  public playKeyEarned(golden = false): void {
    this.vibrate(golden ? 45 : 25);
    this.tone(523.25, 0.11, 'triangle', 0.08, 0);
    this.tone(659.25, 0.11, 'triangle', 0.08, 0.09);
    this.tone(783.99, 0.16, 'triangle', 0.09, 0.18);
    if (golden) {
      this.tone(1046.5, 0.28, 'triangle', 0.1, 0.28);
    }
  }

  public playFanfare(): void {
    this.vibrate(60);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, 'triangle', 0.09, idx * 0.11);
    });
  }
}

export const sfx = new SoundManager();

