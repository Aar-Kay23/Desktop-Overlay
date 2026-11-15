/**
 * Telemetry and System Metric Data Models for Desktop-Overlay
 */

export interface CpuMetric {
  loadPct: number;
  tempC?: number;
  freqGhz?: number;
  cores?: number[];
  history: number[]; // 30-90 samples for sparkline
}

export interface GpuMetric {
  name: string;
  loadPct: number;
  vramUsedMb: number;
  vramTotalMb: number;
  tempC?: number;
  hotspotC?: number;
  powerWatts?: number;
  fanPct?: number;
  history: number[];
}

export interface MemoryMetric {
  usedMb: number;
  totalMb: number;
  pct: number;
  swapUsedMb?: number;
  swapTotalMb?: number;
  history: number[];
}

export interface DiskMetric {
  mount: string;
  name: string;
  usedGb: number;
  totalGb: number;
  pct: number;
}

export interface NetworkMetric {
  downMbps: number;
  upMbps: number;
  pingMs: number;
  historyDown: number[];
  historyUp: number[];
}

export interface QuotaLimit {
  label: string;
  usedPct: number;
  usedUnits: number;
  maxUnits: number;
  unitName: string;
  resetsInHours?: number;
}

export interface AiProviderQuotas {
  provider: 'antigravity' | 'claude' | 'codex';
  displayName: string;
  planName: string;
  activeModel: string;
  sessionLimit: QuotaLimit;
  weeklyLimit: QuotaLimit;
  burnRateTokensPerMin?: number;
  projectedDepletionHours?: number;
}

export interface ClaudeApprovalRequest {
  id: string;
  source: string;
  project: string;
  tool: string;
  description: string;
  detail?: string;
  timestamp: number;
}

export interface MediaState {
  title: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  volumePct: number;
  isMuted: boolean;
  albumArtUrl?: string;
  sourceApp?: string;
}

export interface ProcessItem {
  pid: number;
  name: string;
  cpuPct: number;
  memMb: number;
  instances: number;
}

export interface BatteryMetric {
  hasBattery: boolean;
  percent: number;
  isCharging: boolean;
  acConnected: boolean;
  model?: string;
  voltage?: number;
}

export interface SystemSnapshot {
  timestamp: number;
  hostname: string;
  uptimeHours: number;
  cpu: CpuMetric;
  gpu: GpuMetric;
  memory: MemoryMetric;
  disks: DiskMetric[];
  network: NetworkMetric;
  battery?: BatteryMetric;
  quotas: AiProviderQuotas[];
  pendingApprovals: ClaudeApprovalRequest[];
  media: MediaState;
  topProcesses: ProcessItem[];
}

export type OverlayMode = 'canvas' | 'sidebar' | 'hud' | 'dashboard' | 'minibar';
export type ConnectionSource = 'live-agent' | 'simulation';

