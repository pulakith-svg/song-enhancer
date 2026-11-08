// Lookahead true-peak brickwall limiter (AudioWorklet).
class TPLimiter extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'ceiling', defaultValue: -1, minValue: -12, maxValue: 0 }, { name: 'release', defaultValue: 0.25, minValue: 0.01, maxValue: 1 }]; }
  constructor() {
    super();
    this.la = Math.round(sampleRate * 0.005); // 5 ms lookahead
    this.buf = [new Float32Array(this.la + 1), new Float32Array(this.la + 1)];
    this.peak = new Float32Array(this.la + 1); // ring of sample peaks
    this.w = 0; this.gain = 1; this.prev = [0, 0]; this.red = 0; this.n = 0;
    // Monotonic deque for O(1) sliding-window max over the lookahead
    this.dqI = new Int32Array(this.la + 2); this.dqV = new Float32Array(this.la + 2); this.h = 0; this.tl = 0;
    this.port.onmessage = () => this.port.postMessage(this.red);
  }
  process(inputs, outputs, p) {
    const inp = inputs[0], out = outputs[0];
    if (!inp.length) return true;
    const ceil = Math.pow(10, p.ceiling[0] / 20), rel = Math.exp(-1 / (p.release[0] * sampleRate));
    const atk = Math.exp(-1 / (0.002 * sampleRate)), N = this.la + 1, chs = Math.min(2, inp.length);
    let minG = 1;
    for (let i = 0; i < inp[0].length; i++) {
      // Inter-sample (true) peak estimate: sample plus midpoint between samples
      let pk = 0;
      for (let c = 0; c < chs; c++) {
        const x = inp[c][i], mid = 0.5 * (x + this.prev[c]) * 1.12; this.prev[c] = x;
        pk = Math.max(pk, Math.abs(x), Math.abs(mid));
        this.buf[c][this.w] = x;
      }
      this.peak[this.w] = pk;
      // Max peak over the lookahead window (monotonic deque, amortized O(1))
      const cap = this.dqI.length, idx = this.n++;
      while (this.tl !== this.h && this.dqV[(this.tl - 1 + cap) % cap] <= pk) this.tl = (this.tl - 1 + cap) % cap;
      this.dqI[this.tl] = idx; this.dqV[this.tl] = pk; this.tl = (this.tl + 1) % cap;
      while (this.dqI[this.h] <= idx - N) this.h = (this.h + 1) % cap;
      const m = this.dqV[this.h];
      const target = m > ceil ? ceil / m : 1;
      this.gain = target < this.gain ? atk * this.gain + (1 - atk) * target : rel * this.gain + (1 - rel) * target;
      const r = (this.w + 1) % N; // oldest sample = delayed output
      for (let c = 0; c < out.length; c++) {
        const y = this.buf[Math.min(c, chs - 1)][r] * this.gain;
        out[c][i] = Math.max(-ceil, Math.min(ceil, y));
      }
      if (this.gain < minG) minG = this.gain;
      this.w = r;
    }
    this.red = 20 * Math.log10(minG);
    return true;
  }
}
registerProcessor('tp-limiter', TPLimiter);
