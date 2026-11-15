const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  onTelemetry: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('telemetry:update', handler);
    return () => ipcRenderer.removeListener('telemetry:update', handler);
  },
  setInteractive: (interactive) => {
    ipcRenderer.send('set-interactive', interactive);
  },
  toggleAlwaysOnTop: () => {
    ipcRenderer.send('toggle-always-on-top');
  },
  controlMedia: (action) => {
    ipcRenderer.send('media:control', action);
  },
  systemAction: (action) => {
    ipcRenderer.send('system:action', action);
  },
});

