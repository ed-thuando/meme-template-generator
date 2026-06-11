import { create } from "zustand";
import { temporal } from "zundo";
import type { Slot, Partition, TextOverlay, MemeTemplate, PresetPhoto } from "../types";

interface AppState {
  template: MemeTemplate | null;
  selectedPartitionId: string | null;
  selectedSlotId: string | null;
  selectedTextId: string | null;
  zoom: number;
  presetPhotos: PresetPhoto[];

  loadTemplate: (imagePath: string, width: number, height: number) => void;
  addPartition: () => void;
  updatePartition: (id: string, updates: Partial<Pick<Partition, "label">>) => void;
  deletePartition: (id: string) => void;
  selectPartition: (id: string | null) => void;
  addSlot: (partitionId: string, x: number, y: number) => void;
  updateSlot: (partitionId: string, slotId: string, updates: Partial<Slot>) => void;
  deleteSlot: (partitionId: string, slotId: string) => void;
  selectSlot: (id: string | null) => void;
  sizeUpSlot: (partitionId: string, slotId: string) => void;
  sizeDownSlot: (partitionId: string, slotId: string) => void;
  addTextOverlay: (x: number, y: number) => void;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  deleteTextOverlay: (id: string) => void;
  selectText: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  addPresetPhoto: (photo: PresetPhoto) => void;
  removePresetPhoto: (id: string) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function renumberSlots(slots: Slot[]): Slot[] {
  return slots
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i + 1 }));
}

function renumberPartitions(partitions: Partition[]): Partition[] {
  return partitions
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i + 1 }));
}

function updatePartitions(
  template: MemeTemplate,
  updater: (partitions: Partition[]) => Partition[]
): MemeTemplate {
  return {
    ...template,
    partitions: updater(template.partitions),
    updatedAt: new Date().toISOString(),
  };
}

export function allSlots(template: MemeTemplate): Array<{ partition: Partition; slot: Slot }> {
  return template.partitions.flatMap((partition) =>
    partition.slots.map((slot) => ({ partition, slot }))
  );
}

export function findSlotLocation(
  template: MemeTemplate,
  slotId: string
): { partition: Partition; slot: Slot } | null {
  for (const partition of template.partitions) {
    const slot = partition.slots.find((s) => s.id === slotId);
    if (slot) return { partition, slot };
  }
  return null;
}

