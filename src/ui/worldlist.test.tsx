import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { copy } from "../copy";
import { init } from "../state/atlasStore";
import { App } from "./App";

async function renderApp() {
  await init();
  render(<App />);
}

describe("world list", () => {
  it("shows the designed empty state with pre-swept copy", async () => {
    await renderApp();
    expect(screen.getByText(copy.worldList.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(copy.worldList.emptyBody)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.worldList.newWorld }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.worldList.openSample }),
    ).toBeInTheDocument();
  });

  it("creates and opens a named world", async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(
      screen.getByRole("button", { name: copy.worldList.newWorld }),
    );
    const input = screen.getByLabelText(copy.worldList.nameLabel);
    await user.type(input, "Mistral Bay");
    await user.click(screen.getByRole("button", { name: copy.worldList.create }));

    // The new world appears in the list, replacing the empty state.
    const card = screen.getByRole("button", { name: /Mistral Bay/ });
    expect(card).toBeInTheDocument();
    expect(screen.queryByText(copy.worldList.emptyTitle)).toBeNull();

    // Opening it shows the opened-world view.
    await user.click(card);
    expect(
      screen.getByRole("heading", { name: /Mistral Bay/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.worldView.back }),
    ).toBeInTheDocument();
    // A brand-new world opens straight onto the empty canvas, which leads to
    // drawing the first district (not a dead end).
    expect(screen.getByText(copy.map.empty.title)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.map.empty.action }),
    ).toBeInTheDocument();
  });
});
