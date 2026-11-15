export interface ElectronAPI {
  isElectron: boolean;
  onTelemetry: (callback: (data: any) => void) => () => void;
  setInteractive: (interactive: boolean) => void;
  toggleAlwaysOnTop: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
