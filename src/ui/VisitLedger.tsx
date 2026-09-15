import { copy, visitsLabel } from "../copy";
import { elapsedLabel } from "../lib/elapsed";
import type { RecallIndex } from "../model/recallIndex";

// The visit ledger: the world view's overview of places ordered by last
// visit, most recent first, unvisited places last. Each row is a button that
// opens the place's recall panel. The full entries live behind the tap: that
// is what makes the map answer back instead of just sitting there.

interface VisitLedgerProps {
  index: RecallIndex;
  onOpen: (placeId: string) => void;
}

export function VisitLedger({ index, onOpen }: VisitLedgerProps) {
  if (index.ledger.length === 0) return null;
  const now = new Date().toISOString();

  return (
    <section className="ledger" aria-label={copy.recall.ledgerHeading}>
      <h2 className="section-heading">{copy.recall.ledgerHeading}</h2>
      <ul className="ledger__list">
        {index.ledger.map((recall) => (
          <li key={recall.place.id}>
            <button
              type="button"
              className="ledger__row"
              onClick={() => onOpen(recall.place.id)}
            >
              <span className="ledger__name">{recall.place.name}</span>
              {recall.count > 0 ? (
                <>
                  <span className="ledger__last">
                    {copy.worldView.lastVisitPrefix}{" "}
                    {elapsedLabel(recall.lastVisit as string, now)}
                  </span>
                  <span className="ledger__meta">
                    {visitsLabel(recall.count)}
                  </span>
                </>
              ) : (
                <span className="ledger__meta">
                  {copy.worldView.placeNoEntries}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
