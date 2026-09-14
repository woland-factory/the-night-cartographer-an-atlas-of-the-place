import { expect, test } from "@playwright/test";

// The core loop end to end on the production build: a fresh visitor opens the
// sample world and a place answers back with its history and elapsed time.
test("a visitor opens the sample world and a place answers back", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Open the sample atlas" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open the sample atlas" }).click();

  await expect(page.getByRole("heading", { name: "The Harbor" })).toBeVisible();
  await expect(page.getByText(/Last visit here:/).first()).toBeVisible();
});

// The sub-minute gesture on the production build: open the composer, type a
// dream, pick a place, save, and see it appear in that place's readout at once.
test("a visitor writes a dream and it appears in the place readout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the sample atlas" }).click();

  await page.getByRole("button", { name: "Write a dream" }).click();

  const dream = "a staircase down into warm water";
  await page.getByLabel("Your dream").fill(dream);
  await page.getByRole("button", { name: "The Harbor", pressed: false }).click();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText(dream)).toBeVisible();
});
