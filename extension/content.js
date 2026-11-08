// Song Enhancer Hi-Fi: routes the page's <video>/<audio> through an enhancement chain.
(() => {
  // Mode settings: EQ in dB, comp/width/exciter/bassEnh/surround in %
  const PRESETS = {
    auto:  null, // adaptive
    bass:  { bass:10, lowmid:-2, mid:0,  treble:2,  comp:50, width:110, exciter:10, bassEnh:70, surround:15 },
    vocal: { bass:-1, lowmid:-4, mid:7,  treble:4,  comp:55, width:100, exciter:40, bassEnh:10, surround:10 },
    warm:  { bass:5,  lowmid:3,  mid:-2, treble:-4, comp:40, width:95,  exciter:0,  bassEnh:35, surround:20 },
    loud:  { bass:6,  lowmid:-2, mid:4,  treble:5,  comp:90, width:130, exciter:35, bassEnh:50, surround:25 },
    hifi:  { bass:4,  lowmid:-2, mid:2,  treble:4,  comp:45, width:125, exciter:30, bassEnh:35, surround:30 },
  };
  const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const STYLES = { // multiband compressor character
    gentle:    { amt:0.6, atk:[0.03,0.02,0.01,0.005], rel:[0.4,0.3,0.25,0.2] },
    broadcast: { amt:1.0, atk:[0.02,0.012,0.006,0.003], rel:[0.3,0.2,0.15,0.1] },
    club:      { amt:1.35, atk:[0.01,0.008,0.004,0.002], rel:[0.2,0.15,0.1,0.08] },
  };
  const XOVER = [150, 800, 5000];
  const DEVICES = { // output tuning: tilt EQ + crossfeed (headphones)
    headphones: { lo:0,  lm:0,    hm:0,   hi:0,  hp:20,  feed:0.22 },
    speakers:   { lo:1,  lm:0,    hm:0,   hi:0.5, hp:20, feed:0 },
    laptop:     { lo:-4, lm:1.5,  hm:2,   hi:1,  hp:110, feed:0 },
    car:        { lo:-2, lm:-1.5, hm:1.5, hi:2,  hp:35,  feed:0 },
  };
  const DEF = { enabled:true, preset:'auto', style:'broadcast', agc:true, device:'headphones', intensity:100, eq:[0,0,0,0,0,0,0,0,0,0], uWidth:0, uSurround:0, uBoost:0 };
  let cfg = { ...DEF };
  let ctx, n, hooked = new WeakSet(), timer, last = null;

  function build(c) {
    const x = {}, f = (type, freq, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = freq; if (q) b.Q.value = q; return b; };
    const g = v => { const k = c.createGain(); k.gain.value = v; return k; };
    const shaper = drive => { const s = c.createWaveShaper(); s.oversample = '4x'; const cv = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const v = i / 511.5 - 1; cv[i] = Math.tanh(drive * v) / Math.tanh(drive); } s.curve = cv; return s; };
    x.input = g(1); x.bypass = g(0); x.wetIn = g(1);
    x.hp = f('highpass', 25, 0.7);
    x.bass = f('lowshelf', 90); x.lowmid = f('peaking', 350, 1); x.mid = f('peaking', 2800, 0.8); x.treble = f('highshelf', 9000);
    // 10-band graphic EQ (user)
    x.geq = BANDS.map((fr, i) => f(i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking', fr, 1.4));
    for (let i = 0; i < x.geq.length - 1; i++) x.geq[i].connect(x.geq[i + 1]);
    // Harmonic exciter (detail)
    x.exHp = f('highpass', 3500); x.exShape = shaper(4); x.exGain = g(0);
    // Bass enhancer: adds harmonics of the lows so bass sounds deeper on any speaker
    x.beLp = f('lowpass', 120); x.beShape = shaper(6); x.beLp2 = f('lowpass', 350); x.beGain = g(0);
    // Input AGC (slow loudness rider)
    x.agc = g(1);
    // 4-band multiband compressor: Linkwitz-Riley style crossovers (two cascaded 2nd-order filters)
    x.comp = g(1); // summing bus feeding the crossover
    // Phase-coherent LR4 crossover tree: split at 800 Hz, then 150 Hz and 5 kHz,
    // with allpass compensation so the four bands sum back flat.
    const lr4 = (type, fr) => { const a = f(type, fr, -3.0103), b = f(type, fr, -3.0103); // Butterworth (Web Audio LP/HP Q is in dB)
      a.connect(b); return [a, b]; };
    const ap = fr => f('allpass', fr, 0.5);
    x.mbOut = g(1); x.bands = [];
    const [lo1, lo2] = lr4('lowpass', XOVER[1]), [hi1, hi2] = lr4('highpass', XOVER[1]);
    x.comp.connect(lo1); x.comp.connect(hi1);
    const loC = ap(XOVER[2]), hiC = ap(XOVER[0]); lo2.connect(loC); hi2.connect(hiC);
    const outs = [lr4('lowpass', XOVER[0]), lr4('highpass', XOVER[0]), lr4('lowpass', XOVER[2]), lr4('highpass', XOVER[2])];
    loC.connect(outs[0][0]); loC.connect(outs[1][0]); hiC.connect(outs[2][0]); hiC.connect(outs[3][0]);
    for (const [, end] of outs) {
      const cmp = c.createDynamicsCompressor(); cmp.knee.value = 6;
      const out = g(1); end.connect(cmp).connect(out).connect(x.mbOut);
      x.bands.push({ cmp, out });
    }
    x.makeup = g(1);
    // Soft clipper (transparent until peaks), before the final limiter
    x.clip = c.createWaveShaper(); x.clip.oversample = '4x';
    { const cv = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const v = i / 1023.5 - 1, a = Math.abs(v);
        cv[i] = Math.sign(v) * (a <= 0.7 ? a : 0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3)); } x.clip.curve = cv; } // unity below 0.7, smooth knee above
    x.clipIn = g(1); x.clipOut = g(1);
    // Mid/side: width + 3D surround (delayed side signal)
    x.split = c.createChannelSplitter(2); x.merge = c.createChannelMerger(2);
    x.m = g(0.5); x.sL = g(0.5); x.sR = g(-0.5); x.side = g(1); x.oL = g(1); x.oR = g(1); x.inv = g(-1);
    x.sDelay = c.createDelay(0.05); x.sDelay.delayTime.value = 0.014; x.sSur = g(0); x.sSurHp = f('highpass', 300);
    x.split.connect(x.m, 0); x.split.connect(x.m, 1); x.split.connect(x.sL, 0); x.split.connect(x.sR, 1);
    x.sL.connect(x.side); x.sR.connect(x.side);
    x.sL.connect(x.sSurHp); x.sR.connect(x.sSurHp); x.sSurHp.connect(x.sDelay).connect(x.sSur); x.sSur.connect(x.side);
    x.m.connect(x.oL); x.m.connect(x.oR);
    x.side.connect(x.oL); x.side.connect(x.inv); x.inv.connect(x.oR);
    x.oL.connect(x.merge, 0, 0); x.oR.connect(x.merge, 0, 1);
    // Device stage: tilt EQ + headphone crossfeed (low-passed, delayed opposite channel)
    x.dHp = f('highpass', 20, 0.7); x.dLo = f('lowshelf', 120); x.dLm = f('peaking', 500, 0.8); x.dHm = f('peaking', 3000, 0.8); x.dHi = f('highshelf', 8000);
    x.xs = c.createChannelSplitter(2); x.xm = c.createChannelMerger(2);
    x.fL = f('lowpass', 700); x.fR = f('lowpass', 700); x.fdL = c.createDelay(0.01); x.fdR = c.createDelay(0.01);
    x.fdL.delayTime.value = x.fdR.delayTime.value = 0.0003; x.fgL = g(0); x.fgR = g(0);
    x.xs.connect(x.xm, 0, 0); x.xs.connect(x.xm, 1, 1);
    x.xs.connect(x.fL, 0); x.fL.connect(x.fdL).connect(x.fgL).connect(x.xm, 0, 1);
    x.xs.connect(x.fR, 1); x.fR.connect(x.fdR).connect(x.fgR).connect(x.xm, 0, 0);
    x.boost = g(1);
    x.lim = c.createDynamicsCompressor(); x.lim.threshold.value = -1; x.lim.knee.value = 0; x.lim.ratio.value = 20; x.lim.attack.value = 0.002; x.lim.release.value = 0.08;
    x.analyser = c.createAnalyser(); x.analyser.fftSize = 4096; x.analyser.smoothingTimeConstant = 0.85;
    x.input.connect(x.analyser);
    // ITU-R BS.1770 K-weighting for loudness (LUFS-style) measurement
    x.kShelf = f('highshelf', 1500); x.kShelf.gain.value = 4; x.kHp = f('highpass', 38, 0.5);
    x.kAn = c.createAnalyser(); x.kAn.fftSize = 16384;
    x.input.connect(x.kShelf).connect(x.kHp).connect(x.kAn);
    x.input.connect(x.bypass).connect(c.destination);
    x.input.connect(x.wetIn).connect(x.agc).connect(x.hp).connect(x.bass).connect(x.lowmid).connect(x.mid).connect(x.treble)
      .connect(x.geq[0]); x.geq[x.geq.length - 1].connect(x.comp);
    x.geq[x.geq.length - 1].connect(x.exHp).connect(x.exShape).connect(x.exGain).connect(x.comp);
    x.hp.connect(x.beLp).connect(x.beShape).connect(x.beLp2).connect(x.beGain).connect(x.comp);
    x.mbOut.connect(x.makeup).connect(x.split);
    x.merge.connect(x.dHp).connect(x.dLo).connect(x.dLm).connect(x.dHm).connect(x.dHi).connect(x.xs); x.xm.connect(x.boost).connect(x.clipIn).connect(x.clip).connect(x.clipOut).connect(x.lim);
    x.outAn = c.createAnalyser(); x.outAn.fftSize = 2048;
    x.limOut = g(1); x.limOut.connect(c.destination); x.limOut.connect(x.outAn);
    x.lim.connect(x.limOut);
    x.tp = null;
    try {
      c.audioWorklet.addModule(chrome.runtime.getURL('limiter.js')).then(() => {
        const tp = new AudioWorkletNode(c, 'tp-limiter', { outputChannelCount: [2] });
        tp.port.onmessage = e => { x.tpRed = e.data; };
        x.clipOut.disconnect(); x.clipOut.connect(tp).connect(x.limOut); x.tp = tp;
      }).catch(e => console.info('Song Enhancer: using standard limiter', e));
    } catch (e) { /* worklet unavailable: native limiter stays */ }
    return x;
  }

  function set(s) {
    last = s;
    const t = ctx.currentTime, k = cfg.intensity / 100, ramp = (p, v) => p.setTargetAtTime(v, t, 0.25);
    ramp(n.bass.gain, s.bass * k); ramp(n.lowmid.gain, s.lowmid * k); ramp(n.mid.gain, s.mid * k); ramp(n.treble.gain, s.treble * k);
    n.geq.forEach((b, i) => ramp(b.gain, (cfg.eq && cfg.eq[i]) || 0));
    const st = STYLES[cfg.style] || STYLES.broadcast;
    const c = Math.min(1.4, s.comp / 100 * k * st.amt);
    const bandW = [1.0, 0.8, 0.9, 0.7]; // bass gets most control, highs least
    n.bands.forEach((b, i) => {
      ramp(b.cmp.threshold, -Math.min(40, c * 30 * bandW[i])); ramp(b.cmp.ratio, 1 + c * 6 * bandW[i]);
      b.cmp.attack.setValueAtTime(st.atk[i], t); b.cmp.release.setValueAtTime(st.rel[i], t);
      ramp(b.out.gain, Math.pow(10, Math.min(40, c * 30 * bandW[i]) * 0.2 / 20));
    });
    ramp(n.side.gain, Math.max(0, 1 + (s.width / 100 - 1) * k + cfg.uWidth / 100));
    ramp(n.sSur.gain, Math.min(1.2, (s.surround / 100 * k + cfg.uSurround / 100) * 0.9));
    ramp(n.exGain.gain, s.exciter / 100 * 0.45 * k);
    ramp(n.beGain.gain, s.bassEnh / 100 * 0.6 * k);
    ramp(n.boost.gain, Math.pow(10, cfg.uBoost / 20));
    const d = DEVICES[cfg.device] || DEVICES.headphones;
    ramp(n.dHp.frequency, d.hp); ramp(n.dLo.gain, d.lo); ramp(n.dLm.gain, d.lm); ramp(n.dHm.gain, d.hm); ramp(n.dHi.gain, d.hi);
    ramp(n.fgL.gain, d.feed); ramp(n.fgR.gain, d.feed);
  }

  // Adaptive auto mode: measure the live spectrum and steer EQ toward a rich hi-fi target.
  const auto = { bass:3, lowmid:-1, mid:1, treble:3, comp:50, width:125, exciter:30, bassEnh:40, surround:25 };
  function bandDb(spec, lo, hi) {
    const bin = ctx.sampleRate / 2 / spec.length; let s = 0, c = 0;
    for (let i = Math.floor(lo / bin); i <= Math.min(spec.length - 1, Math.ceil(hi / bin)); i++) { s += Math.pow(10, spec[i] / 10); c++; }
    return 10 * Math.log10(s / Math.max(c, 1) + 1e-20);
  }
  function adapt() {
    if (!n || !cfg.enabled || cfg.preset !== 'auto') return;
    const spec = new Float32Array(n.analyser.frequencyBinCount); n.analyser.getFloatFrequencyData(spec);
    const ref = bandDb(spec, 800, 1500); if (!isFinite(ref) || ref < -90) return; // silence
    // Targets slightly brighter and bassier than flat: the "hi-fi smile"
    const target = { bass: [40, 150, 11], lowmid: [250, 600, 2], mid: [2000, 3500, -5], treble: [8000, 14000, -13] };
    for (const [k, [lo, hi, tgt]] of Object.entries(target)) {
      const want = Math.max(-8, Math.min(9, 1.5 + (tgt - (bandDb(spec, lo, hi) - ref)) * 0.7));
      auto[k] += (want - auto[k]) * 0.1;
    }
    auto.exciter = auto.treble > 4 ? 45 : 30;
    auto.bassEnh = auto.bass > 5 ? 60 : 40;
    set(auto);
  }

  // AGC: ride the input toward a consistent loudness
  let agcDb = 0, inDb = -100;
  const obuf = new Float32Array(2048), kbuf = new Float32Array(16384);
  function rmsDb(an) { const tbuf = an.fftSize === 16384 ? kbuf : obuf; an.getFloatTimeDomainData(tbuf); let s = 0; for (const v of tbuf) s += v * v; return 10 * Math.log10(s / tbuf.length + 1e-12); }
  function agcTick() {
    if (!n) return;
    inDb = rmsDb(n.kAn) - 0.691; // approx. LUFS (momentary)
    if (cfg.enabled && cfg.agc && inDb > -50) {
      const want = Math.max(-9, Math.min(9, -16 - inDb)); // target -16 LUFS in
      agcDb += Math.max(-0.4, Math.min(0.4, want - agcDb)); // slow ride
    } else if (!cfg.agc) agcDb = 0;
    n.agc.gain.setTargetAtTime(Math.pow(10, agcDb / 20), ctx.currentTime, 0.5);
  }
  setInterval(() => n && n.tp && n.tp.port.postMessage(0), 100);
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg !== 'meters' || !n) return;
    reply({ on: cfg.enabled, in: inDb, out: rmsDb(n.outAn), agc: agcDb, gr: n.bands.map(b => b.cmp.reduction), lim: n.tp ? (n.tpRed || 0) : n.lim.reduction, tp: !!n.tp, lufs: inDb });
  });

  function apply() {
    if (!n) return;
    const t = ctx.currentTime;
    n.bypass.gain.setTargetAtTime(cfg.enabled ? 0 : 1, t, 0.05);
    n.wetIn.gain.setTargetAtTime(cfg.enabled ? 1 : 0, t, 0.05);
    if (!cfg.enabled) return;
    if (PRESETS[cfg.preset]) set(PRESETS[cfg.preset]); else set(last || auto);
  }

  function hook(el) {
    if (hooked.has(el)) return;
    // Only hook streams we can process; cross-origin files would output silence.
    const src = el.currentSrc || el.src || '';
    if (!src) return;
    if (!src.startsWith('blob:') && new URL(src, location.href).origin !== location.origin && !el.crossOrigin) return;
    hooked.add(el);
    ctx = ctx || new AudioContext();
    if (!n) n = build(ctx);
    try { ctx.createMediaElementSource(el).connect(n.input); } catch (e) { console.warn('Song Enhancer:', e); return; }
    const resume = () => ctx.state !== 'running' && ctx.resume();
    el.addEventListener('play', resume); resume();
    apply();
    clearInterval(timer); timer = setInterval(() => { adapt(); agcTick(); }, 250);
  }

  const scan = () => document.querySelectorAll('video, audio').forEach(el => { if (!el.paused || el.readyState > 0) hook(el); });
  document.addEventListener('play', e => { if (e.target instanceof HTMLMediaElement) hook(e.target); }, true);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.sync.get(DEF, v => { cfg = v; apply(); scan(); });
  chrome.storage.onChanged.addListener(ch => { for (const k in ch) cfg[k] = ch[k].newValue; apply(); });
})();
