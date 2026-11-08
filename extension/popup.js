let np = { artist: '', title: '' }, lastMeters = null; // used by meters and presets
const DEF = { v:4, enabled:true, matchAB:true, hpEq:null, hearing:null, loudComp:true, presets:{}, artistMap:{}, activePreset:'', preset:'smart', style:'broadcast', agc:true, device:'headphones', intensity:70, eq:[0,0,0,0,0,0,0,0,0,0], uWidth:0, uSurround:0, uBoost:0 };
const MODES = [['smart','Smart'],['auto','Auto'],['pure','Pure'],['cinema','Cinematic'],['epic','Epic'],['hifi','Hi-Fi Studio'],['bass','Bass'],['vocal','Vocal'],['warm','Warm'],['loud','Loud']];
const DEV = [['headphones','Headphones'],['speakers','Speakers'],['laptop','Laptop'],['car','Car']];
const STY = [['gentle','Gentle'],['broadcast','Broadcast'],['club','Club']];
const HZ = ['31','62','125','250','500','1k','2k','4k','8k','16k'];
const EQP = {
  Flat:   [0,0,0,0,0,0,0,0,0,0],
  'V-Shape': [6,5,3,0,-2,-2,0,3,5,6],
  Bass:   [8,7,5,2,0,0,0,0,0,0],
  Vocal:  [-2,-2,-1,0,2,4,5,4,2,0],
  Bright: [0,0,0,0,0,1,2,4,6,7],
  Night:  [-3,-2,-1,0,1,2,2,1,-1,-3],
};
const KNOBS = [['intensity','Effect intensity',0,150,5,'%'],['uBoost','Volume boost',0,9,0.5,' dB'],['uWidth','Stereo width',-100,100,5,'%'],['uSurround','3D surround',0,100,5,'%']];
const $ = id => document.getElementById(id), save = o => chrome.storage.sync.set(o);
let cfg = { ...DEF };

for (const [id, name] of MODES) $('modes').insertAdjacentHTML('beforeend', `<button class="chip" data-mode="${id}">${name}</button>`);
for (const [id, name] of DEV) $('devices').insertAdjacentHTML('beforeend', `<button class="chip" data-device="${id}">${name}</button>`);
for (const [id, name] of STY) $('styles').insertAdjacentHTML('beforeend', `<button class="chip" data-style="${id}">${name}</button>`);
for (const name in EQP) $('eqpresets').insertAdjacentHTML('beforeend', `<button class="chip" data-eq="${name}">${name}</button>`);
HZ.forEach((hz, i) => $('eq').insertAdjacentHTML('beforeend',
  `<div class="band"><span class="db" id="db${i}"></span><input type="range" id="b${i}" min="-12" max="12" step="0.5" aria-label="${hz} Hz"><span class="hz">${hz}</span></div>`));
for (const [id, name, min, max, step] of KNOBS) $('knobs').insertAdjacentHTML('beforeend',
  `<div class="knob"><label for="${id}">${name}<span id="v_${id}"></span></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}"></div>`);

const fmt = (v, u) => (v > 0 && u.includes('dB') ? '+' : '') + v + u;
function eqName() { const m = Object.entries(EQP).find(([, a]) => a.every((v, i) => v === cfg.eq[i])); return m ? m[0] : 'Custom'; }
function render() {
  $('power').classList.toggle('on', cfg.enabled); document.body.classList.toggle('disabled', !cfg.enabled);
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === cfg.preset));
  document.querySelectorAll('[data-style]').forEach(b => b.classList.toggle('active', b.dataset.style === cfg.style));
  $('agc').checked = cfg.agc; $('loudComp').checked = cfg.loudComp;
  $('hearState').textContent = cfg.hearing ? 'Active · ' + new Date(cfg.hearing.date).toLocaleDateString() : 'Not set'; $('hearOff').hidden = !cfg.hearing; $('matchAB').checked = cfg.matchAB;
  $('hpCur').hidden = !cfg.hpEq; if (cfg.hpEq) $('hpName').textContent = '✓ ' + cfg.hpEq.name;
  document.querySelectorAll('[data-device]').forEach(b => b.classList.toggle('active', b.dataset.device === cfg.device));
  const en = eqName(); $('eqname').textContent = en;
  document.querySelectorAll('[data-eq]').forEach(b => b.classList.toggle('active', b.dataset.eq === en));
  cfg.eq.forEach((v, i) => { $('b' + i).value = v; $('db' + i).textContent = v ? fmt(v, '') : '0'; });
  for (const [id, , , , , u] of KNOBS) { $(id).value = cfg[id]; $('v_' + id).textContent = fmt(cfg[id], u); }
}

