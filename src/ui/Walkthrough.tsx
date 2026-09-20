import { copy } from "../copy";

// The guided first-success walk: one imperative line pinned to the control that
// matters right now, plus a subordinate Skip. Presentation-only, mirroring the
// TimeScrub/RecallPanel pattern: no store, no firstRun access, no world access.
// WorldView derives the current step and owns the done-flag write.
//
// A non-modal status region: it announces the changing instruction to a screen
// reader as the step self-ticks, never traps focus, and never blocks the
// controls it points at.

export type WalkStep = "draw" | "write" | "recall";

interface WalkthroughProps {
  step: WalkStep; // the current derived step
  onSkip: () => void; // retires the whole walk
}

export function Walkthrough({ step, onSkip }: WalkthroughProps) {
  return (
    <div className="walk" role="status" aria-live="polite">
      <p className="walk__text">{copy.walkthrough[step]}</p>
      <button type="button" className="btn btn--ghost walk__skip" onClick={onSkip}>
        {copy.walkthrough.skip}
      </button>
    </div>
  );
}
