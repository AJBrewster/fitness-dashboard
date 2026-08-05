// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ScoreRing from './ScoreRing';

describe('ScoreRing', () => {
  it('renders the score as text and sizes the filled arc proportionally to score/max', () => {
    const { getByTestId, container } = render(
      <ScoreRing score={61} colorVar="var(--status-good)" size={84} strokeWidth={9} testId="training-readiness" />,
    );

    expect(getByTestId('training-readiness').textContent).toBe('61');

    const valueCircle = container.querySelector('.score-ring-value');
    const radius = 84 / 2 - 9 / 2; // same center - strokeWidth/2 formula as the component
    const circumference = 2 * Math.PI * radius;
    const [filled] = valueCircle.getAttribute('stroke-dasharray').split(' ').map(Number);

    expect(filled).toBeCloseTo((61 / 100) * circumference, 5);
    expect(valueCircle.getAttribute('stroke')).toBe('var(--status-good)');
  });

  it('clamps a score above max instead of overshooting the ring', () => {
    const { container } = render(<ScoreRing score={150} max={100} colorVar="var(--status-good)" testId="x" />);
    const valueCircle = container.querySelector('.score-ring-value');
    const [filled, remainder] = valueCircle.getAttribute('stroke-dasharray').split(' ').map(Number);
    expect(filled).toBeCloseTo(remainder, 5); // filled === full circumference when clamped
  });

  it('renders an empty ring and a dash for a null score instead of crashing or coercing to 0', () => {
    const { getByTestId, container } = render(
      <ScoreRing score={null} colorVar="var(--status-good)" testId="sleep-score" />,
    );

    expect(getByTestId('sleep-score').textContent).toBe('—');

    const valueCircle = container.querySelector('.score-ring-value');
    const [filled] = valueCircle.getAttribute('stroke-dasharray').split(' ').map(Number);
    expect(filled).toBe(0);
  });
});
