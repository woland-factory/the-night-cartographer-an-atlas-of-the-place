import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { copy } from "../copy";
import { todayLocalISO } from "../lib/date";
import type { Place, Point, World } from "../model/atlas";
import { placeLedger } from "../model/ledger";
import { MAX_BODY } from "../model/schema";
import { addEntry } from "../state/atlasStore";

// The entry composer: a modal sheet (bottom sheet at phone widths, centered
// dialog on wider screens) that pins a dated dream to a place. It holds three
// things and nothing else: the dream text, the date, and the place.
//
// Body and date are local state, preserved across the "New place" drop detour
// because the component stays mounted while the canvas captures the point.
// Visibility, the selected place, and the drop mode are owned by WorldView so
// the same sheet opens from the button and from the recall panel's "Write a
// dream here" action.

interface EntryComposerProps {
  world: World;
  placeId: string | null;
  mode: "compose" | "dropping";
  capturedPoint: Point | null;
  onSelectPlace: (placeId: string) => void;
  onStartDrop: () => void;
  onCancelDrop: () => void;
  onConfirmNewPlace: (name: string) => void;
  // Called after a successful save with the pinned place id, so the world
  // view can open that place's recall panel in the same gesture.
  onSaved: (placeId: string) => void;
  onClose: () => void;
}

const FOCUSABLE =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

// Most-recently-visited first, so the likely place is the first, largest tap
// target. We never auto-select: a wrong pin is invisible now and wrong forever
// in recall, so an explicit tap is required.
function orderPlaces(world: World): Place[] {
  return [...world.places].sort((a, b) => {
    const ka = placeLedger(world.entries, a.id).lastVisit ?? a.createdAt;
    const kb = placeLedger(world.entries, b.id).lastVisit ?? b.createdAt;
    if (ka !== kb) return ka < kb ? 1 : -1;
    return 0;
  });
}

export function EntryComposer({
  world,
  placeId,
  mode,
  capturedPoint,
  onSelectPlace,
  onStartDrop,
  onCancelDrop,
  onConfirmNewPlace,
  onSaved,
  onClose,
}: EntryComposerProps) {
  const [body, setBody] = useState("");
  const [date, setDate] = useState(() => todayLocalISO(new Date()));
  const [newPlaceName, setNewPlaceName] = useState("");

  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<Element | null>(null);

  const orderedPlaces = useMemo(() => orderPlaces(world), [world]);
  const maxDate = todayLocalISO(new Date());

  const bodyReady = body.trim().length > 0;
  const canSave = bodyReady && placeId !== null;
  const helper = !bodyReady
    ? copy.composer.needBody
    : placeId === null
      ? copy.composer.needPlace
      : "";

  // Remember the opener and restore focus to it when the composer closes.
  useEffect(() => {
    openerRef.current = document.activeElement;
    return () => {
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  // Autofocus the dream text on entering compose so the keyboard rises at once.
  useEffect(() => {
    if (mode === "compose") textareaRef.current?.focus();
  }, [mode]);

  // Focus the name field the moment a point is captured.
  useEffect(() => {
    if (mode === "dropping" && capturedPoint) nameRef.current?.focus();
  }, [mode, capturedPoint]);

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

  function handleSave() {
    if (!canSave || placeId === null) return;
    addEntry(world.id, placeId, date, body);
    onSaved(placeId);
  }

  function handleConfirmNewPlace() {
    if (!newPlaceName.trim()) return;
    onConfirmNewPlace(newPlaceName);
    setNewPlaceName("");
  }

  // Drop detour: a slim bar (no scrim) so the map behind stays tappable.
  if (mode === "dropping") {
    return (
      <div className="drop-bar" aria-label={copy.composer.newPlace}>
        {capturedPoint === null ? (
          <div className="drop-bar__row">
            <p className="drop-bar__hint">{copy.composer.dropHint}</p>
            <button type="button" className="btn btn--ghost" onClick={onCancelDrop}>
              {copy.composer.cancel}
            </button>
          </div>
        ) : (
          <form
            className="drop-bar__form"
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmNewPlace();
            }}
          >
            <label className="field">
              <span className="field__label">
                {copy.composer.newPlaceNameLabel}
              </span>
              <input
                ref={nameRef}
                className="input"
                type="text"
                value={newPlaceName}
                placeholder={copy.composer.newPlaceNamePlaceholder}
                maxLength={200}
                onChange={(e) => setNewPlaceName(e.target.value)}
              />
            </label>
            <div className="row">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={!newPlaceName.trim()}
              >
                {copy.composer.newPlaceConfirm}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onCancelDrop}
              >
                {copy.composer.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    );
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
            {copy.composer.title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={copy.composer.close}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="sheet__body">
          <label className="field">
            <span className="field__label">{copy.composer.bodyLabel}</span>
            <textarea
              ref={textareaRef}
              className="input textarea"
              value={body}
              placeholder={copy.composer.bodyPlaceholder}
              maxLength={MAX_BODY}
              rows={5}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">{copy.composer.dateLabel}</span>
            <input
              className="input"
              type="date"
              value={date}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="field" role="group" aria-label={copy.composer.placeLabel}>
            <span className="field__label">{copy.composer.placeLabel}</span>
            {world.places.length > 0 ? (
              <div className="chips">
                {orderedPlaces.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip-btn"
                    aria-pressed={placeId === p.id}
                    onClick={() => onSelectPlace(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="chip-btn chip-btn--new"
                  onClick={onStartDrop}
                >
                  {copy.composer.newPlace}
                </button>
              </div>
            ) : (
              <div className="place-empty">
                <p className="place-empty__title">
                  {copy.composer.emptyPlacesTitle}
                </p>
                <p className="place-empty__body">
                  {copy.composer.emptyPlacesBody}
                </p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={onStartDrop}
                >
                  {copy.composer.newPlace}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="sheet__actions">
          {helper && <p className="sheet__helper">{helper}</p>}
          <div className="row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canSave}
              onClick={handleSave}
            >
              {copy.composer.save}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {copy.composer.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
