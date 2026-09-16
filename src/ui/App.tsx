import { copy } from "../copy";
import { useAtlas } from "../state/useAtlas";
import { WorldList } from "./WorldList";
import { WorldView } from "./WorldView";

// A loading placeholder that holds the layout steady until the store's first
// read resolves. It mirrors the inline shell in index.html, so there is no
// blank flash between the shell and real content.
function LoadingShell() {
  return (
    <div className="page" aria-hidden="true">
      <p className="wordmark">{copy.wordmark}</p>
      <p className="tagline">{copy.tagline}</p>
      <div className="card" style={{ height: 64 }} />
      <div className="card" style={{ height: 64 }} />
      <div className="card" style={{ height: 64 }} />
    </div>
  );
}

export function App() {
  const atlas = useAtlas();
  if (!atlas) return <LoadingShell />;

  const active =
    atlas.worlds.find((w) => w.id === atlas.settings.activeWorldId) ?? null;

  // Keyed by world id so per-world view state (the open sheet, the time scrub
  // position) resets when the active world changes.
  return active ? (
    <WorldView key={active.id} world={active} />
  ) : (
    <WorldList atlas={atlas} />
  );
}
