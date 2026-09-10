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
    noPlacesTitle: "A blank map.",
    noPlacesBody: "Open the sample atlas to see how a place remembers your visits.",
    placeNoEntries: "Pin your first morning here.",
    lastVisitPrefix: "Last visit here:",
    visitOne: "1 visit",
    visitManySuffix: "visits",
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
