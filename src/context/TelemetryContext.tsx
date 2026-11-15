import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { SystemSnapshot, OverlayMode, ConnectionSource, ClaudeApprovalRequest } from '../types/telemetry';
import { generateInitialSnapshot, advanceMockStep } from '../lib/mockData';
import { AgentConnector } from '../services/agentConnector';

export interface GlassSettings {
  opacity: number;       // 0.20 to 0.95
  blur: number;          // 8 to 40 px
  borderOpacity: number; // 0.04 to 0.30
}

const DEFAULT_GLASS_SETTINGS: GlassSettings = {
  opacity: 0.65,
  blur: 28,
  borderOpacity: 0.09,
};

interface TelemetryContextValue {
  snapshot: SystemSnapshot;
  mode: OverlayMode;
  setMode: (mode: OverlayMode) => void;
  source: ConnectionSource;
  setSource: (source: ConnectionSource) => void;
  agentUrl: string;
  setAgentUrl: (url: string) => void;
  agentOnline: boolean;
  isPinned: boolean;
  togglePin: () => void;
  glassSettings: GlassSettings;
  setGlassSettings: (settings: Partial<GlassSettings>) => void;
  decideApproval: (id: string, decision: 'allow' | 'deny') => Promise<void>;
  controlMedia: (action: 'playpause' | 'next' | 'prev') => Promise<void>;
  setVolume: (level: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  killProcess: (name?: string, pid?: number) => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<SystemSnapshot>(() => generateInitialSnapshot());
  const [mode, setModeState] = useState<OverlayMode>('canvas');

  const setMode = useCallback((newMode: OverlayMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined' && window.electronAPI?.setOverlayMode) {
      window.electronAPI.setOverlayMode(newMode);
    }
  }, []);

