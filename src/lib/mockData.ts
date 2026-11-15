import type { SystemSnapshot } from '../types/telemetry';

const HISTORY_LENGTH = 30;

function createInitialHistory(base: number, variance: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    const val = Math.min(100, Math.max(5, base + (Math.sin(i / 3) * variance) + (Math.random() * 4 - 2)));
    result.push(Math.round(val));
  }
  return result;
}

export function generateInitialSnapshot(): SystemSnapshot {
  return {
    timestamp: Date.now(),
    hostname: 'DESKTOP-NEO-X',
    uptimeHours: 34.6,
    cpu: {
      loadPct: 38,
      tempC: 54,
      freqGhz: 4.85,
      cores: [42, 35, 60, 28, 45, 30, 52, 22],
      history: createInitialHistory(35, 15),
    },
    gpu: {
      name: 'NVIDIA GeForce RTX 4080',
      loadPct: 44,
      vramUsedMb: 6144,
      vramTotalMb: 16384,
      tempC: 58,
      hotspotC: 67,
      powerWatts: 185,
      fanPct: 45,
      history: createInitialHistory(42, 20),
    },
    memory: {
      usedMb: 18432,
      totalMb: 32768,
      pct: 56.2,
      swapUsedMb: 3200,
      swapTotalMb: 8192,
      history: createInitialHistory(56, 3),
    },
    disks: [
      { mount: 'C:', name: 'Samsung NVMe 990 PRO', usedGb: 642, totalGb: 1024, pct: 62.7 },
      { mount: 'D:', name: 'Crucial T700 Gen5', usedGb: 1420, totalGb: 2048, pct: 69.3 },
    ],
    network: {
      downMbps: 48.4,
      upMbps: 12.8,
      pingMs: 14,
      historyDown: createInitialHistory(45, 30),
      historyUp: createInitialHistory(12, 8),
    },
    battery: {
      hasBattery: true,
      percent: 96,
      isCharging: true,
      acConnected: true,
      model: 'DELL PX0GF28',
      voltage: 16.37,
    },
    quotas: [
      {
        provider: 'antigravity',
        displayName: 'Google Antigravity',
        planName: 'Google Ultra / Research',
        activeModel: 'Gemini 3.8 Flash (High)',
        sessionLimit: {
          label: '5-Hour Burst Limit',
          usedPct: 34,
          usedUnits: 170000,
          maxUnits: 500000,
          unitName: 'tokens',
          resetsInHours: 2.4,
        },
        weeklyLimit: {
          label: 'Weekly Allowance',
          usedPct: 52,
          usedUnits: 2600000,
          maxUnits: 5000000,
          unitName: 'tokens',
          resetsInHours: 72,
        },
        burnRateTokensPerMin: 1420,
        projectedDepletionHours: 18.5,
      },
      {
        provider: 'claude',
        displayName: 'Claude Code',
        planName: 'Claude Pro Tier 4',
        activeModel: 'Claude 3.7 Sonnet (Thinking)',
        sessionLimit: {
          label: '5-Hour Rate Limit',
          usedPct: 68,
          usedUnits: 68,
          maxUnits: 100,
          unitName: '% capacity',
          resetsInHours: 1.1,
        },
        weeklyLimit: {
          label: 'Weekly Token Pool',
          usedPct: 41,
          usedUnits: 4100000,
          maxUnits: 10000000,
          unitName: 'tokens',
          resetsInHours: 96,
        },
        burnRateTokensPerMin: 2150,
        projectedDepletionHours: 8.2,
      },
      {
        provider: 'codex',
        displayName: 'OpenAI Codex',
        planName: 'Enterprise Org',
        activeModel: 'o3-mini',
        sessionLimit: {
          label: 'Hourly TPM Pool',
          usedPct: 22,
          usedUnits: 22,
          maxUnits: 100,
          unitName: '% capacity',
          resetsInHours: 0.5,
        },
        weeklyLimit: {
          label: 'Monthly Allowance',
          usedPct: 31,
          usedUnits: 310,
          maxUnits: 1000,
          unitName: 'reqs',
          resetsInHours: 340,
        },
        burnRateTokensPerMin: 680,
      },
    ],
    pendingApprovals: [
      {
        id: 'appr-8821',
        source: 'Claude Code',
        project: 'Desktop-Overlay',
        tool: 'Bash',
        description: 'npm test -- --run',
        detail: 'Execute automated Vitest suite in workspace root',
        timestamp: Date.now() - 45000,
      },
    ],
    media: {
      title: 'Solar Echoes (Synthwave Extended)',
      artist: 'Kavinsky & Daft Punk',
      album: 'OutRun Odyssey',
      isPlaying: true,
      positionSec: 142,
      durationSec: 284,
      volumePct: 65,
      isMuted: false,
      albumArtUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    },
    topProcesses: [
      { pid: 14208, name: 'msedge.exe', cpuPct: 14.2, memMb: 1420, instances: 16 },
      { pid: 9812, name: 'Code.exe', cpuPct: 11.5, memMb: 980, instances: 8 },
      { pid: 22410, name: 'language_server.exe', cpuPct: 7.8, memMb: 720, instances: 2 },
      { pid: 1840, name: 'Spotify.exe', cpuPct: 2.1, memMb: 410, instances: 4 },
      { pid: 6620, name: 'Discord.exe', cpuPct: 1.8, memMb: 520, instances: 3 },
    ],
  };
}

export function advanceMockStep(prev: SystemSnapshot): SystemSnapshot {
  const step = (val: number, min: number, max: number, delta: number) => {
    const next = val + (Math.random() * delta * 2 - delta);
    return Math.min(max, Math.max(min, Math.round(next * 10) / 10));
  };

  const nextCpu = step(prev.cpu.loadPct, 12, 95, 6);
  const nextGpu = step(prev.gpu.loadPct, 15, 99, 8);
  const nextRam = step(prev.memory.pct, 45, 88, 1);
  const nextDown = step(prev.network.downMbps, 2, 280, 15);
  const nextUp = step(prev.network.upMbps, 1, 60, 5);

  const pushHistory = (arr: number[], val: number) => [...arr.slice(1), Math.round(val)];

  // Progress media playback
  let nextPos = prev.media.positionSec;
  if (prev.media.isPlaying) {
    nextPos = (prev.media.positionSec + 1) % prev.media.durationSec;
  }

  return {
    ...prev,
    timestamp: Date.now(),
    cpu: {
      ...prev.cpu,
      loadPct: nextCpu,
      tempC: Math.round(48 + (nextCpu * 0.35)),
      history: pushHistory(prev.cpu.history, nextCpu),
    },
    gpu: {
      ...prev.gpu,
      loadPct: nextGpu,
      tempC: Math.round(50 + (nextGpu * 0.3)),
      powerWatts: Math.round(80 + (nextGpu * 2.2)),
      history: pushHistory(prev.gpu.history, nextGpu),
    },
    memory: {
      ...prev.memory,
      pct: nextRam,
      usedMb: Math.round((prev.memory.totalMb * nextRam) / 100),
      history: pushHistory(prev.memory.history, nextRam),
    },
    network: {
      ...prev.network,
      downMbps: nextDown,
      upMbps: nextUp,
      pingMs: Math.max(8, Math.round(14 + (Math.random() * 8 - 4))),
      historyDown: pushHistory(prev.network.historyDown, nextDown),
      historyUp: pushHistory(prev.network.historyUp, nextUp),
    },
    media: {
      ...prev.media,
      positionSec: nextPos,
    },
  };
}
