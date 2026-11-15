import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelemetryProvider } from '../context/TelemetryContext';
import { WIDGET_CATALOG } from '../lib/widgetRegistry';
import { clampPosition, snapCoordinate, computeAutoLayout } from '../lib/layoutUtils';
import { CpuWidget } from '../components/widgets/CpuWidget';
import { BatteryWidget } from '../components/widgets/BatteryWidget';
import { ClockWidget } from '../components/widgets/ClockWidget';
import { WidgetShell } from '../components/widgets/WidgetShell';
import type { WidgetType } from '../types/widgets';

describe('macOS Modular Widgets System', () => {
  it('registers all 14 core widget types with S, M, L support', () => {
    const requiredTypes: WidgetType[] = [
      'cpu',
      'gpu',
      'memory',
      'storage',
      'network',
      'battery',
      'ai-quota',
      'media',
      'processes',
      'clock',
      'weather',
      'notes',
      'world-clock',
      'quick-actions',
    ];

    for (const type of requiredTypes) {
      const def = WIDGET_CATALOG[type];
      expect(def).toBeDefined();
      expect(def.title).toBeTruthy();
      expect(def.supportedSizes).toContain('S');
      expect(def.supportedSizes).toContain('M');
      expect(def.supportedSizes).toContain('L');
    }
  });

  it('renders CpuWidget in Small, Medium, and Large modes with progressive disclosure', () => {
    const { rerender } = render(
      <TelemetryProvider>
        <CpuWidget size="S" />
      </TelemetryProvider>
    );
    expect(screen.getByText(/GHz/i)).toBeInTheDocument();

    rerender(
      <TelemetryProvider>
        <CpuWidget size="M" />
      </TelemetryProvider>
    );
    expect(screen.getByText(/Active Core Average/i)).toBeInTheDocument();

    rerender(
      <TelemetryProvider>
        <CpuWidget size="L" />
      </TelemetryProvider>
    );
    expect(screen.getByText(/Top Consumers/i)).toBeInTheDocument();
  });

  it('renders BatteryWidget in S, M, L sizes correctly', () => {
    const { rerender } = render(
      <TelemetryProvider>
        <BatteryWidget size="S" />
      </TelemetryProvider>
    );
    expect(screen.getByText(/Power Adapter|On Battery/i)).toBeInTheDocument();

    rerender(
      <TelemetryProvider>
        <BatteryWidget size="M" />
      </TelemetryProvider>
    );
    expect(screen.getByText(/Power Source/i)).toBeInTheDocument();
    expect(screen.getByText(/Normal \(Good\)/i)).toBeInTheDocument();

    rerender(
      <TelemetryProvider>
        <BatteryWidget size="L" />
      </TelemetryProvider>
    );
    expect(screen.getByText(/Voltage/i)).toBeInTheDocument();
    expect(screen.getByText(/Hardware Model/i)).toBeInTheDocument();
  });

  it('renders ClockWidget and displays formatted time and system details', () => {
    render(
      <TelemetryProvider>
        <ClockWidget size="M" />
      </TelemetryProvider>
    );
    expect(screen.getByText(/Uptime/i)).toBeInTheDocument();
  });

  it('renders WidgetShell with size controls and title including V portrait size', () => {
    render(
      <WidgetShell
        id="test-w1"
        title="Test Widget"
        icon={<span>⚡</span>}
        size="V"
        supportedSizes={['S', 'M', 'V', 'L']}
        onResize={() => {}}
        onRemove={() => {}}
        editMode={true}
      >
        <div>Widget Content Inside</div>
      </WidgetShell>
    );

    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByText('Widget Content Inside')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('clamps coordinates safely within viewport bounds', () => {
    // Underflow (negative coordinates)
    const clampedUnder = clampPosition(-50, -20, 164, 164, 1920, 1080);
    expect(clampedUnder.x).toBeGreaterThanOrEqual(20);
    expect(clampedUnder.y).toBeGreaterThanOrEqual(64);

    // Overflow (beyond viewport width/height)
    const clampedOver = clampPosition(3000, 2000, 344, 344, 1920, 1080);
    expect(clampedOver.x).toBeLessThanOrEqual(1920 - 344 - 20);
    expect(clampedOver.y).toBeLessThanOrEqual(1080 - 344 - 20);
  });

  it('snaps coordinates to grid intervals correctly', () => {
    expect(snapCoordinate(22, 20)).toBe(20);
    expect(snapCoordinate(38, 20)).toBe(40);
    expect(snapCoordinate(45, 20)).toBe(40);
  });

  it('computes non-overlapping auto layout positions', () => {
    const layout = computeAutoLayout([
      { id: '1', size: 'M' },
      { id: '2', size: 'S' },
      { id: '3', size: 'M' },
    ], 1200);

    expect(layout.length).toBe(3);
    // Widget 2 should be placed to the right of Widget 1
    expect(layout[1].x).toBeGreaterThan(layout[0].x);
  });
});