  const [source, setSource] = useState<ConnectionSource>('simulation');
  const [agentUrl, setAgentUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem('desktop_overlay_agent_url') || 'http://127.0.0.1:8765';
    } catch {
      return 'http://127.0.0.1:8765';
    }
  });
  const [agentOnline, setAgentOnline] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);

  // Glass customization settings
  const [glassSettings, setGlassSettingsState] = useState<GlassSettings>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_glass_settings');
      return saved ? { ...DEFAULT_GLASS_SETTINGS, ...JSON.parse(saved) } : DEFAULT_GLASS_SETTINGS;
    } catch {
      return DEFAULT_GLASS_SETTINGS;
    }
  });

  const setGlassSettings = useCallback((newSettings: Partial<GlassSettings>) => {
    setGlassSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('desktop_overlay_glass_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Apply glass settings directly to :root CSS variables
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--glass-opacity', String(glassSettings.opacity));
      root.style.setProperty('--glass-blur', `${glassSettings.blur}px`);
      root.style.setProperty('--glass-border-opacity', String(glassSettings.borderOpacity));
    }
  }, [glassSettings]);

  const connector = useMemo(() => new AgentConnector(agentUrl), [agentUrl]);

  const setAgentUrl = useCallback((url: string) => {
    setAgentUrlState(url);
    try {
      localStorage.setItem('desktop_overlay_agent_url', url);
    } catch {}
  }, []);

  // Listen to Electron's real system telemetry when running inside the desktop app
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onTelemetry) {
      const unsub = (window as any).electronAPI.onTelemetry((realData: any) => {
        setSnapshot((prev) => ({
          ...prev,
          ...realData,
          cpu: { ...prev.cpu, ...realData.cpu },
          gpu: { ...prev.gpu, ...realData.gpu },
          memory: { ...prev.memory, ...realData.memory },
          disks: realData.disks && realData.disks.length > 0 ? realData.disks : prev.disks,
          network: { ...prev.network, ...realData.network },
          battery: realData.battery || prev.battery,
          topProcesses: realData.topProcesses && realData.topProcesses.length > 0 ? realData.topProcesses : prev.topProcesses,
          media: {
            ...prev.media,
            ...realData.media,
            albumArtUrl: realData.media?.albumArtUrl || prev.media?.albumArtUrl,
          },
        }));
      });
      return () => unsub();
    }
  }, []);

  // Handle agent streaming ONLY when in live-agent mode
  useEffect(() => {
    if (source !== 'live-agent') {
      setAgentOnline(false);
      return;
    }

    const unsub = connector.connect(
      (partialData) => {
        setSnapshot((prev) => {
          const nextCpu = partialData.cpu?.loadPct ?? prev.cpu.loadPct;
          const nextGpu = partialData.gpu?.loadPct ?? prev.gpu.loadPct;
          const nextRam = partialData.memory?.pct ?? prev.memory.pct;
          const nextDown = partialData.network?.downMbps ?? prev.network.downMbps;
          const nextUp = partialData.network?.upMbps ?? prev.network.upMbps;

          const append = (arr: number[], val: number) => [...arr.slice(1), Math.round(val)];

          return {
            ...prev,
            ...partialData,
            cpu: {
              ...prev.cpu,
              ...partialData.cpu,
              history: append(prev.cpu.history, nextCpu),
            },
            gpu: {
              ...prev.gpu,
              ...partialData.gpu,
              history: append(prev.gpu.history, nextGpu),
            },
            memory: {
              ...prev.memory,
              ...partialData.memory,
              history: append(prev.memory.history, nextRam),
            },
            network: {
              ...prev.network,
              ...partialData.network,
              historyDown: append(prev.network.historyDown, nextDown),
              historyUp: append(prev.network.historyUp, nextUp),
            },
            disks: partialData.disks ?? prev.disks,
            media: {
              ...prev.media,
              ...partialData.media,
            },
          };
        });
      },
      (connected) => {
        setAgentOnline(connected);
      },
      (approvals: ClaudeApprovalRequest[]) => {
        setSnapshot((prev) => ({
          ...prev,
          pendingApprovals: approvals,
        }));
      }
    );

    // Auxiliary polling for live quotas & processes every 5 seconds
    const auxTimer = setInterval(async () => {
      try {
        const [quotas, procs, approvals] = await Promise.all([
          connector.fetchQuotas(),
          connector.fetchProcesses(),
          connector.fetchApprovals(),
        ]);

        setSnapshot((prev) => ({
          ...prev,
          quotas: quotas.length > 0 ? quotas : prev.quotas,
          topProcesses: procs.length > 0 ? procs : prev.topProcesses,
          pendingApprovals: approvals,
        }));
      } catch {}
    }, 5000);

    return () => {
      unsub();
      clearInterval(auxTimer);
    };
  }, [connector, source]);

  // Simulation mode loop: advances mock data smoothly every 1000ms
  useEffect(() => {
    if (source !== 'simulation') return;

    const interval = setInterval(() => {
      setSnapshot((prev) => advanceMockStep(prev));
    }, 1000);

    return () => clearInterval(interval);
  }, [source]);

  const decideApproval = useCallback(
    async (id: string, decision: 'allow' | 'deny') => {
      if (source === 'live-agent') {
        await connector.decideApproval(id, decision);
      }
      setSnapshot((prev) => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals.filter((a: ClaudeApprovalRequest) => a.id !== id),
      }));
    },
    [source, connector]
  );

  const controlMedia = useCallback(async (action: 'playpause' | 'next' | 'prev') => {
    if (typeof window !== 'undefined' && window.electronAPI?.controlMedia) {
      window.electronAPI.controlMedia(action);
    }
    if (source === 'live-agent') {
      await connector.controlMedia(action);
    } else {
      setSnapshot((prev) => {
        if (action === 'playpause') {
          return {
            ...prev,
            media: { ...prev.media, isPlaying: !prev.media.isPlaying },
          };
        }
        return prev;
      });
    }
  }, [source, connector]);

  const setVolume = useCallback(async (level: number) => {
    if (typeof window !== 'undefined' && window.electronAPI?.setVolume) {
      window.electronAPI.setVolume(level);
    }
    if (source === 'live-agent') {
      await connector.setVolume(level);
    }
    setSnapshot((prev) => ({
      ...prev,
      media: { ...prev.media, volumePct: Math.round(level), isMuted: level === 0 },
    }));
  }, [source, connector]);

  const toggleMute = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.toggleMute) {
      window.electronAPI.toggleMute();
    }
    setSnapshot((prev) => ({
      ...prev,
      media: { ...prev.media, isMuted: !prev.media.isMuted },
    }));
  }, []);

  const killProcess = useCallback(async (name?: string, pid?: number) => {
    if (source === 'live-agent') {
      await connector.killProcess(name, pid);
    }
    setSnapshot((prev) => ({
      ...prev,
      topProcesses: prev.topProcesses.filter((p) => (pid !== undefined ? p.pid !== pid : p.name !== name)),
    }));
  }, [source, connector]);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      snapshot,
      mode,
      setMode,
      source,
      setSource,
      agentUrl,
      setAgentUrl,
      agentOnline,
      isPinned,
      togglePin,
      glassSettings,
      setGlassSettings,
      decideApproval,
      controlMedia,
      setVolume,
      toggleMute,
      killProcess,
    }),
    [snapshot, mode, setMode, source, agentUrl, setAgentUrl, agentOnline, isPinned, togglePin, glassSettings, setGlassSettings, decideApproval, controlMedia, setVolume, toggleMute, killProcess]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
};

export const useTelemetry = (): TelemetryContextValue => {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return ctx;
};
