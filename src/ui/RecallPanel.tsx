import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { copy, visitsLabel } from "../copy";
import { formatDate } from "../lib/date";
import { elapsedLabel } from "../lib/elapsed";
import type { PlaceRecall } from "../model/recallIndex";

// The recall panel: the signature moment. Tap a place and this sheet (bottom
// sheet at phone widths, centered dialog on wider screens) hands back
// everything written there, newest first, with the time since the last visit.
// A pure read of in-memory state: no fetch, no await, no mutation, so it is
// on screen within the same synchronous render as the tap.

interface RecallPanelProps {
  recall: PlaceRecall; // from index.get(placeId)
  onWriteHere: (placeId: string) => void;
  onClose: () => void;
}

// The newest entries shown before the reveal. A decade-long atlas can hold
// thousands of dated entries at one place, so the list is bounded on open
// (QUALITY BAR §1) while every older morning stays one tap away. Set well
// above what a real dreamer hits, so the reveal is the long-tail escape hatch,
// not a routine step.
export const RECALL_PAGE = 50;

const FOCUSABLE =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

export function RecallPanel({ recall, onWriteHere, onClose }: RecallPanelProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  // Reveal the long tail on demand. The panel remounts per place (keyed by
  // place id in WorldView), so this starts false for every newly tapped place.
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? recall.entries : recall.entries.slice(0, RECALL_PAGE);
  const hiddenCount = recall.count - shown.length;

  // Elapsed labels are computed at render, never stored, so they stay true
  // however long the atlas lives.
  const now = new Date().toISOString();

  // Move focus into the dialog on open; hand it back to the opener (the
  // tapped marker or ledger row) on close.
  useEffect(() => {
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  function trapTab(e: KeyboardEvent) {
    const root = dialogRef.current;
    if (!root) return;
    const list = Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => !(el as HTMLButtonElement).disabled);
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleDialogKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "Tab") {
      trapTab(e);
    }
  }

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="sheet__header">
          <h2 id={titleId} className="sheet__title">
            {recall.place.name}
          </h2>
          <button
            type="button"
            ref={closeRef}
            className="icon-btn"
            aria-label={copy.recall.close}
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="sheet__body">
          {recall.count > 0 ? (
            <>
              <p className="place__last">
                {copy.worldView.lastVisitPrefix}{" "}
                {elapsedLabel(recall.lastVisit as string, now)}
              </p>
              <p className="card__meta">{visitsLabel(recall.count)}</p>
              <ol className="recall-entries">
                {shown.map((entry) => (
                  <li className="entry" key={entry.id}>
                    <p className="entry__date">{formatDate(entry.date)}</p>
                    <p className="entry__elapsed">
                      {elapsedLabel(entry.date, now)}
                    </p>
                    <p className="entry__body">{entry.body}</p>
                  </li>
                ))}
              </ol>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--block"
                  onClick={() => setShowAll(true)}
                >
                  {copy.recall.showEarlier}
                </button>
              )}
            </>
          ) : (
            <div className="recall-empty">
              <p className="recall-empty__title">{copy.recall.emptyTitle}</p>
              <p className="recall-empty__body">{copy.recall.emptyBody}</p>
            </div>
          )}
        </div>

        <div className="sheet__actions">
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => onWriteHere(recall.place.id)}
          >
            {copy.recall.writeHere}
          </button>
        </div>
      </div>
    </div>
  );
}