$('power').onclick = () => { cfg.enabled = !cfg.enabled; save({ enabled: cfg.enabled }); render(); };
$('modes').onclick = e => { const m = e.target.dataset.mode; if (m) { cfg.preset = m; save({ preset: m }); render(); } };
$('styles').onclick = e => { const s = e.target.dataset.style; if (s) { cfg.style = s; save({ style: s }); render(); } };
$('devices').onclick = e => { const d = e.target.dataset.device; if (d) { cfg.device = d; save({ device: d }); render(); } };
$('matchAB').onchange = e => { cfg.matchAB = e.target.checked; save({ matchAB: cfg.matchAB }); };
$('loudComp').onchange = e => { cfg.loudComp = e.target.checked; save({ loudComp: cfg.loudComp }); };
$('hearTest').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('hearing.html') });
$('hearOff').onclick = () => { cfg.hearing = null; save({ hearing: null }); render(); };
$('agc').onchange = e => { cfg.agc = e.target.checked; save({ agc: cfg.agc }); };
$('eqpresets').onclick = e => { const p = e.target.dataset.eq; if (p) { cfg.eq = [...EQP[p]]; save({ eq: cfg.eq }); render(); } };
HZ.forEach((_, i) => $('b' + i).oninput = e => { cfg.eq[i] = +e.target.value; save({ eq: cfg.eq }); render(); });
for (const [id] of KNOBS) $(id).oninput = e => { cfg[id] = +e.target.value; save({ [id]: cfg[id] }); render(); };
$('reset').onclick = () => { cfg = { ...DEF, eq: [...DEF.eq], enabled: cfg.enabled, preset: cfg.preset, style: cfg.style, agc: cfg.agc, device: cfg.device, hpEq: cfg.hpEq, matchAB: cfg.matchAB, hearing: cfg.hearing, loudComp: cfg.loudComp, presets: cfg.presets, artistMap: cfg.artistMap, activePreset: '' }; save(cfg); render(); };

chrome.storage.sync.get(DEF, v => { cfg = v; if (!Array.isArray(cfg.eq) || cfg.eq.length !== 10) cfg.eq = [...DEF.eq]; render(); renderPresets(); });

// Live meters from the active tab
const pct = db => Math.max(0, Math.min(100, (db + 60) / 60 * 100));
function meters(m) {
  if (!m) { $('state').textContent = 'No music playing'; return; }
  lastMeters = m; if (m.nowPlaying && (m.nowPlaying.artist !== np.artist || m.nowPlaying.title !== np.title)) { np = m.nowPlaying; renderPresets(); }
  $('state').textContent = m.on ? (m.genre ? 'Smart · ' + m.genre : 'Processing') : 'Bypassed';
  $('mIn').style.width = pct(m.in) + '%'; $('tIn').textContent = m.in > -90 ? m.in.toFixed(1) + ' dB' : '—';
  $('mOut').style.width = pct(m.out) + '%'; $('tOut').textContent = m.out > -90 ? m.out.toFixed(1) + ' dB' : '—';
  $('mAgc').style.width = (50 + m.agc / 9 * 50) + '%'; $('tAgc').textContent = (m.agc > 0 ? '+' : '') + m.agc.toFixed(1) + ' dB';
  $('mLufs').style.width = pct(m.lufs) + '%'; $('tLufs').textContent = m.lufs > -90 ? m.lufs.toFixed(1) : '—';
  $('limName').textContent = m.tp ? 'TRUE-PK' : 'LIMIT';
  [...m.gr, m.lim].forEach((v, i) => $('g' + i).style.height = Math.min(100, -v / 12 * 100) + '%');
}
function poll() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return meters(null);
    chrome.tabs.sendMessage(tabs[0].id, 'meters', r => { void chrome.runtime.lastError; meters(r); });
  });
}
if (chrome.tabs) { poll(); setInterval(poll, 120); }

