import { Cpu, Zap, Database, HardDrive, Wifi, Sparkles, Music, Layers, Clock, BatteryCharging } from 'lucide-react';
import type { WidgetType, WidgetDefinition } from '../types/widgets';
import { CpuWidget } from '../components/widgets/CpuWidget';
import { GpuWidget } from '../components/widgets/GpuWidget';
import { MemoryWidget } from '../components/widgets/MemoryWidget';
import { StorageWidget } from '../components/widgets/StorageWidget';
import { NetworkWidget } from '../components/widgets/NetworkWidget';
import { BatteryWidget } from '../components/widgets/BatteryWidget';
import { AiQuotaWidget } from '../components/widgets/AiQuotaWidget';
import { MediaWidget } from '../components/widgets/MediaWidget';
import { ProcessWidget } from '../components/widgets/ProcessWidget';
import { ClockWidget } from '../components/widgets/ClockWidget';

export const WIDGET_CATALOG: Record<WidgetType, WidgetDefinition> = {
  cpu: {
    type: 'cpu',
    title: 'Processor (CPU)',
    description: 'Real-time CPU aggregate utilization, clock frequency, per-core bars, and temperature.',
    category: 'System',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'M',
    component: CpuWidget,
  },
  gpu: {
    type: 'gpu',
    title: 'Graphics (GPU)',
    description: 'Dedicated GPU 3D engine load, VRAM allocation, power wattage, and fan speeds.',
    category: 'System',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'M',
    component: GpuWidget,
  },
  memory: {
    type: 'memory',
    title: 'Memory (RAM)',
    description: 'Physical RAM allocation, pagefile swap usage, and top memory consumers.',
    category: 'System',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'S',
    component: MemoryWidget,
  },
  storage: {
    type: 'storage',
    title: 'Storage Drives',
    description: 'Logical volumes, NVMe solid state drive fill percentage, and free capacity.',
    category: 'System',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'M',
    component: StorageWidget,
  },
  network: {
    type: 'network',
    title: 'Network Radar',
    description: 'Live inbound and outbound throughput sparklines and ping latency.',
    category: 'System',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'M',
    component: NetworkWidget,
  },
  battery: {
    type: 'battery',
    title: 'Power & Battery',
    description: 'Hardware battery percentage, power adapter state, voltage, and health.',
    category: 'System',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'S',
    component: BatteryWidget,
  },
  'ai-quota': {
    type: 'ai-quota',
    title: 'AI Coding Quotas',
    description: 'Antigravity & Claude Code 5-hour rate limits, weekly pools, and token burn rate.',
    category: 'AI & Dev',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'M',
    component: AiQuotaWidget,
  },
  media: {
    type: 'media',
    title: 'Now Playing',
    description: 'Currently playing audio track, album artwork, playback controls, and volume fader.',
    category: 'Media & Info',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'M',
    component: MediaWidget,
  },
  processes: {
    type: 'processes',
    title: 'Top Processes',
    description: 'Live task list of heaviest CPU and memory applications with 1-click termination.',
    category: 'System',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'M',
    component: ProcessWidget,
  },
  clock: {
    type: 'clock',
    title: 'Clock & Time',
    description: 'Minimalist Apple typography clock, system uptime, and global financial time zones.',
    category: 'Media & Info',
    supportedSizes: ['S', 'M', 'L'],
    defaultSize: 'S',
    component: ClockWidget,
  },
};

export const WIDGET_ICONS: Record<WidgetType, typeof Cpu> = {
  cpu: Cpu,
  gpu: Zap,
  memory: Database,
  storage: HardDrive,
  network: Wifi,
  battery: BatteryCharging,
  'ai-quota': Sparkles,
  media: Music,
  processes: Layers,
  clock: Clock,
};

export const DEFAULT_WIDGET_LAYOUT = [
  { id: 'def-1', type: 'clock' as WidgetType, size: 'S' as const },
  { id: 'def-2', type: 'battery' as WidgetType, size: 'S' as const },
  { id: 'def-3', type: 'cpu' as WidgetType, size: 'M' as const },
  { id: 'def-4', type: 'memory' as WidgetType, size: 'S' as const },
  { id: 'def-5', type: 'gpu' as WidgetType, size: 'M' as const },
  { id: 'def-6', type: 'ai-quota' as WidgetType, size: 'M' as const },
  { id: 'def-7', type: 'media' as WidgetType, size: 'M' as const },
  { id: 'def-8', type: 'network' as WidgetType, size: 'M' as const },
];
