import { copy } from "../copy";
import type { ShapeType } from "../model/atlas";
import {
  PALETTE,
  STAMPS,
  TOOLS,
  type PaletteToken,
  type StampId,
} from "../model/kit";

// The tool palette: a thumb-reachable toolbar with the six tools (single-select
// segmented control), the swatch row, the stamp picker (only when the stamp
// tool is active), the contextual Finish / Undo point / Cancel controls shown
// while a shape is in progress, and Undo for the last committed edit. All state
// lives in MapCanvas; this component is presentational.

interface MapKitProps {
  tool: ShapeType;
  onSelectTool: (tool: ShapeType) => void;
  token: PaletteToken;
  onSelectToken: (token: PaletteToken) => void;
  stamp: StampId;
  onSelectStamp: (stamp: StampId) => void;
  drawing: boolean;
  canFinish: boolean;
  onFinish: () => void;
  onUndoPoint: () => void;
  onCancel: () => void;
  canUndo: boolean;
  onUndo: () => void;
}

export function MapKit(props: MapKitProps) {
  const {
    tool,
    onSelectTool,
    token,
    onSelectToken,
    stamp,
    onSelectStamp,
    drawing,
    canFinish,
    onFinish,
    onUndoPoint,
    onCancel,
    canUndo,
    onUndo,
  } = props;

  return (
    <div className="kit">
      <div
        className="kit__tools"
        role="group"
        aria-label={copy.map.kitGroup}
      >
        {TOOLS.map((t) => (
          <button
            key={t.type}
            type="button"
            className="tool"
            aria-pressed={tool === t.type}
            onClick={() => onSelectTool(t.type)}
          >
            {copy.map.tools[t.type]}
          </button>
        ))}
      </div>

      <div
        className="kit__swatches"
        role="group"
        aria-label={copy.map.swatchGroup}
      >
        {PALETTE.map((swatch) => (
          <button
            key={swatch.token}
            type="button"
            className="swatch"
            aria-pressed={token === swatch.token}
            aria-label={copy.map.swatchNames[swatch.token]}
            title={copy.map.swatchNames[swatch.token]}
            onClick={() => onSelectToken(swatch.token)}
          >
            <span
              className="swatch__chip"
              style={{ background: swatch.hex }}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      {tool === "stamp" && (
        <div
          className="kit__stamps"
          role="group"
          aria-label={copy.map.stampGroup}
        >
          {STAMPS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="stamp"
              aria-pressed={stamp === s.id}
              aria-label={copy.map.stampNames[s.id]}
              title={copy.map.stampNames[s.id]}
              onClick={() => onSelectStamp(s.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d={s.path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
      )}

      <div className="kit__actions">
        {drawing ? (
          <>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canFinish}
              onClick={onFinish}
            >
              {copy.map.finish}
            </button>
            <button type="button" className="btn" onClick={onUndoPoint}>
              {copy.map.undoPoint}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              {copy.map.cancel}
            </button>
          </>
        ) : (
          canUndo && (
            <button type="button" className="btn btn--ghost" onClick={onUndo}>
              {copy.map.undo}
            </button>
          )
        )}
      </div>
    </div>
  );
}
