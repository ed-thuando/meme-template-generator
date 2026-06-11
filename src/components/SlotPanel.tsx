import { useStore, findSlotLocation } from "../store";

function SlotPanel() {
  const template = useStore((s) => s.template);
  const selectedPartitionId = useStore((s) => s.selectedPartitionId);
  const selectedSlotId = useStore((s) => s.selectedSlotId);
  const addPartition = useStore((s) => s.addPartition);
  const updatePartition = useStore((s) => s.updatePartition);
  const deletePartition = useStore((s) => s.deletePartition);
  const selectPartition = useStore((s) => s.selectPartition);
  const addSlot = useStore((s) => s.addSlot);
  const updateSlot = useStore((s) => s.updateSlot);
  const deleteSlot = useStore((s) => s.deleteSlot);
  const selectSlot = useStore((s) => s.selectSlot);
  const sizeUpSlot = useStore((s) => s.sizeUpSlot);
  const sizeDownSlot = useStore((s) => s.sizeDownSlot);
  const addTextOverlay = useStore((s) => s.addTextOverlay);
  const deleteTextOverlay = useStore((s) => s.deleteTextOverlay);
  const updateTextOverlay = useStore((s) => s.updateTextOverlay);
  const selectedTextId = useStore((s) => s.selectedTextId);
  const selectText = useStore((s) => s.selectText);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  if (!template) return null;

  const selectedPartition = template.partitions.find((p) => p.id === selectedPartitionId);
  const slotLocation = selectedSlotId
    ? findSlotLocation(template, selectedSlotId)
    : null;
  const selectedSlot = slotLocation?.slot ?? null;
  const selectedText = template.textOverlays.find((t) => t.id === selectedTextId);
  const totalSlots = template.partitions.reduce((n, p) => n + p.slots.length, 0);

  return (
    <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Partitions</h2>
          <div className="flex gap-1">
            <button
              onClick={undo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded cursor-pointer"
              title="Undo"
            >
              ↩ Undo
            </button>
            <button
              onClick={redo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded cursor-pointer"
              title="Redo"
            >
              ↪ Redo
            </button>
          </div>
        </div>
        <button
          onClick={addPartition}
          className="w-full px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded cursor-pointer mb-2"
        >
          + Add Partition
        </button>
        {selectedPartition && (
          <button
            onClick={() => addSlot(selectedPartition.id, 30, 30)}
            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded cursor-pointer mb-2"
          >
            + Add Slot
          </button>
        )}
        <button
          onClick={() => addTextOverlay(20, 10)}
          className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded cursor-pointer"
        >
          + Add Text
        </button>
      </div>

      {template.partitions.length === 0 && template.textOverlays.length === 0 && (
        <div className="p-4 text-gray-400 text-sm text-center">
          Add a partition, then add slots inside it
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {template.partitions.map((partition) => (
          <div key={partition.id} className="border-b border-gray-700">
            <div
              className={`p-3 cursor-pointer ${
                selectedPartitionId === partition.id && !selectedSlotId
                  ? "bg-gray-700"
                  : "hover:bg-gray-750"
              }`}
              onClick={() => selectPartition(partition.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-semibold">{partition.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePartition(partition.id);
                  }}
                  className="px-1.5 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded cursor-pointer"
                  title="Delete partition"
                >
                  ✕
                </button>
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {partition.slots.length} slot{partition.slots.length !== 1 ? "s" : ""}
              </div>
            </div>

            {partition.slots.map((slot) => (
              <div
                key={slot.id}
                className={`pl-5 pr-3 py-2 border-t border-gray-750 cursor-pointer ${
                  selectedSlotId === slot.id ? "bg-gray-700" : "hover:bg-gray-750"
                }`}
                onClick={() => selectSlot(slot.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm">{slot.label}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sizeUpSlot(partition.id, slot.id);
                      }}
                      className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded cursor-pointer"
                      title="Bigger"
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sizeDownSlot(partition.id, slot.id);
                      }}
                      className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded cursor-pointer"
                      title="Smaller"
                    >
                      −
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlot(partition.id, slot.id);
                      }}
                      className="px-1.5 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded cursor-pointer"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="text-gray-400 text-xs">
                  {slot.shape} · {slot.width.toFixed(1)}×{slot.height.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        ))}

        {template.textOverlays.map((text) => (
          <div
            key={text.id}
            className={`p-3 border-b border-gray-700 cursor-pointer ${
              selectedTextId === text.id ? "bg-gray-700" : "hover:bg-gray-750"
            }`}
            onClick={() => selectText(text.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium truncate max-w-[140px]">
                {text.text}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTextOverlay(text.id);
                }}
                className="px-1.5 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-gray-400 text-xs">
              {text.fontFamily} · {text.fontSize.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {selectedPartition && !selectedSlot && (
        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <h3 className="text-white text-sm font-semibold mb-2">Edit Partition</h3>
          <label className="block">
            <span className="text-gray-400 text-xs">Label</span>
            <input
              type="text"
              value={selectedPartition.label}
              onChange={(e) => updatePartition(selectedPartition.id, { label: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-indigo-500 outline-none"
            />
          </label>
        </div>
      )}

      {selectedSlot && slotLocation && (
        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <h3 className="text-white text-sm font-semibold mb-2">Edit Slot</h3>
          <div className="text-gray-400 text-xs mb-2">{slotLocation.partition.label}</div>
          <div className="space-y-2">
            <label className="block">
              <span className="text-gray-400 text-xs">Label</span>
              <input
                type="text"
                value={selectedSlot.label}
                onChange={(e) =>
                  updateSlot(slotLocation.partition.id, selectedSlot.id, {
                    label: e.target.value,
                  })
                }
                className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-gray-400 text-xs">Shape</span>
              <select
                value={selectedSlot.shape}
                onChange={(e) =>
                  updateSlot(slotLocation.partition.id, selectedSlot.id, {
                    shape: e.target.value as "head" | "rectangle",
                  })
                }
                className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
              >
                <option value="rectangle">Square / Rectangle</option>
                <option value="head">Circle</option>
              </select>
            </label>
            <div className="flex gap-2">
              <label className="block flex-1">
                <span className="text-gray-400 text-xs">Width (%)</span>
                <input
                  type="number"
                  min="2"
                  max="100"
                  step="0.5"
                  value={Number(selectedSlot.width.toFixed(1))}
                  onChange={(e) =>
                    updateSlot(slotLocation.partition.id, selectedSlot.id, {
                      width: Math.max(2, Math.min(100, Number(e.target.value))),
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
              </label>
              <label className="block flex-1">
                <span className="text-gray-400 text-xs">Height (%)</span>
                <input
                  type="number"
                  min="2"
                  max="100"
                  step="0.5"
                  value={Number(selectedSlot.height.toFixed(1))}
                  onChange={(e) =>
                    updateSlot(slotLocation.partition.id, selectedSlot.id, {
                      height: Math.max(2, Math.min(100, Number(e.target.value))),
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-gray-400 text-xs">Angle</span>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selectedSlot.rotation}
                  onChange={(e) =>
                    updateSlot(slotLocation.partition.id, selectedSlot.id, {
                      rotation: Number(e.target.value),
                    })
                  }
                  className="flex-1"
                />
                <input
                  type="number"
                  aria-label="Angle (degrees)"
                  min="-180"
                  max="180"
                  value={selectedSlot.rotation}
                  onChange={(e) =>
                    updateSlot(slotLocation.partition.id, selectedSlot.id, {
                      rotation: Math.max(-180, Math.min(180, Number(e.target.value))),
                    })
                  }
                  className="w-16 px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
              </div>
            </label>
          </div>
        </div>
      )}

      {selectedText && (
        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <h3 className="text-white text-sm font-semibold mb-2">Edit Text</h3>
          <div className="space-y-2">
            <label className="block">
              <span className="text-gray-400 text-xs">Text</span>
              <input
                type="text"
                value={selectedText.text}
                onChange={(e) =>
                  updateTextOverlay(selectedText.id, { text: e.target.value })
                }
                className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
              />
            </label>
            <div className="flex gap-2">
              <label className="block flex-1">
                <span className="text-gray-400 text-xs">Size (%)</span>
                <input
                  type="number"
                  value={selectedText.fontSize}
                  onChange={(e) =>
                    updateTextOverlay(selectedText.id, { fontSize: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
                />
              </label>
              <label className="block flex-1">
                <span className="text-gray-400 text-xs">Font</span>
                <select
                  value={selectedText.fontFamily}
                  onChange={(e) =>
                    updateTextOverlay(selectedText.id, { fontFamily: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 outline-none"
                >
                  <option value="Impact">Impact</option>
                  <option value="Arial">Arial</option>
                  <option value="Comic Sans MS">Comic Sans</option>
                  <option value="Courier New">Courier</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <label className="block flex-1">
                <span className="text-gray-400 text-xs">Fill Color</span>
                <input
                  type="color"
                  value={selectedText.color}
                  onChange={(e) =>
                    updateTextOverlay(selectedText.id, { color: e.target.value })
                  }
                  className="w-full h-8 bg-gray-700 rounded border border-gray-600 cursor-pointer"
                />
              </label>
              <label className="block flex-1">
                <span className="text-gray-400 text-xs">Stroke Color</span>
                <input
                  type="color"
                  value={selectedText.strokeColor || "#000000"}
                  onChange={(e) =>
                    updateTextOverlay(selectedText.id, { strokeColor: e.target.value })
                  }
                  className="w-full h-8 bg-gray-700 rounded border border-gray-600 cursor-pointer"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedText.bold}
                  onChange={(e) =>
                    updateTextOverlay(selectedText.id, { bold: e.target.checked })
                  }
                />
                Bold
              </label>
              <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedText.italic}
                  onChange={(e) =>
                    updateTextOverlay(selectedText.id, { italic: e.target.checked })
                  }
                />
                Italic
              </label>
            </div>
          </div>
        </div>
      )}

      {totalSlots > 0 && (
        <div className="p-2 text-center text-gray-500 text-xs border-t border-gray-700">
          {template.partitions.length} partition{template.partitions.length !== 1 ? "s" : ""} ·{" "}
          {totalSlots} slot{totalSlots !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

export default SlotPanel;
