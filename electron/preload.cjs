const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  onTelemetry: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('telemetry:update', handler);
    return () => ipcRenderer.removeListener('telemetry:update', handler);
  },
  onModeChange: (callback) => {
    const handler = (_event, mode) => callback(mode);
    ipcRenderer.on('mode:change', handler);
    return () => ipcRenderer.removeListener('mode:change', handler);
  },
  setInteractive: (interactive) => {
    ipcRenderer.send('set-interactive', interactive);
  },
  toggleAlwaysOnTop: () => {
    ipcRenderer.send('toggle-always-on-top');
  },
  setOverlayMode: (mode) => {
    ipcRenderer.send('set-overlay-mode', mode);
  },
  controlMedia: (action) => {
    ipcRenderer.send('media:control', action);
  },
  setVolume: (vol) => {
    ipcRenderer.send('media:volume', vol);
  },
  toggleMute: () => {
    ipcRenderer.send('media:mute');
  },
  systemAction: (action) => {
    ipcRenderer.send('system:action', action);
  },
  islandResize: (expanded) => {
    ipcRenderer.send('island:resize', expanded);
  },
});
