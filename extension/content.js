// Song Enhancer Hi-Fi: routes the page's <video> audio through an enhancement chain.
(() => {
  const PRESETS = {
    auto:  null, // adaptive
    bass:  { bass:6, lowmid:-1, mid:0, treble:1, comp:40, width:105, exciter:5 },
    vocal: { bass:-1, lowmid:-3, mid:4, treble:2.5, comp:45, width:100, exciter:25 },
    warm:  { bass:3, lowmid:2, mid:-1.5, treble:-3, comp:30, width:90, exciter:0 },
    loud:  { bass:3, lowmid:-1, mid:2, treble:3, comp:75, width:120, exciter:20 },
  };
  let cfg = { enabled: true, preset: 'auto', intensity: 70 };
  let ctx, n, hooked = new WeakSet(), timer;

  function build(c) {
    const x = {}, f = (type, freq, q) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = freq; if (q) b.Q.value = q; return b; };
    const g = v => { const k = c.createGain(); k.gain.value = v; return k; };
    x.input = g(1); x.bypass = g(0); x.wetIn = g(1);
    x.hp = f('highpass', 25, 0.7); x.bass = f('lowshelf', 80); x.lowmid = f('peaking', 400, 1);
    x.mid = f('peaking', 2500, 0.9); x.treble = f('highshelf', 10000);
    x.exHp = f('highpass', 3500); x.exShape = c.createWaveShaper(); x.exShape.oversample = '4x';
    const cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const v = i / 511.5 - 1; cv[i] = Math.tanh(3 * v) / Math.tanh(3); } x.exShape.curve = cv;
    x.exGain = g(0);
    x.comp = c.createDynamicsCompressor(); x.comp.knee.value = 10; x.comp.attack.value = 0.01; x.comp.release.value = 0.2;
    x.makeup = g(1);
    // mid/side width
    x.split = c.createChannelSplitter(2); x.merge = c.createChannelMerger(2);
    x.m = g(0.5); x.sL = g(0.5); x.sR = g(-0.5); x.side = g(1); x.oL = g(1); x.oR = g(1); x.inv = g(-1);
    x.split.connect(x.m, 0); x.split.connect(x.m, 1); x.split.connect(x.sL, 0); x.split.connect(x.sR, 1);
    x.sL.connect(x.side); x.sR.connect(x.side); x.m.connect(x.oL); x.m.connect(x.oR);
    x.side.connect(x.oL); x.side.connect(x.inv); x.inv.connect(x.oR);
    x.oL.connect(x.merge, 0, 0); x.oR.connect(x.merge, 0, 1);
    x.lim = c.createDynamicsCompressor(); x.lim.threshold.value = -1; x.lim.knee.value = 0; x.lim.ratio.value = 20; x.lim.attack.value = 0.002; x.lim.release.value = 0.1;
    x.analyser = c.createAnalyser(); x.analyser.fftSize = 4096; x.analyser.smoothingTimeConstant = 0.85;
    x.input.connect(x.analyser);
    x.input.connect(x.bypass).connect(c.destination);
    x.input.connect(x.wetIn).connect(x.hp).connect(x.bass).connect(x.lowmid).connect(x.mid).connect(x.treble).connect(x.comp);
    x.treble.connect(x.exHp).connect(x.exShape).connect(x.exGain).connect(x.comp);
    x.comp.connect(x.makeup).connect(x.split); x.merge.connect(x.lim).connect(c.destination);
    return x;
  }

  function set(s) {
    const t = ctx.currentTime, k = cfg.intensity / 100, ramp = (p, v) => p.setTargetAtTime(v, t, 0.3);
    ramp(n.bass.gain, s.bass * k); ramp(n.lowmid.gain, s.lowmid * k); ramp(n.mid.gain, s.mid * k); ramp(n.treble.gain, s.treble * k);
    const c = s.comp / 100 * k; ramp(n.comp.threshold, -c * 30); ramp(n.comp.ratio, 1 + c * 7); ramp(n.makeup.gain, Math.pow(10, c * 30 * 0.3 / 20));
    ramp(n.side.gain, 1 + (s.width / 100 - 1) * k); ramp(n.exGain.gain, s.exciter / 100 * 0.35 * k);
  }

  // Adaptive auto mode: measure the live spectrum and steer EQ toward a balanced target.
  const auto = { bass:0, lowmid:0, mid:0, treble:0, comp:35, width:112, exciter:15 };
  function bandDb(spec, lo, hi) {
    const bin = ctx.sampleRate / 2 / spec.length; let s = 0, c = 0;
    for (let i = Math.floor(lo / bin); i <= Math.min(spec.length - 1, Math.ceil(hi / bin)); i++) { s += Math.pow(10, spec[i] / 10); c++; }
    return 10 * Math.log10(s / Math.max(c, 1) + 1e-20);
  }
  function adapt() {
    if (!n || !cfg.enabled || cfg.preset !== 'auto') return;
    const spec = new Float32Array(n.analyser.frequencyBinCount); n.analyser.getFloatFrequencyData(spec);
    const ref = bandDb(spec, 800, 1500); if (!isFinite(ref) || ref < -90) return; // silence
    const target = { bass: [40, 150, 8], lowmid: [250, 600, 3], mid: [2000, 3500, -6], treble: [8000, 14000, -16] };
    for (const [k, [lo, hi, tgt]] of Object.entries(target)) {
      const want = Math.max(-5, Math.min(5, (tgt - (bandDb(spec, lo, hi) - ref)) * 0.5));
      auto[k] += (want - auto[k]) * 0.08; // slow, smooth drift
    }
    auto.exciter = auto.treble > 2 ? 28 : 15;
    set(auto);
  }

  function apply() {
    if (!n) return;
    const t = ctx.currentTime;
    n.bypass.gain.setTargetAtTime(cfg.enabled ? 0 : 1, t, 0.05);
    n.wetIn.gain.setTargetAtTime(cfg.enabled ? 1 : 0, t, 0.05);
    if (cfg.enabled && PRESETS[cfg.preset]) set(PRESETS[cfg.preset]);
  }

  function hook(el) {
    if (hooked.has(el)) return;
    // Only hook streams we can legally process; cross-origin files would output silence.
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
    clearInterval(timer); timer = setInterval(adapt, 250);
  }

  const scan = () => document.querySelectorAll('video, audio').forEach(el => { if (!el.paused || el.readyState > 0) hook(el); });
  document.addEventListener('play', e => { if (e.target instanceof HTMLMediaElement) hook(e.target); }, true);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.sync.get(cfg, v => { cfg = v; apply(); scan(); });
  chrome.storage.onChanged.addListener(ch => { for (const k in ch) cfg[k] = ch[k].newValue; apply(); });
})();
