import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MetricCard } from '../components/ui/MetricCard';
import { CircularGauge } from '../components/ui/CircularGauge';
import { GlassBadge } from '../components/ui/GlassBadge';
import { ProgressBar } from '../components/ui/ProgressBar';

describe('UI Primitives (21st.dev Style)', () => {
  it('renders MetricCard with title, value, unit, and subValue', () => {
    render(
      <MetricCard
        title="Processor"
        value={42}
        unit="%"
        subValue="4.8 GHz"
      />
    );
    expect(screen.getByText('Processor')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByText('4.8 GHz')).toBeInTheDocument();
  });

  it('renders CircularGauge with correct numeric value', () => {
    render(<CircularGauge value={75} label="Session" />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
  });

  it('renders GlassBadge with label', () => {
    render(<GlassBadge label="Active" variant="cyan" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders ProgressBar without crashing', () => {
    const { container } = render(<ProgressBar value={60} color="emerald" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

