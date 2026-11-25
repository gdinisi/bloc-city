/**
 * Bips du minuteur. Sur iPhone, le son n'est autorisé qu'après un appui :
 * unlock() doit être appelé dans le gestionnaire du bouton « C'est parti ».
 */
let ctx: AudioContext | null = null

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!ctx && AC) ctx = new AC()
    if (ctx?.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

export function beep(freq = 660, ms = 120, volume = 0.25) {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = ctx.currentTime
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + ms / 1000 + 0.02)
  } catch {
    /* pas de son, tant pis */
  }
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* vibration non disponible (iPhone) */
  }
}