// Update check: compare with the latest version published on GitHub
const cur = chrome.runtime.getManifest ? chrome.runtime.getManifest().version : '';
$('ver').textContent = cur;
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
fetch('https://raw.githubusercontent.com/pulakith-svg/song-enhancer/main/extension/manifest.json', { cache: 'no-store' })
  .then(r => r.json()).then(m => {
    if (cur && newer(m.version, cur)) { $('updText').textContent = `Update available: v${m.version}. Download, unzip, then click ⟳ on chrome://extensions.`; $('update').classList.add('show'); }
  }).catch(() => {});

// Headphone correction: search the AutoEQ index and load a parametric profile
const AQ = 'https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/results/';
let hpIndex = null;
async function loadIndex() {
  if (hpIndex) return hpIndex;
  const c = await new Promise(r => chrome.storage.local.get({ aqIndex: null, aqTime: 0 }, r));
  if (c.aqIndex && Date.now() - c.aqTime < 7 * 864e5) return (hpIndex = c.aqIndex);
  $('hpHint').textContent = 'Loading headphone database…';
  const txt = await (await fetch(AQ + 'INDEX.md')).text();
  hpIndex = [...txt.matchAll(/^- \[(.+?)\]\(\.\/(.+?)\) by (.+)$/gm)].map(m => [m[1], m[2], m[3]]);
  chrome.storage.local.set({ aqIndex: hpIndex, aqTime: Date.now() });
  $('hpHint').textContent = hpIndex.length.toLocaleString() + ' models available.';
  return hpIndex;
}
$('hpSearch').oninput = async e => {
  const q = e.target.value.trim().toLowerCase(), list = $('hpList'); list.innerHTML = '';
  if (q.length < 2) return;
  let idx; try { idx = await loadIndex(); } catch { $('hpHint').textContent = 'Could not load the headphone database. Check your connection.'; return; }
  const words = q.split(/\s+/), seen = new Set();
  for (const [name, path, by] of idx) {
    if (!words.every(w => name.toLowerCase().includes(w)) || seen.has(name)) continue;
    seen.add(name);
    const b = document.createElement('button'); b.innerHTML = `${name} <small>· ${by.replace(/ on .*/, '')}</small>`;
    b.onclick = () => pickHp(name, path); list.appendChild(b);
    if (seen.size >= 30) break;
  }
  if (!seen.size) list.innerHTML = '<small style="color:var(--muted);padding:5px">No match. Try just the brand and model number.</small>';
};
async function pickHp(name, path) {
  $('hpHint').textContent = 'Loading ' + name + '…';
  try {
    const file = decodeURIComponent(path.split('/').pop());
    const txt = await (await fetch(AQ + path + '/' + encodeURIComponent(file + ' ParametricEQ.txt'))).text();
    const pre = /Preamp:\s*(-?[\d.]+)/.exec(txt);
    const filters = [...txt.matchAll(/ON (PK|LSC|HSC) Fc (\d+(?:\.\d+)?) Hz Gain (-?[\d.]+) dB Q ([\d.]+)/g)]
      .slice(0, 10).map(m => ({ type: m[1], fc: +m[2], gain: +m[3], q: +m[4] }));
    if (!filters.length) throw 0;
    cfg.hpEq = { name, preamp: pre ? +pre[1] : 0, filters }; save({ hpEq: cfg.hpEq });
    $('hpList').innerHTML = ''; $('hpSearch').value = '';
    $('hpHint').textContent = `Correction for ${name} is active (${filters.length} filters).`; render();
  } catch { $('hpHint').textContent = 'No correction profile found for that entry. Try another one.'; }
}
$('hpClear').onclick = () => { cfg.hpEq = null; save({ hpEq: null }); $('hpHint').textContent = 'Headphone correction is off.'; render(); };

chrome.storage.onChanged && chrome.storage.onChanged.addListener(ch => { if (ch.hearing) { cfg.hearing = ch.hearing.newValue; render(); } });

