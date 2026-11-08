// Keyboard shortcut (Alt+Shift+E by default): turn enhancement on/off.
chrome.commands.onCommand.addListener(cmd => {
  if (cmd !== 'toggle-enhance') return;
  chrome.storage.sync.get({ enabled: true }, v => chrome.storage.sync.set({ enabled: !v.enabled }));
});
