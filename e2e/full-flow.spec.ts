import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "sample.png"
);

function trackErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function openSampleImage(page: import("@playwright/test").Page) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open Image" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(FIXTURE);
}

async function addPartitionWithSlot(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "+ Add Partition" }).click();
  await expect(page.getByText("Partition 1")).toBeVisible();
  await page.getByRole("button", { name: "+ Add Slot" }).click();
  await expect(page.getByText("Slot 1")).toBeVisible();
}

test("loads empty state without crashing", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByText("No template loaded")).toBeVisible();
  expect(errors).toEqual([]);
});

test("selecting an image renders the canvas (no white screen)", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await openSampleImage(page);

  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("No template loaded")).toHaveCount(0);
  await expect(page.getByText("Loading image...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("full flow: image -> partition -> slot -> text -> undo -> export", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await openSampleImage(page);
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10_000 });

  await addPartitionWithSlot(page);

  await page.getByRole("button", { name: "+ Add Text" }).click();

  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await expect(page.getByText("Slot 1")).toHaveCount(0);
  await expect(page.locator("canvas").first()).toBeVisible();

  await addPartitionWithSlot(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);

  expect(errors).toEqual([]);
});

test("two partitions each with slots", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await openSampleImage(page);
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10_000 });

  await addPartitionWithSlot(page);
  await page.getByRole("button", { name: "+ Add Partition" }).click();
  await expect(page.getByText("Partition 2")).toBeVisible();
  await page.getByRole("button", { name: "+ Add Slot" }).click();
  await expect(page.getByText("2 partitions · 2 slots")).toBeVisible();

  expect(errors).toEqual([]);
});

test("slot size + angle controls update the slot", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await openSampleImage(page);
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10_000 });

  await addPartitionWithSlot(page);
  await page.getByText("Slot 1").click();
  await expect(page.getByRole("heading", { name: "Edit Slot" })).toBeVisible();

  const width = page.getByLabel("Width (%)");
  await width.fill("25");
  await expect(width).toHaveValue("25");

  const angle = page.getByLabel("Angle (degrees)");
  await angle.fill("45");
  await expect(angle).toHaveValue("45");

  await expect(page.locator("canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});
