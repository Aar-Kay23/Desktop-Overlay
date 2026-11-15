import { describe, it, expect } from 'vitest';
import { generateInitialSnapshot, advanceMockStep } from '../lib/mockData';

describe('Mock Data Generator & Stepper', () => {
  it('generates a full initial snapshot with all expected domains', () => {
    const snap = generateInitialSnapshot();
    expect(snap.cpu.loadPct).toBeGreaterThan(0);
    expect(snap.cpu.history.length).toBe(30);
    expect(snap.gpu.vramUsedMb).toBeLessThanOrEqual(snap.gpu.vramTotalMb);
    expect(snap.memory.pct).toBeGreaterThan(0);
    expect(snap.quotas.length).toBe(3);
    expect(snap.media.title).toBeDefined();
    expect(snap.topProcesses.length).toBeGreaterThan(0);
  });

  it('advances simulation steps within realistic physical bounds', () => {
    const initial = generateInitialSnapshot();
    const next = advanceMockStep(initial);

    expect(next.cpu.loadPct).toBeGreaterThanOrEqual(12);
    expect(next.cpu.loadPct).toBeLessThanOrEqual(95);
    expect(next.cpu.history.length).toBe(30);

    expect(next.gpu.loadPct).toBeGreaterThanOrEqual(15);
    expect(next.gpu.loadPct).toBeLessThanOrEqual(99);

    expect(next.memory.pct).toBeGreaterThanOrEqual(45);
    expect(next.memory.pct).toBeLessThanOrEqual(88);
  });
});

