// Every user-visible string lives here so the copy sweep can check them all
// in one place. Positive, short, one idea each. No em-dashes, no banned
// filler vocabulary, no negative empty-state phrasing.

import type { ImportError } from "./model/serialize";

export const copy = {
  wordmark: "The Night Cartographer",
  tagline: "An atlas of the places you visit in dreams.",

  worldList: {
    heading: "Your worlds",
    emptyTitle: "Start your first atlas.",
    emptyBody: "Draw a world you return to, then pin what you remember.",
    newWorld: "New world",
    openSample: "Open the sample atlas",
    nameLabel: "World name",
    namePlaceholder: "Harbor City",
    create: "Create",
    cancel: "Cancel",
    sampleMarker: "Sample",
    placesCountOne: "1 place",
    placesCountManySuffix: "places",
  },

  fileArea: {
    heading: "Your atlas file",
    note: "Your atlas stays on this device. Save it to a file you keep.",
    save: "Save to file",
    open: "Open a file",
  },

  worldView: {
    back: "All worlds",
    sampleMarker: "Sample",
    placeNoEntries: "Pin your first morning here.",
    lastVisitPrefix: "Last visit here:",
    visitOne: "1 visit",
    visitManySuffix: "visits",
  },

  map: {
    tools: {
      district: "District",
      road: "Road",
      coastline: "Coastline",
      label: "Label",
      stamp: "Stamp",
      fog: "Fog edge",
    },
    finish: "Finish",
    undoPoint: "Undo point",
    cancel: "Cancel",
    undo: "Undo",
    kitGroup: "Map tools",
    swatchGroup: "Ink color",
    stampGroup: "Stamps",
    swatchNames: {
      ink: "Ink",
      sea: "Sea",
      moss: "Moss",
      rust: "Rust",
      plum: "Plum",
      fog: "Fog",
    },
    stampNames: {
      tower: "Tower",
      tree: "Tree",
      bridge: "Bridge",
      mountain: "Mountain",
      well: "Well",
      compass: "Compass",
    },
    nameLabel: "District name",
    namePlaceholder: "The Harbor",
    nameConfirm: "Name it",
    nameSkip: "Skip",
    labelFieldLabel: "Label text",
    labelPlaceholder: "Old Town",
    labelConfirm: "Add label",
    canvasLabel: "Map canvas. Pick a tool, then place points to draw.",
    keyboardHint: "Arrow keys move the marker. Enter places a point.",
    empty: {
      title: "Draw your first district.",
      body: "Pick a shape, then tap the map to place each corner.",
      action: "Start a district",
    },
  },

  composer: {
    title: "Write a dream",
    bodyLabel: "Your dream",
    bodyPlaceholder: "What did you see?",
    dateLabel: "Date",
    placeLabel: "Pin it to a place",
    newPlace: "New place",
    dropHint: "Tap the map to place it.",
    newPlaceNameLabel: "Name this place",
    newPlaceNamePlaceholder: "The Harbor",
    newPlaceConfirm: "Add place",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    open: "Write a dream",
    needBody: "Write a few words to save.",
    needPlace: "Pick a place to save.",
    emptyPlacesTitle: "Add a place to pin to.",
    emptyPlacesBody: "Drop a place on the map, then pin your dream to it.",
  },

  timeScrub: {
    label: "Map history",
    now: "Now",
    backToNow: "Back to now",
    viewingPrefix: "Map as of",
    drawnPrefix: "Drawn",
  },

  recall: {
    close: "Close",
    writeHere: "Write a dream here",
    emptyTitle: "The first dream goes here.",
    emptyBody: "Pin a morning to this place. It remembers from then on.",
    ledgerHeading: "Places",
  },

  walkthrough: {
    draw: "Draw a district.",
    write: "Write a dream and pin it to a place.",
    recall: "Tap a place to see what you wrote there.",
    skip: "Skip",
  },

  saveError: {
    title: "Save your atlas to keep these changes.",
    body: "This device isn't storing new changes right now. Save your atlas to a file so you keep them.",
    action: "Save to file",
  },

  importError: {
    unreadable: "That file isn't an atlas we can read. Pick another.",
    "newer-version":
      "This atlas was made by a newer version of the app. Update, then open it again.",
  } satisfies Record<ImportError, string>,

  errorBoundary: {
    title: "Reload to try again.",
    action: "Reload",
  },
} as const;

export function importErrorMessage(reason: ImportError): string {
  return copy.importError[reason];
}

// The one visit-count rule, shared by the recall panel and the visit ledger.
export function visitsLabel(count: number): string {
  return count === 1
    ? copy.worldView.visitOne
    : `${count} ${copy.worldView.visitManySuffix}`;
}
