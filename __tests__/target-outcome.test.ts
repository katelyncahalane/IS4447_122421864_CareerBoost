import {
  classifyTargetOutcome,
  targetOverBy,
  targetProgressFraction,
  targetRemaining,
} from '@/lib/target-outcome';

describe('target-outcome', () => {
  it('classifies unmet, met, exceeded', () => {
    expect(classifyTargetOutcome(2, 5)).toBe('unmet');
    expect(classifyTargetOutcome(5, 5)).toBe('met');
    expect(classifyTargetOutcome(7, 5)).toBe('exceeded');
  });

  it('treats invalid goal as unmet', () => {
    expect(classifyTargetOutcome(0, 0)).toBe('unmet');
  });

  it('computes remaining and over-by', () => {
    expect(targetRemaining(2, 5)).toBe(3);
    expect(targetRemaining(5, 5)).toBe(0);
    expect(targetOverBy(7, 5)).toBe(2);
    expect(targetOverBy(3, 5)).toBe(0);
  });

  it('caps progress fraction at 1', () => {
    expect(targetProgressFraction(10, 5)).toBe(1);
    expect(targetProgressFraction(2, 8)).toBe(0.25);
  });
});