// Saved presets + per-artist memory
const SNAP = ['preset', 'style', 'device', 'eq', 'intensity', 'uWidth', 'uSurround', 'uBoost', 'agc'];
function renderPresets() {
  const box = $('presetList'); box.innerHTML = '';
  const names = Object.keys(cfg.presets || {});
  if (!names.length) box.innerHTML = '<small style="color:var(--muted)">No saved presets yet. Set the sound you like, name it and press Save.</small>';
  for (const name of names) {
    const d = document.createElement('div'); d.className = 'pc' + (cfg.activePreset === name ? ' active' : '');
    const b = document.createElement('button'); b.textContent = name; b.onclick = () => loadPreset(name);
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = 'Delete'; x.onclick = () => delPreset(name);
    d.append(b, x); box.appendChild(d);
  }
  const a = np.artist.toLowerCase(), mapped = a && cfg.artistMap[a];
  $('np').textContent = np.artist ? `♪ ${np.title || ''} — ${np.artist}` : 'Nothing playing';
  $('artistState').textContent = mapped ? 'Artist: ' + mapped : '';
  $('pArtist').checked = !!(mapped && mapped === cfg.activePreset);
  $('pArtist').disabled = !np.artist || !cfg.activePreset;
}
function loadPreset(name) { const s = cfg.presets[name]; if (!s) return; Object.assign(cfg, s, { activePreset: name }); save({ ...s, activePreset: name }); render(); renderPresets(); }
function delPreset(name) {
  delete cfg.presets[name]; for (const k in cfg.artistMap) if (cfg.artistMap[k] === name) delete cfg.artistMap[k];
  if (cfg.activePreset === name) cfg.activePreset = '';
  save({ presets: cfg.presets, artistMap: cfg.artistMap, activePreset: cfg.activePreset }); renderPresets();
}
$('pSave').onclick = () => {
  const name = $('pName').value.trim(); if (!name) { $('pName').focus(); return; }
  const snap = {}; for (const k of SNAP) snap[k] = cfg[k];
  cfg.presets = { ...cfg.presets, [name]: snap }; cfg.activePreset = name; $('pName').value = '';
  save({ presets: cfg.presets, activePreset: name }); renderPresets();
};
$('pName').onkeydown = e => { if (e.key === 'Enter') $('pSave').click(); };
$('pArtist').onchange = e => {
  const a = np.artist.toLowerCase(); if (!a) return;
  cfg.artistMap = { ...cfg.artistMap }; if (e.target.checked && cfg.activePreset) cfg.artistMap[a] = cfg.activePreset; else delete cfg.artistMap[a];
  save({ artistMap: cfg.artistMap }); renderPresets();
};
// Any manual change means we are no longer exactly on a saved preset
document.addEventListener('input', e => { if (!['pName', 'hpSearch', 'pArtist'].includes(e.target.id) && cfg.activePreset) { cfg.activePreset = ''; save({ activePreset: '' }); renderPresets(); } }, true);
document.addEventListener('click', e => { if (e.target.closest('#modes,#styles,#devices,#eqpresets') && cfg.activePreset) { cfg.activePreset = ''; save({ activePreset: '' }); renderPresets(); } }, true);

// Feedback: open a pre-filled GitHub issue with diagnostics
$('feedback').onclick = () => {
  const m = lastMeters || {};
  const diag = [
    `Version: ${cur}`, `Mode: ${cfg.preset}${m.genre ? ' (Smart detected: ' + m.genre + ')' : ''}`, `Style: ${cfg.style}`, `Device: ${cfg.device}`,
    `Headphone correction: ${cfg.hpEq ? cfg.hpEq.name : 'off'}`, `Hearing profile: ${cfg.hearing ? 'yes' : 'no'}`,
    `Intensity: ${cfg.intensity}%  Boost: ${cfg.uBoost} dB  Width: ${cfg.uWidth}  Surround: ${cfg.uSurround}`,
    `EQ: ${cfg.eq.join(', ')}`, `Meters: ${m.in !== undefined ? `in ${m.in.toFixed(1)} / out ${m.out.toFixed(1)} / limiter ${m.lim.toFixed(1)} dB / ${m.tp ? 'true-peak' : 'standard'} limiter` : 'no music playing'}`,
    `Now playing: ${np.title} — ${np.artist}`, `Browser: ${navigator.userAgent}`,
  ].join('\n');
  const body = `**What do you hear?** (e.g. distorted, too much bass, no difference)\n\n\n**Diagnostics** (filled in automatically)\n\`\`\`\n${diag}\n\`\`\``;
  chrome.tabs.create({ url: 'https://github.com/pulakith-svg/song-enhancer/issues/new?title=' + encodeURIComponent('Sound feedback') + '&body=' + encodeURIComponent(body) });
};
