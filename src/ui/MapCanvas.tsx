import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { copy } from "../copy";
import type { Point, Shape, ShapeType, World } from "../model/atlas";
import { pointsToString, smoothPath } from "../model/geometry";
import {
  MAX_LABEL_LENGTH,
  MAX_VERTICES,
  toolFor,
  tokenColor,
  type PaletteToken,
  type StampId,
} from "../model/kit";
import { currentShapes } from "../model/strata";
import {
  commitDistrict,
  commitShape,
  undoLastEdit,
} from "../state/atlasStore";
import { MapKit } from "./MapKit";
import { MapDefs, renderShape } from "./mapRender";

const RETICLE_STEP = 20;
const RETICLE_STEP_LARGE = 100;
const CENTER: Point = { x: 500, y: 500 };

function clamp(n: number): number {
  return Math.max(0, Math.min(1000, n));
}

function newId(): string {
  return crypto.randomUUID();
}

interface MapCanvasProps {
  world: World;
  // When true, the next canvas tap (or reticle + Enter) resolves to a point and
  // calls onDropPoint instead of dropping a drawing vertex. Used by the
  // composer's "New place" flow.
  dropping?: boolean;
  onDropPoint?: (point: Point) => void;
  // Called when a place marker is tapped while not mid-draw and not dropping, so
  // the world view can open that place's recall panel (the map answers back).
  onPickPlace?: (placeId: string) => void;
  // False while a sheet (recall panel or composer) is already open, so markers
  // behind the modal are inert (never a duplicate focus target or a competing
  // accessible name).
  pickable?: boolean;
}

