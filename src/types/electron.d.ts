export interface ElectronAPI {
  isElectron: boolean;
  onTelemetry: (callback: (data: any) => void) => () => void;
  onModeChange?: (callback: (mode: any) => void) => () => void;
  setInteractive: (interactive: boolean) => void;
  toggleAlwaysOnTop: () => void;
  setOverlayMode?: (mode: string) => void;
  controlMedia?: (action: 'playpause' | 'next' | 'prev') => void;
  setVolume?: (vol: number) => void;
  toggleMute?: () => void;
  systemAction?: (action: 'mute' | 'lock' | 'taskmgr' | 'sleep') => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
