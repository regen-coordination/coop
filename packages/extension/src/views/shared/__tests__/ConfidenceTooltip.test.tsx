import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfidenceTooltip } from '../ConfidenceTooltip';

afterEach(cleanup);

describe('ConfidenceTooltip', () => {
  const defaultBreakdown = { schema: 40, content: 35, precedentDelta: 10 };

  it('renders the confidence percentage as a badge', () => {
    render(<ConfidenceTooltip confidence={85} breakdown={defaultBreakdown} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('applies the .badge class to the root element', () => {
    const { container } = render(
      <ConfidenceTooltip confidence={72} breakdown={defaultBreakdown} />,
    );
    expect(container.querySelector('.badge')).toBeInTheDocument();
  });

  it('does not show breakdown tooltip by default', () => {
    render(<ConfidenceTooltip confidence={85} breakdown={defaultBreakdown} />);
    expect(screen.queryByText(/Schema:/)).not.toBeInTheDocument();
  });

  it('shows breakdown tooltip on mouseenter', () => {
    const { container } = render(
      <ConfidenceTooltip confidence={85} breakdown={defaultBreakdown} />,
    );
    const badge = container.querySelector('.badge') as HTMLElement;
    fireEvent.mouseEnter(badge);

    expect(screen.getByText(/Schema: 40%/)).toBeInTheDocument();
    expect(screen.getByText(/Content: 35%/)).toBeInTheDocument();
    expect(screen.getByText(/Precedent: \+10%/)).toBeInTheDocument();
  });

  it('hides breakdown tooltip on mouseleave', () => {
    const { container } = render(
      <ConfidenceTooltip confidence={85} breakdown={defaultBreakdown} />,
    );
    const badge = container.querySelector('.badge') as HTMLElement;
    fireEvent.mouseEnter(badge);
    expect(screen.getByText(/Schema: 40%/)).toBeInTheDocument();

    fireEvent.mouseLeave(badge);
    expect(screen.queryByText(/Schema:/)).not.toBeInTheDocument();
  });

  it('formats the precedent delta with a sign prefix', () => {
    const { container } = render(
      <ConfidenceTooltip
        confidence={90}
        breakdown={{ schema: 50, content: 30, precedentDelta: -5 }}
      />,
    );
    const badge = container.querySelector('.badge') as HTMLElement;
    fireEvent.mouseEnter(badge);
    expect(screen.getByText(/Precedent: -5%/)).toBeInTheDocument();
  });

  it('renders zero confidence correctly', () => {
    render(
      <ConfidenceTooltip confidence={0} breakdown={{ schema: 0, content: 0, precedentDelta: 0 }} />,
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders 100% confidence correctly', () => {
    render(
      <ConfidenceTooltip
        confidence={100}
        breakdown={{ schema: 50, content: 40, precedentDelta: 10 }}
      />,
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