// The drawing surface plus its toolbar. Draw-tool selection, in-progress
// vertices, and the reticle are local state here (transient, never persisted
// until Finish). Committing goes through the store, which appends a stratum.
export function MapCanvas({
  world,
  dropping = false,
  onDropPoint,
  onPickPlace,
  pickable = true,
}: MapCanvasProps) {
  const [tool, setTool] = useState<ShapeType>("district");
  const [token, setToken] = useState<PaletteToken>("ink");
  const [stamp, setStamp] = useState<StampId>("tower");
  const [vertices, setVertices] = useState<Point[]>([]);
  const [reticle, setReticle] = useState<Point>(CENTER);
  const [pendingDistrict, setPendingDistrict] = useState<Shape | null>(null);
  const [pendingLabel, setPendingLabel] = useState<Point | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [labelValue, setLabelValue] = useState("");
  const [focused, setFocused] = useState(false);

  const hintId = useId();
  const canvasRef = useRef<SVGSVGElement>(null);
  const kind = toolFor(tool).kind;
  const shapes = currentShapes(world);
  const busy = pendingDistrict !== null || pendingLabel !== null;
  const drawing = vertices.length > 0;
  const canFinish = kind === "area" ? vertices.length >= 3 : vertices.length >= 2;
  const canUndo = world.strata.length > 0;
  const showEmpty = shapes.length === 0 && !drawing && !busy && !dropping;
  // A marker answers a tap only when nothing is being drawn, named, or dropped,
  // so it never fights the drawing surface or the point-capture gesture.
  const canPick = pickable && !drawing && !busy && !dropping;

  function selectTool(next: ShapeType) {
    setTool(next);
    setToken(toolFor(next).defaultToken);
    setVertices([]);
    setPendingLabel(null);
  }

  function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point {
    const rect = svg.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    return {
      x: clamp(((clientX - rect.left) / w) * 1000),
      y: clamp(((clientY - rect.top) / h) * 1000),
    };
  }

  // A tap or a keyboard Enter both place at a point in canvas space.
  function placeAt(p: Point) {
    // Drop mode is a one-shot capture: the point becomes a place, not a vertex.
    if (dropping) {
      onDropPoint?.(p);
      return;
    }
    if (busy) return;
    if (tool === "stamp") {
      commitShape(world.id, {
        id: newId(),
        type: "stamp",
        geometry: pointsToString([p]),
        styleToken: token,
        text: stamp,
      });
      return;
    }
    if (tool === "label") {
      setPendingLabel(p);
      setLabelValue("");
      return;
    }
    if (vertices.length >= MAX_VERTICES) return;
    setVertices((prev) => [...prev, p]);
  }

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    placeAt(clientToSvg(e.currentTarget, e.clientX, e.clientY));
  }

  function handleKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const step = e.shiftKey ? RETICLE_STEP_LARGE : RETICLE_STEP;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        setReticle((r) => ({ ...r, y: clamp(r.y - step) }));
        break;
      case "ArrowDown":
        e.preventDefault();
        setReticle((r) => ({ ...r, y: clamp(r.y + step) }));
        break;
      case "ArrowLeft":
        e.preventDefault();
        setReticle((r) => ({ ...r, x: clamp(r.x - step) }));
        break;
      case "ArrowRight":
        e.preventDefault();
        setReticle((r) => ({ ...r, x: clamp(r.x + step) }));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        placeAt(reticle);
        break;
      default:
        break;
    }
  }

  function finish() {
    if (!canFinish) return;
    const geometry = pointsToString(vertices);
    if (kind === "area") {
      setPendingDistrict({
        id: newId(),
        type: "district",
        geometry,
        styleToken: token,
      });
      setNameValue("");
      setVertices([]);
      return;
    }
    commitShape(world.id, {
      id: newId(),
      type: tool,
      geometry,
      styleToken: token,
    });
    setVertices([]);
  }

  function confirmName() {
    if (!pendingDistrict) return;
    commitDistrict(world.id, pendingDistrict, nameValue);
    setPendingDistrict(null);
    setNameValue("");
  }

  function skipName() {
    if (!pendingDistrict) return;
    commitDistrict(world.id, pendingDistrict, "");
    setPendingDistrict(null);
    setNameValue("");
  }

  function confirmLabel() {
    if (!pendingLabel) return;
    const text = labelValue.trim().slice(0, MAX_LABEL_LENGTH);
    if (!text) {
      setPendingLabel(null);
      return;
    }
    commitShape(world.id, {
      id: newId(),
      type: "label",
      geometry: pointsToString([pendingLabel]),
      styleToken: token,
      text,
    });
    setPendingLabel(null);
    setLabelValue("");
  }

  const previewColor = tokenColor(token);

  return (
    <div className="map-editor">
      <div className="map-stage">
        <svg
          ref={canvasRef}
          className="map-canvas"
          viewBox="0 0 1000 1000"
          role="application"
          aria-label={copy.map.canvasLabel}
          aria-describedby={hintId}
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <MapDefs />
          <rect className="map-paper" x={0} y={0} width={1000} height={1000} />
          {shapes.map(renderShape)}
          {pendingDistrict && renderShape(pendingDistrict)}

          {world.places.map((place) => {
            const anchor = place.anchor;
            if (!anchor || !("x" in anchor)) return null; // shapeRef/null: no marker
            return canPick ? (
              <g
                key={place.id}
                className="map-marker"
                role="button"
                tabIndex={0}
                aria-label={place.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onPickPlace?.(place.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onPickPlace?.(place.id);
                  }
                }}
              >
                <circle className="map-marker__hit" cx={anchor.x} cy={anchor.y} r={22} />
                <circle className="map-marker__ring" cx={anchor.x} cy={anchor.y} r={11} />
                <circle className="map-marker__dot" cx={anchor.x} cy={anchor.y} r={4.5} />
              </g>
            ) : (
              // Inert and pointer-transparent while drawing or dropping.
              <g key={place.id} className="map-marker map-marker--inert" aria-hidden="true">
                <circle className="map-marker__ring" cx={anchor.x} cy={anchor.y} r={11} />
                <circle className="map-marker__dot" cx={anchor.x} cy={anchor.y} r={4.5} />
              </g>
            );
          })}

          {drawing && (
            <g className="preview" aria-hidden="true">
              <path
                d={smoothPath(vertices, { closed: kind === "area" && canFinish })}
                fill="none"
                stroke={previewColor}
                strokeWidth={3}
                strokeDasharray="6 6"
              />
              {vertices.map((v, i) => (
                <circle key={i} cx={v.x} cy={v.y} r={7} fill={previewColor} />
              ))}
            </g>
          )}

          {!busy && (focused || drawing || dropping) && (
            <g className="reticle" aria-hidden="true">
              <circle cx={reticle.x} cy={reticle.y} r={12} />
              <line
                x1={reticle.x - 20}
                y1={reticle.y}
                x2={reticle.x + 20}
                y2={reticle.y}
              />
              <line
                x1={reticle.x}
                y1={reticle.y - 20}
                x2={reticle.x}
                y2={reticle.y + 20}
              />
            </g>
          )}
        </svg>

        {showEmpty && (
          <div className="map-empty">
            <p className="map-empty__title">{copy.map.empty.title}</p>
            <p className="map-empty__body">{copy.map.empty.body}</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                selectTool("district");
                canvasRef.current?.focus();
              }}
            >
              {copy.map.empty.action}
            </button>
          </div>
        )}
      </div>

      <p className="map-hint" id={hintId}>
        {copy.map.keyboardHint}
      </p>

      {pendingDistrict && (
        <form
          className="map-panel"
          onSubmit={(e) => {
            e.preventDefault();
            confirmName();
          }}
        >
          <label className="field">
            <span className="field__label">{copy.map.nameLabel}</span>
            <input
              className="input"
              type="text"
              value={nameValue}
              placeholder={copy.map.namePlaceholder}
              maxLength={MAX_LABEL_LENGTH}
              onChange={(e) => setNameValue(e.target.value)}
              autoFocus
            />
          </label>
          <div className="row">
            <button type="submit" className="btn btn--primary">
              {copy.map.nameConfirm}
            </button>
            <button type="button" className="btn btn--ghost" onClick={skipName}>
              {copy.map.nameSkip}
            </button>
          </div>
        </form>
      )}

      {pendingLabel && (
        <form
          className="map-panel"
          onSubmit={(e) => {
            e.preventDefault();
            confirmLabel();
          }}
        >
          <label className="field">
            <span className="field__label">{copy.map.labelFieldLabel}</span>
            <input
              className="input"
              type="text"
              value={labelValue}
              placeholder={copy.map.labelPlaceholder}
              maxLength={MAX_LABEL_LENGTH}
              onChange={(e) => setLabelValue(e.target.value)}
              autoFocus
            />
          </label>
          <div className="row">
            <button type="submit" className="btn btn--primary">
              {copy.map.labelConfirm}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setPendingLabel(null)}
            >
              {copy.map.cancel}
            </button>
          </div>
        </form>
      )}

      <MapKit
        tool={tool}
        onSelectTool={selectTool}
        token={token}
        onSelectToken={setToken}
        stamp={stamp}
        onSelectStamp={setStamp}
        drawing={drawing}
        canFinish={canFinish}
        onFinish={finish}
        onUndoPoint={() => setVertices((prev) => prev.slice(0, -1))}
        onCancel={() => setVertices([])}
        canUndo={canUndo}
        onUndo={() => undoLastEdit(world.id)}
      />
    </div>
  );
}
