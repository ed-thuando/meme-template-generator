import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store";

beforeEach(() => {
  useStore.getState().reset();
});

function loadTestTemplate() {
  useStore.getState().loadTemplate("/test.png", 1000, 800);
}

function addPartitionWithSlot() {
  useStore.getState().addPartition();
  const partitionId = useStore.getState().selectedPartitionId!;
  useStore.getState().addSlot(partitionId, 25, 30);
  return { partitionId, slotId: useStore.getState().selectedSlotId! };
}

describe("useStore", () => {
  describe("template loading", () => {
    it("starts with null template", () => {
      expect(useStore.getState().template).toBeNull();
    });

    it("loads a template with image path and dimensions", () => {
      useStore.getState().loadTemplate("/path/to/meme.png", 1200, 800);

      const state = useStore.getState();
      expect(state.template).not.toBeNull();
      expect(state.template!.imagePath).toBe("/path/to/meme.png");
      expect(state.template!.imageWidth).toBe(1200);
      expect(state.template!.imageHeight).toBe(800);
      expect(state.template!.partitions).toEqual([]);
      expect(state.template!.textOverlays).toEqual([]);
    });
  });

  describe("partition CRUD", () => {
    beforeEach(loadTestTemplate);

    it("adds a partition with auto-incremented order", () => {
      useStore.getState().addPartition();

      const partitions = useStore.getState().template!.partitions;
      expect(partitions).toHaveLength(1);
      expect(partitions[0].order).toBe(1);
      expect(partitions[0].label).toBe("Partition 1");
      expect(partitions[0].slots).toEqual([]);
      expect(useStore.getState().selectedPartitionId).toBe(partitions[0].id);
    });

    it("updates partition label", () => {
      useStore.getState().addPartition();
      const id = useStore.getState().template!.partitions[0].id;
      useStore.getState().updatePartition(id, { label: "Team A vs B" });

      expect(useStore.getState().template!.partitions[0].label).toBe("Team A vs B");
    });

    it("deletes a partition and re-numbers", () => {
      useStore.getState().addPartition();
      useStore.getState().addPartition();
      const id = useStore.getState().template!.partitions[0].id;
      useStore.getState().deletePartition(id);

      const partitions = useStore.getState().template!.partitions;
      expect(partitions).toHaveLength(1);
      expect(partitions[0].order).toBe(1);
    });
  });

  describe("slot CRUD within partition", () => {
    beforeEach(loadTestTemplate);

    it("adds a slot with default square shape and auto-incremented order", () => {
      const { partitionId } = addPartitionWithSlot();

      const partition = useStore.getState().template!.partitions.find((p) => p.id === partitionId)!;
      expect(partition.slots).toHaveLength(1);
      expect(partition.slots[0].x).toBe(25);
      expect(partition.slots[0].y).toBe(30);
      expect(partition.slots[0].shape).toBe("rectangle");
      expect(partition.slots[0].order).toBe(1);
      expect(partition.slots[0].label).toBe("Slot 1");
    });

    it("increments order for subsequent slots in same partition", () => {
      useStore.getState().addPartition();
      const partitionId = useStore.getState().selectedPartitionId!;
      useStore.getState().addSlot(partitionId, 10, 20);
      useStore.getState().addSlot(partitionId, 30, 40);
      useStore.getState().addSlot(partitionId, 50, 60);

      const slots = useStore.getState().template!.partitions[0].slots;
      expect(slots).toHaveLength(3);
      expect(slots[0].order).toBe(1);
      expect(slots[2].order).toBe(3);
    });

    it("updates a slot property", () => {
      const { partitionId, slotId } = addPartitionWithSlot();
      useStore.getState().updateSlot(partitionId, slotId, { width: 20, shape: "rectangle" });

      const slot = useStore.getState().template!.partitions[0].slots[0];
      expect(slot.width).toBe(20);
      expect(slot.shape).toBe("rectangle");
    });

    it("deletes a slot and re-numbers remaining slots", () => {
      useStore.getState().addPartition();
      const partitionId = useStore.getState().selectedPartitionId!;
      useStore.getState().addSlot(partitionId, 10, 10);
      useStore.getState().addSlot(partitionId, 20, 20);
      useStore.getState().addSlot(partitionId, 30, 30);

      const slot2Id = useStore.getState().template!.partitions[0].slots[1].id;
      useStore.getState().deleteSlot(partitionId, slot2Id);

      const slots = useStore.getState().template!.partitions[0].slots;
      expect(slots).toHaveLength(2);
      expect(slots[0].order).toBe(1);
      expect(slots[1].order).toBe(2);
    });

    it("selects a slot and its partition", () => {
      const { slotId } = addPartitionWithSlot();
      useStore.getState().selectSlot(null);
      useStore.getState().selectSlot(slotId);

      expect(useStore.getState().selectedSlotId).toBe(slotId);
      expect(useStore.getState().selectedPartitionId).toBeTruthy();
    });

    it("sizes up a slot by increasing width and height 5%", () => {
      const { partitionId, slotId } = addPartitionWithSlot();
      useStore.getState().updateSlot(partitionId, slotId, { width: 10, height: 10 });
      useStore.getState().sizeUpSlot(partitionId, slotId);

      const slot = useStore.getState().template!.partitions[0].slots[0];
      expect(slot.width).toBeCloseTo(10.5);
      expect(slot.height).toBeCloseTo(10.5);
    });

    it("sizes down a slot by decreasing width and height 5%", () => {
      const { partitionId, slotId } = addPartitionWithSlot();
      useStore.getState().updateSlot(partitionId, slotId, { width: 10, height: 10 });
      useStore.getState().sizeDownSlot(partitionId, slotId);

      const slot = useStore.getState().template!.partitions[0].slots[0];
      expect(slot.width).toBeCloseTo(9.5);
      expect(slot.height).toBeCloseTo(9.5);
    });
  });

  describe("text overlay CRUD", () => {
    beforeEach(loadTestTemplate);

    it("adds a text overlay with default meme-style settings", () => {
      useStore.getState().addTextOverlay(50, 10);

      const texts = useStore.getState().template!.textOverlays;
      expect(texts).toHaveLength(1);
      expect(texts[0].text).toBe("MEME TEXT");
      expect(texts[0].fontFamily).toBe("Impact");
    });

    it("updates a text overlay property", () => {
      useStore.getState().addTextOverlay(50, 10);
      const textId = useStore.getState().template!.textOverlays[0].id;

      useStore.getState().updateTextOverlay(textId, {
        text: "NEW TEXT",
        color: "#ff0000",
      });

      const text = useStore.getState().template!.textOverlays[0];
      expect(text.text).toBe("NEW TEXT");
      expect(text.color).toBe("#ff0000");
    });

    it("deletes a text overlay", () => {
      useStore.getState().addTextOverlay(50, 10);
      useStore.getState().addTextOverlay(50, 80);

      const text1Id = useStore.getState().template!.textOverlays[0].id;
      useStore.getState().deleteTextOverlay(text1Id);

      expect(useStore.getState().template!.textOverlays).toHaveLength(1);
    });
  });

  describe("undo/redo", () => {
    beforeEach(loadTestTemplate);

    it("undoes slot addition", () => {
      addPartitionWithSlot();
      expect(useStore.getState().template!.partitions[0].slots).toHaveLength(1);

      useStore.getState().undo();
      expect(useStore.getState().template!.partitions[0].slots).toHaveLength(0);
    });

    it("undoes partition addition", () => {
      useStore.getState().addPartition();
      expect(useStore.getState().template!.partitions).toHaveLength(1);

      useStore.getState().undo();
      expect(useStore.getState().template!.partitions).toHaveLength(0);
    });

    it("redoes undone slot addition", () => {
      addPartitionWithSlot();
      useStore.getState().undo();
      useStore.getState().redo();
      expect(useStore.getState().template!.partitions[0].slots).toHaveLength(1);
    });
  });

  describe("zoom", () => {
    it("defaults to zoom level 1", () => {
      expect(useStore.getState().zoom).toBe(1);
    });

    it("sets zoom level", () => {
      useStore.getState().setZoom(2);
      expect(useStore.getState().zoom).toBe(2);
    });
  });

  describe("reset", () => {
    it("clears all state back to initial", () => {
      loadTestTemplate();
      addPartitionWithSlot();
      useStore.getState().addTextOverlay(50, 10);

      useStore.getState().reset();

      expect(useStore.getState().template).toBeNull();
      expect(useStore.getState().selectedPartitionId).toBeNull();
      expect(useStore.getState().selectedSlotId).toBeNull();
    });
  });
});
