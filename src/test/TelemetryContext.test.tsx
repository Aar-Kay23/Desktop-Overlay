import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TelemetryProvider, useTelemetry } from '../context/TelemetryContext';

const TestConsumer: React.FC = () => {
  const { snapshot, mode, setMode, isPinned, togglePin, setVolume, decideApproval } = useTelemetry();

  return (
    <div>
      <span data-testid="mode-val">{mode}</span>
      <span data-testid="cpu-val">{snapshot.cpu.loadPct}</span>
      <span data-testid="pinned-val">{isPinned ? 'pinned' : 'unpinned'}</span>
      <span data-testid="vol-val">{snapshot.media.volumePct}</span>
      <span data-testid="approvals-count">{snapshot.pendingApprovals.length}</span>

      <button onClick={() => setMode('dashboard')}>Switch Mode</button>
      <button onClick={togglePin}>Toggle Pin</button>
      <button onClick={() => setVolume(80)}>Set Vol 80</button>
      <button onClick={() => decideApproval(snapshot.pendingApprovals[0]?.id || '', 'allow')}>
        Approve First
      </button>
    </div>
  );
};

describe('TelemetryContext & State Flow', () => {
  it('provides default telemetry and responds to state mutations', async () => {
    const user = userEvent.setup();

    render(
      <TelemetryProvider>
        <TestConsumer />
      </TelemetryProvider>
    );

    expect(screen.getByTestId('mode-val').textContent).toBe('sidebar');
    expect(screen.getByTestId('pinned-val').textContent).toBe('unpinned');
    expect(Number(screen.getByTestId('approvals-count').textContent)).toBeGreaterThanOrEqual(1);

    // Switch mode
    await user.click(screen.getByText('Switch Mode'));
    expect(screen.getByTestId('mode-val').textContent).toBe('dashboard');

    // Toggle Pin
    await user.click(screen.getByText('Toggle Pin'));
    expect(screen.getByTestId('pinned-val').textContent).toBe('pinned');

    // Set Volume
    await user.click(screen.getByText('Set Vol 80'));
    expect(screen.getByTestId('vol-val').textContent).toBe('80');

    // Approve first approval request
    await user.click(screen.getByText('Approve First'));
    expect(Number(screen.getByTestId('approvals-count').textContent)).toBe(0);
  });
});

