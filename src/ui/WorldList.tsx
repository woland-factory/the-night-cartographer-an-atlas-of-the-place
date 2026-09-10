import { useState } from "react";
import { copy } from "../copy";
import type { AtlasFile } from "../model/atlas";
import { importErrorMessage } from "../copy";
import { openFromFile, saveToFile } from "../persistence/file";
import { addWorld, importAtlas, openSample, openWorld } from "../state/atlasStore";

function placesLabel(count: number): string {
  return count === 1
    ? copy.worldList.placesCountOne
    : `${count} ${copy.worldList.placesCountManySuffix}`;
}

export function WorldList({ atlas }: { atlas: AtlasFile }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const worlds = atlas.worlds;

  function submitNewWorld(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addWorld(trimmed);
    setName("");
    setAdding(false);
  }

  async function handleSave() {
    try {
      await saveToFile(atlas);
    } catch {
      // The user dismissed the save dialog. Nothing to do.
    }
  }

  async function handleOpen() {
    setImportError(null);
    const result = await openFromFile();
    if (!result) return; // picker dismissed
    if (result.ok) {
      importAtlas(result.atlas);
    } else {
      setImportError(importErrorMessage(result.reason));
    }
  }

  return (
    <div className="page">
      <header>
        <p className="wordmark">{copy.wordmark}</p>
        <p className="tagline">{copy.tagline}</p>
      </header>

      <main>
        {importError && (
          <div className="banner" role="alert">
            {importError}
          </div>
        )}

        {worlds.length === 0 ? (
          <section className="empty">
            <h1 className="empty__title">{copy.worldList.emptyTitle}</h1>
            <p className="empty__body">{copy.worldList.emptyBody}</p>
            {adding ? (
              <NewWorldForm
                name={name}
                setName={setName}
                onSubmit={submitNewWorld}
                onCancel={() => {
                  setAdding(false);
                  setName("");
                }}
              />
            ) : (
              <div className="stack">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => setAdding(true)}
                >
                  {copy.worldList.newWorld}
                </button>
                <button
                  type="button"
                  className="btn btn--block"
                  onClick={openSample}
                >
                  {copy.worldList.openSample}
                </button>
              </div>
            )}
          </section>
        ) : (
          <section>
            <h1 className="section-heading" style={{ marginTop: 0 }}>
              {copy.worldList.heading}
            </h1>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {worlds.map((world) => (
                <li key={world.id}>
                  <button
                    type="button"
                    className="card"
                    onClick={() => openWorld(world.id)}
                  >
                    <span className="card__title">
                      {world.name}
                      {world.isSample && (
                        <span className="chip">{copy.worldList.sampleMarker}</span>
                      )}
                    </span>
                    <span className="card__meta">
                      {" "}
                      {placesLabel(world.places.length)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {adding ? (
              <NewWorldForm
                name={name}
                setName={setName}
                onSubmit={submitNewWorld}
                onCancel={() => {
                  setAdding(false);
                  setName("");
                }}
              />
            ) : (
              <div className="row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setAdding(true)}
                >
                  {copy.worldList.newWorld}
                </button>
                <button type="button" className="btn" onClick={openSample}>
                  {copy.worldList.openSample}
                </button>
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="section-heading">{copy.fileArea.heading}</h2>
          <p className="file-note">{copy.fileArea.note}</p>
          <div className="row">
            <button type="button" className="btn" onClick={handleSave}>
              {copy.fileArea.save}
            </button>
            <button type="button" className="btn" onClick={handleOpen}>
              {copy.fileArea.open}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function NewWorldForm({
  name,
  setName,
  onSubmit,
  onCancel,
}: {
  name: string;
  setName: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="stack" style={{ marginTop: 12 }}>
      <label className="field">
        <span className="field__label">{copy.worldList.nameLabel}</span>
        <input
          className="input"
          type="text"
          value={name}
          placeholder={copy.worldList.namePlaceholder}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <div className="row">
        <button type="submit" className="btn btn--primary">
          {copy.worldList.create}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {copy.worldList.cancel}
        </button>
      </div>
    </form>
  );
}
