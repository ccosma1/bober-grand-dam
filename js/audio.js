export function createSfx() {
  let ctx = null;
  let engine = null;
  let engineGain = null;
  let filter = null;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain) {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  return {
    unlock() {
      try { ac(); } catch (e) { /* ignore */ }
    },
    beep(step) {
      try { tone(step <= 0 ? 660 : 480, 0.12, "square", 0.05); } catch (e) { /* ignore */ }
    },
    boost() {
      try { tone(220, 0.18, "sawtooth", 0.04); } catch (e) { /* ignore */ }
    },
    hit() {
      try { tone(128, 0.08, "square", 0.07); } catch (e) { /* ignore */ }
    },
    buzz() {
      try {
        tone(96, 0.07, "square", 0.06);
        setTimeout(() => tone(70, 0.09, "square", 0.05), 80);
      } catch (e) { /* ignore */ }
    },
    finish() {
      try {
        tone(523, 0.12, "square", 0.05);
        setTimeout(() => tone(659, 0.14, "square", 0.05), 120);
        setTimeout(() => tone(784, 0.2, "square", 0.05), 240);
      } catch (e) { /* ignore */ }
    },
    engine(speed, boosting) {
      try {
        const c = ac();
        if (!engine) {
          engine = c.createOscillator();
          engine.type = "sawtooth";
          filter = c.createBiquadFilter();
          filter.type = "lowpass";
          engineGain = c.createGain();
          engineGain.gain.value = 0.0;
          engine.connect(filter);
          filter.connect(engineGain);
          engineGain.connect(c.destination);
          engine.start();
        }
        const freq = 58 + speed * 3.1 + (boosting ? 40 : 0);
        engine.frequency.setTargetAtTime(freq, c.currentTime, 0.08);
        filter.frequency.setTargetAtTime(420 + speed * 18, c.currentTime, 0.1);
        const vol = speed > 0.5 ? 0.018 + Math.min(0.02, speed * 0.0006) : 0;
        engineGain.gain.setTargetAtTime(vol, c.currentTime, 0.1);
      } catch (e) { /* ignore */ }
    },
    stop() {
      try {
        if (engineGain && ctx) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      } catch (e) { /* ignore */ }
    },
  };
}
