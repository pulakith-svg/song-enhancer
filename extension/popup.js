const DEF = { enabled:true, preset:'auto', intensity:100, uBass:0, uTreble:0, uVocal:0, uWidth:0, uSurround:0, uBoost:0 };
const SLIDERS = [
  ['h', 'Strength'],
  ['intensity', 'Effect intensity', 0, 150, 5, '%'],
  ['h', 'Your sound'],
  ['uBass', 'Bass', -12, 12, 0.5, ' dB'],
  ['uVocal', 'Vocals', -12, 12, 0.5, ' dB'],
  ['uTreble', 'Treble', -12, 12, 0.5, ' dB'],
  ['uWidth', 'Stereo width', -100, 100, 5, '%'],
  ['uSurround', '3D surround', 0, 100, 5, '%'],
  ['uBoost', 'Volume boost', 0, 9, 0.5, ' dB'],
];
const $ = id => document.getElementById(id), box = $('sliders');
for (const [id, name, min, max, step, unit] of SLIDERS) {
  if (id === 'h') { const h = document.createElement('h2'); h.textContent = name; box.appendChild(h); continue; }
  box.insertAdjacentHTML('beforeend', `<label for="${id}">${name}<span id="v_${id}"></span></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}">`);
  $(id).oninput = e => { show(id, unit, +e.target.value); chrome.storage.sync.set({ [id]: +e.target.value }); };
}
function show(id, unit, v) { $('v_' + id).textContent = (v > 0 && unit.includes('dB') ? '+' : '') + v + unit; }
function load() {
  chrome.storage.sync.get(DEF, v => {
    $('enabled').checked = v.enabled; $('preset').value = v.preset;
    for (const [id, , , , , unit] of SLIDERS) if (id !== 'h') { $(id).value = v[id]; show(id, unit, v[id]); }
  });
}
$('enabled').onchange = e => chrome.storage.sync.set({ enabled: e.target.checked });
$('preset').onchange = e => chrome.storage.sync.set({ preset: e.target.value });
$('reset').onclick = () => chrome.storage.sync.set({ uBass:0, uTreble:0, uVocal:0, uWidth:0, uSurround:0, uBoost:0, intensity:100 }, load);
load();