export const useStore = create<AppState>()(
  temporal(
    (set, get) => ({
      template: null,
      selectedPartitionId: null,
      selectedSlotId: null,
      selectedTextId: null,
      zoom: 1,
      presetPhotos: [],

      loadTemplate: (imagePath: string, width: number, height: number) =>
        set({
          template: {
            id: nextId("tmpl"),
            imagePath,
            imageWidth: width,
            imageHeight: height,
            partitions: [],
            textOverlays: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          selectedPartitionId: null,
          selectedSlotId: null,
          selectedTextId: null,
        }),

      addPartition: () => {
        const state = get();
        if (!state.template) return;
        const order = state.template.partitions.length + 1;
        const partition: Partition = {
          id: nextId("part"),
          order,
          label: `Partition ${order}`,
          slots: [],
        };
        set({
          template: updatePartitions(state.template, (parts) => [...parts, partition]),
          selectedPartitionId: partition.id,
          selectedSlotId: null,
        });
      },

      updatePartition: (id, updates) => {
        const state = get();
        if (!state.template) return;
        set({
          template: updatePartitions(state.template, (parts) =>
            parts.map((p) => (p.id === id ? { ...p, ...updates } : p))
          ),
        });
      },

      deletePartition: (id) => {
        const state = get();
        if (!state.template) return;
        const removed = state.template.partitions.find((p) => p.id === id);
        set({
          template: updatePartitions(state.template, (parts) =>
            renumberPartitions(parts.filter((p) => p.id !== id))
          ),
          selectedPartitionId:
            state.selectedPartitionId === id ? null : state.selectedPartitionId,
          selectedSlotId: removed?.slots.some((s) => s.id === state.selectedSlotId)
            ? null
            : state.selectedSlotId,
        });
      },

      selectPartition: (id) =>
        set({ selectedPartitionId: id, selectedSlotId: null }),

      addSlot: (partitionId, x, y) => {
        const state = get();
        if (!state.template) return;
        const partition = state.template.partitions.find((p) => p.id === partitionId);
        if (!partition) return;
        const order = partition.slots.length + 1;
        const slot: Slot = {
          id: nextId("slot"),
          order,
          x,
          y,
          width: 12,
          height: 12,
          shape: "rectangle",
          label: `Slot ${order}`,
          rotation: 0,
        };
        set({
          template: updatePartitions(state.template, (parts) =>
            parts.map((p) =>
              p.id === partitionId ? { ...p, slots: [...p.slots, slot] } : p
            )
          ),
          selectedPartitionId: partitionId,
          selectedSlotId: slot.id,
        });
      },

      updateSlot: (partitionId, slotId, updates) => {
        const state = get();
        if (!state.template) return;
        set({
          template: updatePartitions(state.template, (parts) =>
            parts.map((p) =>
              p.id === partitionId
                ? {
                    ...p,
                    slots: p.slots.map((s) =>
                      s.id === slotId ? { ...s, ...updates } : s
                    ),
                  }
                : p
            )
          ),
        });
      },

      deleteSlot: (partitionId, slotId) => {
        const state = get();
        if (!state.template) return;
        set({
          template: updatePartitions(state.template, (parts) =>
            parts.map((p) =>
              p.id === partitionId
                ? { ...p, slots: renumberSlots(p.slots.filter((s) => s.id !== slotId)) }
                : p
            )
          ),
          selectedSlotId:
            state.selectedSlotId === slotId ? null : state.selectedSlotId,
        });
      },

      selectSlot: (id) => {
        if (!id) {
          set({ selectedSlotId: null });
          return;
        }
        const state = get();
        const loc = state.template ? findSlotLocation(state.template, id) : null;
        set({
          selectedSlotId: id,
          selectedPartitionId: loc?.partition.id ?? state.selectedPartitionId,
        });
      },

      sizeUpSlot: (partitionId, slotId) => {
        const state = get();
        if (!state.template) return;
        set({
          template: updatePartitions(state.template, (parts) =>
            parts.map((p) =>
              p.id === partitionId
                ? {
                    ...p,
                    slots: p.slots.map((s) =>
                      s.id === slotId
                        ? { ...s, width: s.width * 1.05, height: s.height * 1.05 }
                        : s
                    ),
                  }
                : p
            )
          ),
        });
      },

      sizeDownSlot: (partitionId, slotId) => {
        const state = get();
        if (!state.template) return;
        set({
          template: updatePartitions(state.template, (parts) =>
            parts.map((p) =>
              p.id === partitionId
                ? {
                    ...p,
                    slots: p.slots.map((s) =>
                      s.id === slotId
                        ? { ...s, width: s.width * 0.95, height: s.height * 0.95 }
                        : s
                    ),
                  }
                : p
            )
          ),
        });
      },

      addTextOverlay: (x, y) => {
        const state = get();
        if (!state.template) return;
        const text: TextOverlay = {
          id: nextId("text"),
          text: "MEME TEXT",
          x,
          y,
          fontSize: 5,
          color: "#ffffff",
          fontFamily: "Impact",
          bold: true,
          italic: false,
          strokeColor: "#000000",
          strokeWidth: 1,
        };
        set({
          template: {
            ...state.template,
            textOverlays: [...state.template.textOverlays, text],
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateTextOverlay: (id, updates) => {
        const state = get();
        if (!state.template) return;
        set({
          template: {
            ...state.template,
            textOverlays: state.template.textOverlays.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      deleteTextOverlay: (id) => {
        const state = get();
        if (!state.template) return;
        set({
          template: {
            ...state.template,
            textOverlays: state.template.textOverlays.filter((t) => t.id !== id),
            updatedAt: new Date().toISOString(),
          },
          selectedTextId:
            state.selectedTextId === id ? null : state.selectedTextId,
        });
      },

      selectText: (id) => set({ selectedTextId: id }),

      setZoom: (zoom) => set({ zoom }),

      addPresetPhoto: (photo) =>
        set({ presetPhotos: [...get().presetPhotos, photo] }),

      removePresetPhoto: (id) =>
        set({
          presetPhotos: get().presetPhotos.filter((p) => p.id !== id),
        }),

      undo: () => {
        useStore.temporal.getState().undo();
      },

      redo: () => {
        useStore.temporal.getState().redo();
      },

      reset: () =>
        set({
          template: null,
          selectedPartitionId: null,
          selectedSlotId: null,
          selectedTextId: null,
          zoom: 1,
          presetPhotos: [],
        }),
    }),
    {
      limit: 50,
      equality: (pastState, currentState) =>
        pastState.template === currentState.template,
    }
  )
);
