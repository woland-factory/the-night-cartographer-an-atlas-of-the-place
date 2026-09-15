import { expect, test } from "@playwright/test";

// The signature moment end to end on the production build: a fresh visitor
// opens the sample world, sees the visit ledger, and a tapped place answers
// back with its history and elapsed time.
test("a visitor opens the sample world and a tapped place answers back", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Open the sample atlas" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open the sample atlas" }).click();

  // The ledger overview: places by last visit with a computed elapsed line.
  await expect(page.getByText(/Last visit here:/).first()).toBeVisible();

  // Tap The Harbor's marker: the recall panel opens with the history.
  await page.getByRole("button", { name: "The Harbor", exact: true }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { name: "The Harbor" })).toBeVisible();
  await expect(panel.getByText(/Last visit here:/)).toBeVisible();
  await expect(panel.getByText(/the gulls remembered me first/i)).toBeVisible();
});

// The sub-minute gesture on the production build: open the composer, type a
// dream, pick a place, save, and the place answers back in the same gesture.
test("a visitor writes a dream and the place answers back at once", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the sample atlas" }).click();

  await page.getByRole("button", { name: "Write a dream", exact: true }).click();

  const dream = "a staircase down into warm water";
  await page.getByLabel("Your dream").fill(dream);
  const composer = page.getByRole("dialog");
  await composer.getByRole("button", { name: "The Harbor", exact: true }).click();
  await composer.getByRole("button", { name: "Save" }).click();

  // The recall panel opened in the same gesture with the new entry on top.
  const panel = page.getByRole("dialog");
  await expect(panel.getByText(dream)).toBeVisible();
  await expect(panel.getByText(/Last visit here: today/)).toBeVisible();
});
