import { copy } from "../copy";
import type { Place, World } from "../model/atlas";
import { elapsedLabel } from "../lib/elapsed";
import { placeLedger } from "../model/ledger";
import { closeWorld, openSample } from "../state/atlasStore";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Format a YYYY-MM-DD dream date without touching timezones.
function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function visitsLabel(count: number): string {
  return count === 1
    ? copy.worldView.visitOne
    : `${count} ${copy.worldView.visitManySuffix}`;
}

function PlaceCard({ place, world }: { place: Place; world: World }) {
  const ledger = placeLedger(world.entries, place.id);
  const now = new Date().toISOString();

  return (
    <section className="place" aria-labelledby={`place-${place.id}`}>
      <h2 id={`place-${place.id}`}>{place.name}</h2>

      {ledger.count === 0 ? (
        <p className="muted">{copy.worldView.placeNoEntries}</p>
      ) : (
        <>
          <p className="place__last">
            {copy.worldView.lastVisitPrefix}{" "}
            {elapsedLabel(ledger.lastVisit as string, now)}
          </p>
          <p className="card__meta">{visitsLabel(ledger.count)}</p>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {ledger.entries.map((entry) => (
              <li className="entry" key={entry.id}>
                <p className="entry__date">{formatDate(entry.date)}</p>
                <p className="entry__body">{entry.body}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

export function WorldView({ world }: { world: World }) {
  return (
    <div className="page">
      <div className="toolbar">
        <button type="button" className="linkback" onClick={closeWorld}>
          {copy.worldView.back}
        </button>
      </div>

      <header>
        <h1>
          {world.name}
          {world.isSample && (
            <span className="chip">{copy.worldView.sampleMarker}</span>
          )}
        </h1>
      </header>

      <main>
        {world.places.length === 0 ? (
          <section className="empty">
            <p className="empty__title">{copy.worldView.noPlacesTitle}</p>
            <p className="empty__body">{copy.worldView.noPlacesBody}</p>
            {!world.isSample && (
              <button type="button" className="btn" onClick={openSample}>
                {copy.worldList.openSample}
              </button>
            )}
          </section>
        ) : (
          world.places.map((place) => (
            <PlaceCard key={place.id} place={place} world={world} />
          ))
        )}
      </main>
    </div>
  );
}
