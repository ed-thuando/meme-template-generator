import { useStore } from "../store";
import { readImageAsBase64 } from "../lib/tauri";
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Circle,
  Rect,
  Transformer,
  Text as KonvaText,
  Group,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Slot, TextOverlay } from "../types";
import type Konva from "konva";

export interface MemeCanvasHandle {
  exportImage: (format: "png" | "webp", quality: number) => Promise<string>;
}

function SlotShape({
  slot,
  isSelected,
  onSelect,
  onChange,
  imgW,
  imgH,
}: {
  slot: Slot;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<Slot>) => void;
  imgW: number;
  imgH: number;
}) {
  const shapeRef = useRef<Konva.Circle | Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
    if (!isSelected && trRef.current) {
      trRef.current.nodes([]);
    }
  }, [isSelected]);

  const px = (slot.x / 100) * imgW;
  const py = (slot.y / 100) * imgH;
  const pw = (slot.width / 100) * imgW;
  const ph = (slot.height / 100) * imgH;

  return (
    <>
      {slot.shape === "head" ? (
        <Circle
          ref={shapeRef as any}
          x={px + pw / 2}
          y={py + ph / 2}
          radius={pw / 2}
          rotation={slot.rotation}
          fill="rgba(255, 200, 0, 0.45)"
          stroke={isSelected ? "#00ff00" : "#ffcc00"}
          strokeWidth={isSelected ? 3 : 1.5}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            const newX = ((e.target.x() - pw / 2) / imgW) * 100;
            const newY = ((e.target.y() - ph / 2) / imgH) * 100;
            onChange({ x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) });
          }}
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const newW = (pw * scaleX / imgW) * 100;
            const newH = (ph * scaleY / imgH) * 100;
            onChange({
              width: Math.max(2, newW),
              height: Math.max(2, newH),
              rotation: Math.round(node.rotation()),
            });
            node.scaleX(1);
            node.scaleY(1);
          }}
        />
      ) : (
        <Rect
          ref={shapeRef as any}
          x={px + pw / 2}
          y={py + ph / 2}
          width={pw}
          height={ph}
          offsetX={pw / 2}
          offsetY={ph / 2}
          rotation={slot.rotation}
          fill="rgba(0, 150, 255, 0.45)"
          stroke={isSelected ? "#00ff00" : "#0088ff"}
          strokeWidth={isSelected ? 3 : 1.5}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            const newX = ((e.target.x() - pw / 2) / imgW) * 100;
            const newY = ((e.target.y() - ph / 2) / imgH) * 100;
            onChange({ x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) });
          }}
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const newW = (pw * scaleX / imgW) * 100;
            const newH = (ph * scaleY / imgH) * 100;
            onChange({
              width: Math.max(2, newW),
              height: Math.max(2, newH),
              rotation: Math.round(node.rotation()),
            });
            node.scaleX(1);
            node.scaleY(1);
          }}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          boundBoxFunc={(_oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return _oldBox;
            return newBox;
          }}
        />
      )}
      <KonvaText
        text={slot.label}
        x={px}
        y={py - 14}
        fontSize={12}
        fill="white"
        stroke="black"
        strokeWidth={0.5}
        listening={false}
      />
    </>
  );
}

function TextOverlayShape({
  text,
  onSelect,
  onChange,
  imgW,
  imgH,
}: {
  text: TextOverlay;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<TextOverlay>) => void;
  imgW: number;
  imgH: number;
}) {
  const px = (text.x / 100) * imgW;
  const py = (text.y / 100) * imgH;
  const fontSize = (text.fontSize / 100) * imgH;

  return (
    <KonvaText
      text={text.text}
      x={px}
      y={py}
      fontSize={fontSize}
      fontFamily={text.fontFamily}
      fontStyle={text.bold ? (text.italic ? "bold italic" : "bold") : text.italic ? "italic" : "normal"}
      fill={text.color}
      stroke={text.strokeColor || "black"}
      strokeWidth={text.strokeWidth ? (text.strokeWidth / 100) * imgH : 1}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const newX = (e.target.x() / imgW) * 100;
        const newY = (e.target.y() / imgH) * 100;
        onChange({ x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) });
      }}
    />
  );
}

const MemeCanvas = forwardRef<MemeCanvasHandle>(function MemeCanvas(_props, ref) {
  const template = useStore((s) => s.template);
  const zoom = useStore((s) => s.zoom);
  const selectedSlotId = useStore((s) => s.selectedSlotId);
  const selectedTextId = useStore((s) => s.selectedTextId);
  const selectSlot = useStore((s) => s.selectSlot);
  const selectText = useStore((s) => s.selectText);
  const updateSlot = useStore((s) => s.updateSlot);
  const updateTextOverlay = useStore((s) => s.updateTextOverlay);
  const [, setImageSrc] = useState<string | null>(null);
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  useImperativeHandle(ref, () => ({
    exportImage: async (format: "png" | "webp", quality: number) => {
      if (!stageRef.current) throw new Error("No stage");
      const mime = format === "png" ? "image/png" : "image/webp";
      return stageRef.current.toDataURL({ pixelRatio: 2, mimeType: mime, quality });
    },
  }));

  useEffect(() => {
    if (!template) {
      setImageSrc(null);
      setKonvaImage(null);
      return;
    }
    const path = template.imagePath;
    if (path.startsWith("data:")) {
      const img = new window.Image();
      img.onload = () => setKonvaImage(img);
      img.src = path;
      setImageSrc(path);
      return;
    }
    let cancelled = false;
    readImageAsBase64(path).then((src) => {
      if (cancelled) return;
      setImageSrc(src);
      const img = new window.Image();
      img.onload = () => {
        if (!cancelled) setKonvaImage(img);
      };
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, [template?.imagePath]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        selectSlot(null);
        selectText(null);
      }
    },
    [selectSlot, selectText]
  );

  if (!template || !konvaImage) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center bg-gray-950">
        {template ? <p className="text-gray-500">Loading image...</p> : null}
      </div>
    );
  }

  const imgW = template.imageWidth;
  const imgH = template.imageHeight;
  const displayScale = Math.min(
    (containerSize.width - 32) / imgW,
    (containerSize.height - 32) / imgH,
    1
  ) * zoom;

  const stageWidth = containerSize.width;
  const stageHeight = containerSize.height;
  const offsetX = (stageWidth - imgW * displayScale) / 2;
  const offsetY = (stageHeight - imgH * displayScale) / 2;

  return (
    <div ref={containerRef} className="flex-1 bg-gray-950 overflow-hidden">
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        onClick={handleStageClick}
        onTap={handleStageClick as any}
      >
        <Layer>
          <KonvaImage image={konvaImage} x={offsetX} y={offsetY} scaleX={displayScale} scaleY={displayScale} />
          <Group x={offsetX} y={offsetY} scaleX={displayScale} scaleY={displayScale}>
            {template.partitions.flatMap((partition) =>
              partition.slots.map((slot) => (
                <SlotShape
                  key={slot.id}
                  slot={slot}
                  isSelected={selectedSlotId === slot.id}
                  onSelect={() => selectSlot(slot.id)}
                  onChange={(updates) => {
                    updateSlot(partition.id, slot.id, updates);
                  }}
                  imgW={imgW}
                  imgH={imgH}
                />
              ))
            )}
            {template.textOverlays.map((t) => (
              <TextOverlayShape
                key={t.id}
                text={t}
                isSelected={selectedTextId === t.id}
                onSelect={() => selectText(t.id)}
                onChange={(updates) => updateTextOverlay(t.id, updates)}
                imgW={imgW}
                imgH={imgH}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
});

export default MemeCanvas;