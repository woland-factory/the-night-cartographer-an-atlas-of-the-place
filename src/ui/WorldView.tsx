import { useState } from "react";
import { copy } from "../copy";
import type { Place, Point, World } from "../model/atlas";
import { elapsedLabel } from "../lib/elapsed";
import { placeLedger } from "../model/ledger";
import { currentShapes } from "../model/strata";
import {
  addPlaceAtPoint,
  closeWorld,
  getState,
} from "../state/atlasStore";
import { useSaveStatus } from "../state/useSaveStatus";
import { saveToFile } from "../persistence/file";
import { EntryComposer } from "./EntryComposer";
import { MapCanvas } from "./MapCanvas";

type ComposerState =
  | { open: false }
  | {
      open: true;
      mode: "compose" | "dropping";
      placeId: string | null;
      capturedPoint: Point | null;
    };

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
  const [composer, setComposer] = useState<ComposerState>({ open: false });
  const saveStatus = useSaveStatus();

  // Brand-new world (nothing drawn and no places): drawing a district is the
  // intended first step and mints the first place, so the map's own CTA stays
  // the single primary. Once there is anything to pin to, "Write a dream" is
  // the world view's one primary action.
  const hasShapes = currentShapes(world).length > 0;
  const showWriteDream = world.places.length > 0 || hasShapes;

  function openCompose(placeId: string | null) {
    setComposer({ open: true, mode: "compose", placeId, capturedPoint: null });
  }

  function closeComposer() {
    setComposer({ open: false });
  }

  function selectPlace(placeId: string) {
    setComposer((c) =>
      c.open ? { ...c, placeId, mode: "compose", capturedPoint: null } : c,
    );
  }

  function startDrop() {
    setComposer((c) =>
      c.open ? { ...c, mode: "dropping", capturedPoint: null } : c,
    );
  }

  function cancelDrop() {
    setComposer((c) =>
      c.open ? { ...c, mode: "compose", capturedPoint: null } : c,
    );
  }

  function dropPoint(point: Point) {
    setComposer((c) =>
      c.open && c.mode === "dropping" ? { ...c, capturedPoint: point } : c,
    );
  }

  function confirmNewPlace(name: string) {
    if (!composer.open || composer.capturedPoint === null) return;
    const id = addPlaceAtPoint(world.id, name, composer.capturedPoint);
    if (id) {
      setComposer({
        open: true,
        mode: "compose",
        placeId: id,
        capturedPoint: null,
      });
    }
  }

  async function handleSaveToFile() {
    const atlas = getState();
    if (!atlas) return;
    try {
      await saveToFile(atlas);
    } catch {
      // The user dismissed the save dialog. Nothing to do.
    }
  }

  const capturing =
    composer.open &&
    composer.mode === "dropping" &&
    composer.capturedPoint === null;

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
        {saveStatus === "error" && (
          <div className="banner banner--save" role="alert">
            <p className="banner__title">{copy.saveError.title}</p>
            <p className="banner__body">{copy.saveError.body}</p>
            <button type="button" className="btn" onClick={handleSaveToFile}>
              {copy.saveError.action}
            </button>
          </div>
        )}

        <MapCanvas
          world={world}
          dropping={capturing}
          onDropPoint={dropPoint}
          onPickPlace={(placeId) => openCompose(placeId)}
          pickable={!composer.open}
        />

        {showWriteDream && (
          <button
            type="button"
            className="btn btn--primary btn--block write-dream"
            onClick={() => openCompose(null)}
          >
            {copy.composer.open}
          </button>
        )}

        {world.places.length > 0 &&
          world.places.map((place) => (
            <PlaceCard key={place.id} place={place} world={world} />
          ))}
      </main>

      {composer.open && (
        <EntryComposer
          world={world}
          placeId={composer.placeId}
          mode={composer.mode}
          capturedPoint={composer.capturedPoint}
          onSelectPlace={selectPlace}
          onStartDrop={startDrop}
          onCancelDrop={cancelDrop}
          onConfirmNewPlace={confirmNewPlace}
          onClose={closeComposer}
        />
      )}
    </div>
  );
}
