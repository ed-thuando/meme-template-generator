import { describe, it, expect } from "vitest";
import {
  exportMemeSheet,
  slotsFromSheet,
  partitionsFromSheet,
  buildSheetRows,
  sheetRowsToCsv,
  SHEET_CSV_HEADER,
  percentageToPixel,
  pixelToPercentage,
} from "../lib/export";
import type { MemeTemplate, MemeSheet, Slot, Partition } from "../types";

function createTemplate(overrides: Partial<MemeTemplate> = {}): MemeTemplate {
  return {
    id: "tmpl-1",
    imagePath: "/test/meme.png",
    imageWidth: 1200,
    imageHeight: 800,
    partitions: [],
    textOverlays: [],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSheetRows", () => {
  it("flattens partitions and slots with coordinates", () => {
    const slot: Slot = {
      id: "s1",
      order: 1,
      x: 10,
      y: 20,
      width: 12,
      height: 12,
      shape: "head",
      label: "Team A",
      rotation: 30,
    };
    const template = createTemplate({
      partitions: [{ id: "p1", order: 1, label: "Match 1", slots: [slot] }],
    });

    const rows = buildSheetRows(template);
    expect(rows).toHaveLength(1);
    expect(rows[0].partition).toBe("Match 1");
    expect(rows[0].slotName).toBe("Team A");
    expect(rows[0].x).toBe(10);
    expect(rows[0].angle).toBe(30);
  });

  it("renders csv with image dimensions", () => {
    const template = createTemplate({
      imageWidth: 1920,
      imageHeight: 1080,
      partitions: [
        {
          id: "p1",
          order: 1,
          label: "Part 1",
          slots: [
            {
              id: "s1",
              order: 1,
              x: 5,
              y: 5,
              width: 10,
              height: 10,
              shape: "rectangle",
              label: "Slot 1",
              rotation: 0,
            },
          ],
        },
      ],
    });
    const csv = sheetRowsToCsv("meme.png", template, buildSheetRows(template));
    expect(csv.startsWith(SHEET_CSV_HEADER)).toBe(true);
    expect(csv).toContain('"meme.png"');
    expect(csv).toContain("1920");
    expect(csv).toContain('"Part 1"');
  });
});

describe("exportMemeSheet", () => {
  it("exports a valid MemeSheet from a single template", () => {
    const template = createTemplate();
    const sheet = exportMemeSheet([template]);

    expect(sheet.version).toBe(1);
    expect(sheet.templates).toHaveLength(1);
    expect(sheet.templates[0]).toEqual(template);
  });

  it("round-trips through JSON serialization", () => {
    const slot: Slot = {
      id: "p1",
      order: 1,
      x: 25.5,
      y: 30,
      width: 10,
      height: 10,
      shape: "head",
      label: "Slot 1",
      rotation: 15,
    };
    const partition: Partition = {
      id: "part-1",
      order: 1,
      label: "Partition 1",
      slots: [slot],
    };
    const template = createTemplate({ partitions: [partition] });
    const sheet = exportMemeSheet([template]);
    const parsed: MemeSheet = JSON.parse(JSON.stringify(sheet));

    expect(parsed.templates[0].partitions[0].slots[0].x).toBe(25.5);
    expect(parsed.templates[0].partitions[0].slots[0].shape).toBe("head");
  });
});

describe("partitionsFromSheet", () => {
  it("extracts partitions from a sheet for a given template index", () => {
    const partition: Partition = {
      id: "part-1",
      order: 1,
      label: "Match 1",
      slots: [],
    };
    const template = createTemplate({ partitions: [partition] });
    const sheet = exportMemeSheet([template]);

    expect(partitionsFromSheet(sheet, 0)).toHaveLength(1);
    expect(partitionsFromSheet(sheet, 0)[0].label).toBe("Match 1");
  });
});

describe("slotsFromSheet", () => {
  it("flattens slots from all partitions", () => {
    const slot: Slot = {
      id: "p1",
      order: 1,
      x: 50,
      y: 50,
      width: 10,
      height: 10,
      shape: "rectangle",
      label: "ST",
      rotation: 0,
    };
    const template = createTemplate({
      partitions: [{ id: "part-1", order: 1, label: "P1", slots: [slot] }],
    });
    const sheet = exportMemeSheet([template]);

    const slots = slotsFromSheet(sheet, 0);
    expect(slots).toHaveLength(1);
    expect(slots[0].label).toBe("ST");
  });

  it("returns empty array for missing template index", () => {
    expect(slotsFromSheet(exportMemeSheet([]), 0)).toEqual([]);
  });
});

describe("coordinate conversion", () => {
  it("converts percentage to pixel coordinates", () => {
    expect(percentageToPixel(50, 1200)).toBe(600);
    expect(percentageToPixel(25, 1200)).toBe(300);
  });

  it("converts pixel to percentage coordinates", () => {
    expect(pixelToPercentage(600, 1200)).toBe(50);
    expect(pixelToPercentage(300, 1200)).toBe(25);
  });

  it("round-trips percentage through pixel conversion", () => {
    const percent = 37.5;
    const dimension = 1200;
    const result = pixelToPercentage(percentageToPixel(percent, dimension), dimension);
    expect(result).toBeCloseTo(percent, 1);
  });
});
