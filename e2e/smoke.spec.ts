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
