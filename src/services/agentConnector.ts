import type { SystemSnapshot, ClaudeApprovalRequest, ProcessItem, AiProviderQuotas, DiskMetric } from '../types/telemetry';

export class AgentConnector {
  private eventSource: EventSource | null = null;
  private isConnected = false;
  private baseUrl: string;

  constructor(baseUrl = 'http://127.0.0.1:8765') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public connect(
    onData: (data: Partial<SystemSnapshot>) => void,
    onStatusChange: (connected: boolean) => void,
    onApprovals?: (approvals: ClaudeApprovalRequest[]) => void
  ): () => void {
    try {
      if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
        onStatusChange(false);
        return () => {};
      }

      this.eventSource = new EventSource(`${this.baseUrl}/api/stream`);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        onStatusChange(true);
        // Initial fetch of auxiliary data
        this.fetchApprovals().then((apps) => onApprovals?.(apps)).catch(() => {});
      };

      this.eventSource.onerror = () => {
        if (this.isConnected) {
          this.isConnected = false;
          onStatusChange(false);
        }
      };

      this.eventSource.addEventListener('state', (event) => {
        try {
          const raw = JSON.parse(event.data);
          const mapped = this.mapState(raw);
          onData(mapped);
        } catch (err) {
          console.error('Failed to parse agent state event', err);
        }
      });

      this.eventSource.addEventListener('work', (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.sessions) {
            // Sessions can be mapped to active workloads
          }
        } catch (err) {
          console.error('Failed to parse agent work event', err);
        }
      });

      this.eventSource.addEventListener('event', (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.name === 'approval' || raw.name === 'notify') {
            this.fetchApprovals().then((apps) => onApprovals?.(apps)).catch(() => {});
          }
        } catch (err) {
          console.error('Failed to parse agent push event', err);
        }
      });

    } catch (err) {
      console.warn('Agent stream connection failed, falling back to offline mode', err);
      onStatusChange(false);
    }

    return () => {
      this.disconnect();
    };
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  public async fetchApprovals(): Promise<ClaudeApprovalRequest[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/approvals`, {
        headers: { 'X-PhoneBox-Client': 'desktop' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((item: any) => ({
        id: item.id || `appr-${Date.now()}`,
        source: item.source || 'Claude Code',
        project: item.project || 'Active Session',
        tool: item.tool || 'Bash Command',
        description: item.description || item.tool || '',
        detail: item.detail,
        timestamp: item.timestamp || Date.now(),
      }));
    } catch {
      return [];
    }
  }

  public async fetchProcesses(): Promise<ProcessItem[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/procs?top=10`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.groups || []).map((g: any, idx: number) => ({
        pid: g.pid || idx + 1000,
        name: g.name || 'process',
        cpuPct: g.cpu ?? 0,
        memMb: g.memMb ?? (g.mem ? Math.round(g.mem / 1024 / 1024) : 0),
        instances: g.count ?? 1,
      }));
    } catch {
      return [];
    }
  }

  public async fetchQuotas(): Promise<AiProviderQuotas[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/quotas`);
      if (!res.ok) return [];
      const data = await res.json();
      const providers = data.providers || [];
      return providers.map((p: any) => ({
        provider: p.id === 'antigravity' ? 'antigravity' : p.id === 'claude' ? 'claude' : 'codex',
        displayName: p.name || p.id,
        planName: p.plan || 'Active',
        activeModel: p.model || 'Standard',
        sessionLimit: {
          label: p.limits?.[0]?.name || 'Session Limit',
          usedPct: p.limits?.[0]?.usedPct ?? 50,
          usedUnits: p.limits?.[0]?.used ?? 0,
          maxUnits: p.limits?.[0]?.total ?? 100,
          unitName: '%',
          resetsInHours: p.limits?.[0]?.resetHours,
        },
        weeklyLimit: {
          label: p.limits?.[1]?.name || 'Weekly Pool',
          usedPct: p.limits?.[1]?.usedPct ?? 30,
          usedUnits: p.limits?.[1]?.used ?? 0,
          maxUnits: p.limits?.[1]?.total ?? 100,
          unitName: '%',
          resetsInHours: p.limits?.[1]?.resetHours,
        },
        burnRateTokensPerMin: p.burnRate,
      }));
    } catch {
      return [];
    }
  }

  public async decideApproval(id: string, decision: 'allow' | 'deny'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/approvals/${encodeURIComponent(id)}?decision=${decision}`, {
        method: 'POST',
        headers: { 'X-PhoneBox-Client': 'desktop' }
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async controlMedia(action: 'playpause' | 'next' | 'prev'): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/media/${action}`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async setVolume(level: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/volume?level=${Math.round(level)}`, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async killProcess(name?: string, pid?: number): Promise<boolean> {
    try {
      const url = pid ? `${this.baseUrl}/api/procs/kill?pid=${pid}` : `${this.baseUrl}/api/procs/kill?name=${encodeURIComponent(name || '')}`;
      const res = await fetch(url, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private mapState(raw: any): Partial<SystemSnapshot> {
    const pc = raw.pc || {};
    const media = raw.media || {};
    const gpus = pc.gpus || [];
    const primaryGpu = gpus[0] || {};

    const disks: DiskMetric[] = (pc.disks || []).map((d: any) => ({
      mount: d.mount || d.letter || 'C:',
      name: d.name || 'Drive',
      usedGb: Math.round((d.usedBytes ?? 0) / (1024 ** 3)),
      totalGb: Math.round((d.totalBytes ?? 0) / (1024 ** 3)),
      pct: d.totalBytes ? Math.round(((d.usedBytes ?? 0) / d.totalBytes) * 100) : 50,
    }));

    return {
      timestamp: raw.ts || Date.now(),
      hostname: raw.host || 'LOCAL-PC',
      cpu: {
        loadPct: pc.cpu ?? 0,
        tempC: pc.cputemp,
        freqGhz: pc.cpufreq ? pc.cpufreq / 1000 : undefined,
        history: [], // context accumulates history
      },
      gpu: {
        name: primaryGpu.name || 'Dedicated GPU',
        loadPct: primaryGpu.load ?? (pc.gpu ?? 0),
        vramUsedMb: primaryGpu.memUsedMb ?? (pc.vram ? pc.vram * 1024 : 0),
        vramTotalMb: primaryGpu.memTotalMb ?? 8192,
        tempC: primaryGpu.temp ?? pc.gputemp,
        hotspotC: primaryGpu.hotspot,
        powerWatts: primaryGpu.power,
        history: [],
      },
      memory: {
        usedMb: pc.ramUsedMb ?? ((pc.ram ?? 0) * 163.84),
        totalMb: pc.ramTotalMb ?? 16384,
        pct: pc.ram ?? 0,
        history: [],
      },
      network: {
        downMbps: pc.down ? (pc.down * 8) / (1024 * 1024) : 0,
        upMbps: pc.up ? (pc.up * 8) / (1024 * 1024) : 0,
        pingMs: raw.ping?.rtt ?? 12,
        historyDown: [],
        historyUp: [],
      },
      disks: disks.length > 0 ? disks : undefined,
      media: {
        title: media.title || 'No active media',
        artist: media.artist || '',
        album: media.album,
        isPlaying: media.playing ?? false,
        positionSec: media.positionSec ?? 0,
        durationSec: media.durationSec ?? 180,
        volumePct: raw.audio?.volume ?? 50,
        isMuted: raw.audio?.muted ?? false,
        albumArtUrl: media.hasArt ? `${this.baseUrl}/api/art?t=${Date.now()}` : undefined,
      },
    };
  }
}
