import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfidenceTooltip } from '../ConfidenceTooltip';

const breakdown = {
  schema: 0.9,
  content: 0.75,
  precedentDelta: 0.05,
};

// Tooltip portal renders into [data-tooltip-root]. Provide one in tests.
function renderWithTooltipRoot(ui: React.ReactElement) {
  const root = document.createElement('div');
  root.setAttribute('data-tooltip-root', '');
  document.body.appendChild(root);
  const result = render(ui);
  return { ...result, root };
}

describe('ConfidenceTooltip', () => {
  it('renders confidence percentage as badge text', () => {
    renderWithTooltipRoot(<ConfidenceTooltip confidence={0.87} breakdown={breakdown} />);
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('rounds confidence to nearest integer', () => {
    renderWithTooltipRoot(<ConfidenceTooltip confidence={0.923} breakdown={breakdown} />);
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('applies .badge class to the trigger', () => {
    const { container } = renderWithTooltipRoot(
      <ConfidenceTooltip confidence={0.8} breakdown={breakdown} />,
    );
    expect(container.querySelector('.badge')).toBeInTheDocument();
  });

  it('hides tooltip content when not hovered', () => {
    renderWithTooltipRoot(<ConfidenceTooltip confidence={0.8} breakdown={breakdown} />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover with schema breakdown', () => {
    const { container } = renderWithTooltipRoot(
      <ConfidenceTooltip confidence={0.8} breakdown={breakdown} />,
    );
    const badge = container.querySelector('.badge') as HTMLElement;
    fireEvent.mouseEnter(badge.closest('.coop-tooltip')!);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('tooltip').textContent).toContain('90%');
  });

  it('shows content score in tooltip', () => {
    const { container } = renderWithTooltipRoot(
      <ConfidenceTooltip confidence={0.8} breakdown={breakdown} />,
    );
    fireEvent.mouseEnter(container.querySelector('.coop-tooltip')!);
    expect(screen.getByRole('tooltip').textContent).toContain('75%');
  });

  it('shows precedent delta in tooltip', () => {
    const { container } = renderWithTooltipRoot(
      <ConfidenceTooltip confidence={0.8} breakdown={breakdown} />,
    );
    fireEvent.mouseEnter(container.querySelector('.coop-tooltip')!);
    expect(screen.getByRole('tooltip').textContent).toContain('+5%');
  });

  it('hides tooltip when mouse leaves', () => {
    const { container } = renderWithTooltipRoot(
      <ConfidenceTooltip confidence={0.8} breakdown={breakdown} />,
    );
    const tooltipWrapper = container.querySelector('.coop-tooltip')!;
    fireEvent.mouseEnter(tooltipWrapper);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(tooltipWrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('uses the existing Tooltip component (renders .coop-tooltip wrapper)', () => {
    const { container } = renderWithTooltipRoot(
      <ConfidenceTooltip confidence={0.65} breakdown={breakdown} />,
    );
    expect(container.querySelector('.coop-tooltip')).toBeInTheDocument();
  });
});
