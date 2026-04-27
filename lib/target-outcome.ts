// Classify application-count targets: **unmet**, **met** (exactly at goal), or **exceeded** (ahead of goal).
// Used by the Targets tab for copy, colours, and accessibility.

export type TargetOutcome = 'unmet' | 'met' | 'exceeded';

export function classifyTargetOutcome(current: number, goal: number): TargetOutcome {
  if (goal < 1) return 'unmet';
  if (current < goal) return 'unmet';
  if (current === goal) return 'met';
  return 'exceeded';
}

/** How many applications still needed to reach goal (0 if met or exceeded). */
export function targetRemaining(current: number, goal: number): number {
  return Math.max(0, goal - current);
}

/** How many applications past the goal (0 if not exceeded). */
export function targetOverBy(current: number, goal: number): number {
  return Math.max(0, current - goal);
}

/** Bar fill width: caps at 100% at goal; optional slight overfill cap for “ahead” feel. */
export function targetProgressFraction(current: number, goal: number): number {
  if (goal < 1) return 0;
  return Math.min(1, current / goal);
}
