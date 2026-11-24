// sound.ts — the game's little sound effects.
//
// No sound files: every sound is made on the spot by the browser's Web Audio
// "synthesizer" (a few short tones, plus a puff of noise for the whoosh).
//
//   pick    a soft pop when you pick up a weight
//   hang    a bright clink when a weight goes on a hook
//   remove  a falling tone when a weight comes off
//   hint    a quick sparkle
//   reset   a whoosh
//   win     a rising chime
//
// Sound is ON unless the player switched it off (remembered in this browser).
// Browsers only allow sound after the player has tapped something; every
// sound here comes from a tap, so that's fine.

export type SoundName = 'pick' | 'hang' | 'remove' | 'hint' | 'reset' | 'win'

const STORAGE_KEY = 'counterweight:sound'
const VOLUME = 0.25

// ---------- On / off ----------

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Storage blocked (e.g. private mode): the choice lasts until the page closes.
  }
  soundOnNow = on
}

let soundOnNow = isSoundOn()

// ---------- Playing ----------

let context: AudioContext | null = null

/** The browser's audio engine, made the first time a sound plays. */
function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  if (!context) context = new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

export function playSound(name: SoundName): void {
  // Tests listen for this to check the right sound happens at the right time.
  window.dispatchEvent(new CustomEvent('cw-sound', { detail: { name, on: soundOnNow } }))
  if (!soundOnNow) return
  const ctx = audio()
  if (!ctx) return
  const t = ctx.currentTime + 0.01

  switch (name) {
    case 'pick':
      tone(ctx, { at: t, from: 520, to: 820, length: 0.09, shape: 'sine', volume: 0.7 })
      break
    case 'hang':
      // A low "thunk" with two bright metal partials on top
      tone(ctx, { at: t, from: 200, to: 140, length: 0.12, shape: 'sine', volume: 0.6 })
      tone(ctx, { at: t, from: 1320, length: 0.22, shape: 'triangle', volume: 0.35 })
      tone(ctx, { at: t + 0.01, from: 1980, length: 0.16, shape: 'sine', volume: 0.18 })
      break
    case 'remove':
      tone(ctx, { at: t, from: 640, to: 360, length: 0.14, shape: 'sine', volume: 0.55 })
      break
    case 'hint':
      ;[1320, 1760, 2350].forEach((f, i) => tone(ctx, { at: t + i * 0.07, from: f, length: 0.18, shape: 'sine', volume: 0.3 }))
      break
    case 'reset':
      whoosh(ctx, t)
      break
    case 'win':
      // C – E – G – high C, each ringing on
      ;[523, 659, 784, 1047].forEach((f, i) =>
        tone(ctx, { at: t + 0.12 + i * 0.1, from: f, length: 0.7, shape: 'triangle', volume: 0.45 }),
      )
      tone(ctx, { at: t + 0.52, from: 2093, length: 0.6, shape: 'sine', volume: 0.12 })
      break
  }
}

type ToneOptions = {
  at: number
  from: number
  /** Slide to this pitch (optional). */
  to?: number
  length: number
  shape: OscillatorType
  volume: number
}

/** One short note that fades out. */
function tone(ctx: AudioContext, { at, from, to, length, shape, volume }: ToneOptions) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = shape
  osc.frequency.setValueAtTime(from, at)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + length)
  // Quick fade in (no click), then a smooth fade out
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume * VOLUME, at + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + length + 0.02)
}

/** A soft "whoosh": a puff of noise swept from high to low. */
function whoosh(ctx: AudioContext, at: number) {
  const length = 0.3
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(2400, at)
  filter.frequency.exponentialRampToValueAtTime(350, at + length)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.5 * VOLUME, at + 0.06)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  noise.connect(filter).connect(gain).connect(ctx.destination)
  noise.start(at)
  noise.stop(at + length)
}
