import { describe, it, expect } from "vitest";
import { constrainToCanvas, getDefaultSlotSize } from "./useCanvas";
import { percentageToPixel, pixelToPercentage } from "../lib/export";

describe("constrainToCanvas", () => {
  it("does not modify valid values", () => {
    const result = constrainToCanvas(50, 50, 10, 10);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
  });

  it("clamps x and y to 0 if negative", () => {
    const result = constrainToCanvas(-5, -10, 10, 10);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("clamps position to stay within canvas with minimum size", () => {
    const result = constrainToCanvas(105, 110, 10, 10);
    expect(result.x).toBe(98);
    expect(result.y).toBe(98);
  });

  it("ensures minimum width and height of 2", () => {
    const result = constrainToCanvas(50, 50, 0, 0);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it("clamps width so it does not exceed right boundary", () => {
    const result = constrainToCanvas(90, 50, 20, 10);
    expect(result.width).toBe(10);
  });

  it("clamps height so it does not exceed bottom boundary", () => {
    const result = constrainToCanvas(50, 85, 10, 20);
    expect(result.height).toBe(15);
  });
});

describe("getDefaultSlotSize", () => {
  it("returns square size for head shape", () => {
    const result = getDefaultSlotSize("head");
    expect(result.width).toBe(result.height);
  });

  it("returns wider size for rectangle shape", () => {
    const result = getDefaultSlotSize("rectangle");
    expect(result.width).toBeGreaterThan(result.height);
  });

  it("head shape has default 10x10", () => {
    const result = getDefaultSlotSize("head");
    expect(result.width).toBe(10);
    expect(result.height).toBe(10);
  });

  it("rectangle shape has default 15x12", () => {
    const result = getDefaultSlotSize("rectangle");
    expect(result.width).toBe(15);
    expect(result.height).toBe(12);
  });
});

describe("coordinate conversion utilities", () => {
  describe("percentageToPixel", () => {
    it("converts 0% to 0 pixels", () => {
      expect(percentageToPixel(0, 1200)).toBe(0);
    });

    it("converts 100% to full dimension", () => {
      expect(percentageToPixel(100, 1200)).toBe(1200);
    });

    it("converts 50% to half dimension", () => {
      expect(percentageToPixel(50, 1200)).toBe(600);
    });

    it("handles fractional percentages", () => {
      expect(percentageToPixel(33.33, 900)).toBeCloseTo(299.97, 1);
    });
  });

  describe("pixelToPercentage", () => {
    it("converts 0 pixels to 0%", () => {
      expect(pixelToPercentage(0, 1200)).toBe(0);
    });

    it("converts full dimension to 100%", () => {
      expect(pixelToPercentage(1200, 1200)).toBe(100);
    });

    it("returns 0 for zero dimension to avoid division by zero", () => {
      expect(pixelToPercentage(600, 0)).toBe(0);
    });
  });

  describe("round-trip", () => {
    it("percentage to pixel to percentage preserves value", () => {
      const percentages = [0, 10.5, 25, 50, 75.75, 100];
      for (const pct of percentages) {
        const roundTrip = pixelToPercentage(
          percentageToPixel(pct, 1200),
          1200
        );
        expect(roundTrip).toBeCloseTo(pct, 1);
      }
    });
  });
});