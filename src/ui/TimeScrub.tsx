import { useId, type ChangeEvent } from "react";
import { copy } from "../copy";
import { formatDate } from "../lib/date";
import type { Stratum } from "../model/atlas";

// The time scrub: a control under the map that replays a world's append-only
// strata across their dates. Presentation only. It reads its props and reports
// the scrubbed index; it never touches the store, so scrubbing is a pure
// re-render of a pre-stored snapshot. The newest position reports as `null`
// ("now"), so the caller renders the live map, not a frozen copy of it.

interface TimeScrubProps {
  strata: Stratum[]; // world.strata, append order, length >= 1
  value: number | null; // viewed index; null = now (the last index)
  onScrub: (index: number | null) => void; // reports the last index as null
}

// Array order is the timeline; createdAt is only the label. Format it without
// timezones, exactly as the rest of the app does.
function stratumDate(stratum: Stratum): string {
  return formatDate(stratum.createdAt.slice(0, 10));
}

export function TimeScrub({ strata, value, onScrub }: TimeScrubProps) {
  const inputId = useId();
  if (strata.length === 0) return null;

  // One stratum: a single point in time, stated as such. No range input,
  // nothing draggable, nothing broken.
  if (strata.length === 1) {
    return (
      <section className="time-scrub" aria-label={copy.timeScrub.label}>
        <div className="time-scrub__head">
          <span className="time-scrub__label">{copy.timeScrub.label}</span>
          <span className="time-scrub__readout">
            {`${copy.timeScrub.drawnPrefix} ${stratumDate(strata[0])}`}
          </span>
        </div>
        <div
          className="time-scrub__rail time-scrub__rail--single"
          aria-hidden="true"
        >
          <span className="time-scrub__point" />
        </div>
      </section>
    );
  }

  const max = strata.length - 1;
  const position = value ?? max;
  const isNow = value === null;
  const readout = isNow
    ? copy.timeScrub.now
    : `${copy.timeScrub.viewingPrefix} ${stratumDate(strata[position])}`;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    // The newest position is "now": report it as null so the caller renders the
    // live map, never a frozen snapshot equal to it.
    onScrub(next === max ? null : next);
  }

  return (
    <section className="time-scrub">
      <div className="time-scrub__head">
        <label className="time-scrub__label" htmlFor={inputId}>
          {copy.timeScrub.label}
        </label>
        <span className="time-scrub__readout">{readout}</span>
      </div>
      <input
        id={inputId}
        className="time-scrub__range"
        type="range"
        min={0}
        max={max}
        step={1}
        value={position}
        aria-valuetext={readout}
        onChange={handleChange}
      />
      {!isNow && (
        <button
          type="button"
          className="btn btn--ghost time-scrub__back"
          onClick={() => onScrub(null)}
        >
          {copy.timeScrub.backToNow}
        </button>
      )}
    </section>
  );
}
