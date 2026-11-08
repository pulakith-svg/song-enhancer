const F = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const steps = []; for (const ear of ['L', 'R']) for (const f of F) steps.push({ ear, f });
const $ = id => document.getElementById(id);
let ctx, osc, gain, pan, lfo, i = 0, th = { L: [], R: [] };

function tone(s) {
  if (!ctx) ctx = new AudioContext();
  if (osc) osc.stop();
  osc = ctx.createOscillator(); osc.frequency.value = s.f;
  gain = ctx.createGain(); pan = ctx.createStereoPanner(); pan.pan.value = s.ear === 'L' ? -1 : 1;
  // Pulsed tone (easier to detect than a steady one)
  const pulse = ctx.createGain(); lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 2;
  const lg = ctx.createGain(); lg.gain.value = 0.5; pulse.gain.value = 0.5; lfo.connect(lg).connect(pulse.gain); lfo.start();
  osc.connect(pulse).connect(gain).connect(pan).connect(ctx.destination); osc.start();
  setLvl();
}
function setLvl() { if (gain) gain.gain.setTargetAtTime(Math.pow(10, $('lvl').value / 20), ctx.currentTime, 0.02); }
function show() {
  const s = steps[i];
  $('ear').textContent = s.ear === 'L' ? 'LEFT EAR' : 'RIGHT EAR';
  $('freq').textContent = s.f >= 1000 ? s.f / 1000 + ' kHz' : s.f + ' Hz';
  $('step').textContent = `${i + 1} / ${steps.length}`; $('prog').style.width = (i / steps.length * 100) + '%';
  $('lvl').value = -30; tone(s);
}
function record(v) {
  th[steps[i].ear].push(v); i++;
  if (i < steps.length) return show();
  osc.stop(); lfo.stop(); finish();
}
function finish() {
  // Reference = this person's own best mid-range sensitivity (500 Hz–2 kHz, both ears)
  const mids = [...th.L.slice(1, 4), ...th.R.slice(1, 4)], ref = Math.min(...mids);
  const comp = e => th[e].map(v => Math.round(Math.max(0, Math.min(10, (v - ref - 6) * 0.5)) * 2) / 2);
  const hearing = { L: comp('L'), R: comp('R'), date: Date.now() };
  chrome.storage.sync.set({ hearing });
  $('res').innerHTML = '<tr><th></th>' + F.map(f => `<th>${f >= 1000 ? f / 1000 + 'k' : f}</th>`).join('') + '</tr>' +
    ['L', 'R'].map(e => `<tr><th>${e === 'L' ? 'Left' : 'Right'}</th>${hearing[e].map(v => `<td>${v ? '+' + v : '0'}</td>`).join('')}</tr>`).join('');
  $('test').hidden = true; $('done').hidden = false;
}
$('start').onclick = () => { $('intro').hidden = true; $('test').hidden = false; i = 0; th = { L: [], R: [] }; show(); };
$('lvl').oninput = setLvl;
$('next').onclick = () => record(+$('lvl').value);
$('none').onclick = () => record(-10);
$('redo').onclick = () => { $('done').hidden = true; $('start').click(); };
$('close').onclick = () => window.close();
