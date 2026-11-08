const d = { enabled: true, preset: 'auto', intensity: 70 }, $ = id => document.getElementById(id);
chrome.storage.sync.get(d, v => {
  $('enabled').checked = v.enabled; $('preset').value = v.preset; $('intensity').value = v.intensity; $('iv').textContent = v.intensity + '%';
});
$('enabled').onchange = e => chrome.storage.sync.set({ enabled: e.target.checked });
$('preset').onchange = e => chrome.storage.sync.set({ preset: e.target.value });
$('intensity').oninput = e => { $('iv').textContent = e.target.value + '%'; chrome.storage.sync.set({ intensity: +e.target.value }); };
