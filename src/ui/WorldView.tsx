import { useMemo, useState } from "react";
import { copy } from "../copy";
import type { Point, World } from "../model/atlas";
import { buildRecallIndex } from "../model/recallIndex";
import { currentShapes } from "../model/strata";
import { hasSeenRecallHint, markRecallHintSeen } from "../lib/firstRun";
import { addPlaceAtPoint, closeWorld, getState } from "../state/atlasStore";
import { useSaveStatus } from "../state/useSaveStatus";
import { saveToFile } from "../persistence/file";
import { EntryComposer } from "./EntryComposer";
import { MapCanvas } from "./MapCanvas";
import { RecallPanel } from "./RecallPanel";
import { TimeScrub } from "./TimeScrub";
import { VisitLedger } from "./VisitLedger";

// Exactly one sheet is open at a time: the recall panel, the composer, or
// the composer's drop-a-new-place detour. The map behind an open sheet is
// inert.
type View =
  | { kind: "none" }
  | { kind: "recall"; placeId: string }
  | { kind: "compose"; placeId: string | null }
  | { kind: "dropping"; placeId: string | null; capturedPoint: Point | null };

export function WorldView({ world }: { world: World }) {
  const [view, setView] = useState<View>({ kind: "none" });
  // The viewed stratum index; null means "now" (the current map). Plain React
  // state: scrubbing never calls the store, so no autosave is scheduled and the
  // atlas object is untouched. WorldView is keyed by world.id in App, so this
  // resets to now whenever the active world changes.
  const [viewedStratum, setViewedStratum] = useState<number | null>(null);
  const [hintSeen, setHintSeen] = useState(() => hasSeenRecallHint());
  const saveStatus = useSaveStatus();

  // The defensive `?? null` clamps a stale index to "now" rather than crashing.
  const viewedShapes =
    viewedStratum === null
      ? null
      : (world.strata[viewedStratum]?.shapes ?? null);

  // Built once per world identity and memoized: a tap never rebuilds it, so
  // opening recall is an O(1) lookup plus a render at any corpus size. Only
  // a write changes `world` and rebuilds, off the tap path.
  const index = useMemo(() => buildRecallIndex(world), [world]);

  // Brand-new world (nothing drawn and no places): drawing a district is the
  // intended first step and mints the first place, so the map's own CTA stays
  // the single primary. Once there is anything to pin to, "Write a dream" is
  // the world view's one primary action.
  const hasShapes = currentShapes(world).length > 0;
  const showWriteDream = world.places.length > 0 || hasShapes;

  // One dismissible sentence pointing at the signature moment. Gone for good
  // after the first recall open or an explicit dismiss.
  const showHint =
    view.kind === "none" && !hintSeen && index.ledger.some((r) => r.count > 0);

  function dismissHint() {
    markRecallHintSeen();
    setHintSeen(true);
  }

  function openRecall(placeId: string) {
    if (!hintSeen) dismissHint();
    setView({ kind: "recall", placeId });
  }

  function openCompose(placeId: string | null) {
    // Every write lands on the current map: return to now before the composer
    // opens. This one reset covers the world-view button, the recall panel's
    // "Write a dream here", and the drop-a-new-place detour (reachable only from
    // the composer).
    setViewedStratum(null);
    setView({ kind: "compose", placeId });
  }

  function closeSheet() {
    setView({ kind: "none" });
  }

  function selectPlace(placeId: string) {
    setView((v) =>
      v.kind === "compose" || v.kind === "dropping"
        ? { kind: "compose", placeId }
        : v,
    );
  }

  function startDrop() {
    setView((v) =>
      v.kind === "compose"
        ? { kind: "dropping", placeId: v.placeId, capturedPoint: null }
        : v,
    );
  }

  function cancelDrop() {
    setView((v) =>
      v.kind === "dropping" ? { kind: "compose", placeId: v.placeId } : v,
    );
  }

  function dropPoint(point: Point) {
    setView((v) =>
      v.kind === "dropping" && v.capturedPoint === null
        ? { ...v, capturedPoint: point }
        : v,
    );
  }

  function confirmNewPlace(name: string) {
    if (view.kind !== "dropping" || view.capturedPoint === null) return;
    const id = addPlaceAtPoint(world.id, name, view.capturedPoint);
    if (id) setView({ kind: "compose", placeId: id });
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

  const capturing = view.kind === "dropping" && view.capturedPoint === null;
  const composerOpen = view.kind === "compose" || view.kind === "dropping";

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
          onPickPlace={openRecall}
          pickable={view.kind === "none"}
          viewedShapes={viewedShapes}
        />

        {world.strata.length > 0 && (
          <TimeScrub
            strata={world.strata}
            value={viewedStratum}
            onScrub={setViewedStratum}
          />
        )}

        {showHint && (
          <div className="hint-mark">
            <p className="hint-mark__text">{copy.recall.hint}</p>
            <button type="button" className="btn btn--ghost" onClick={dismissHint}>
              {copy.recall.hintDismiss}
            </button>
          </div>
        )}

        {showWriteDream && (
          <button
            type="button"
            className="btn btn--primary btn--block write-dream"
            onClick={() => openCompose(null)}
          >
            {copy.composer.open}
          </button>
        )}

        {world.places.length > 0 && (
          <VisitLedger index={index} onOpen={openRecall} />
        )}
      </main>

      {composerOpen && (
        <EntryComposer
          world={world}
          placeId={view.placeId}
          mode={view.kind === "dropping" ? "dropping" : "compose"}
          capturedPoint={view.kind === "dropping" ? view.capturedPoint : null}
          onSelectPlace={selectPlace}
          onStartDrop={startDrop}
          onCancelDrop={cancelDrop}
          onConfirmNewPlace={confirmNewPlace}
          onSaved={openRecall}
          onClose={closeSheet}
        />
      )}

      {view.kind === "recall" && (
        <RecallPanel
          recall={index.get(view.placeId)}
          onWriteHere={openCompose}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
