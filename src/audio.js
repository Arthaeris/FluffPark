/*
==================================================
AUDIO (procedural chiptune SFX, no assets)
==================================================

A tiny WebAudio synth. The context is created
lazily on the first user input (autoplay policy).
==================================================
*/

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;

    if (AC) {
      ctx = new AC();
    }
  }

  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
}

function tone(freq, start, duration, type = "square", volume = 0.08) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  const t0 = ctx.currentTime + start;

  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function play(notes, type = "square", volume = 0.08) {
  if (muted || !ctx || ctx.state !== "running") {
    return;
  }

  for (const [freq, start, duration] of notes) {
    tone(freq, start, duration, type, volume);
  }
}

/* ---------- sfx ---------- */

export const sfx = {
  select() {
    play([[660, 0, 0.06]]);
  },

  deselect() {
    play([[440, 0, 0.06]]);
  },

  ui() {
    play([[520, 0, 0.05]]);
  },

  coin() {
    play([[880, 0, 0.06], [1320, 0.06, 0.09]]);
  },

  feed() {
    play([[220, 0, 0.07], [180, 0.08, 0.07]], "sawtooth", 0.06);
  },

  wash() {
    play([[520, 0, 0.1], [660, 0.08, 0.1], [780, 0.16, 0.14]], "sine", 0.07);
  },

  breed() {
    play([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.2]]);
  },

  rare() {
    play([
      [523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1],
      [1047, 0.3, 0.16], [1319, 0.42, 0.26]
    ]);
  },

  warn() {
    play([[220, 0, 0.15], [180, 0.18, 0.22]], "triangle", 0.09);
  },

  book() {
    play([[392, 0, 0.06], [523, 0.05, 0.08]]);
  }
};
