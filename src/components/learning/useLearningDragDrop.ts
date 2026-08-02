import { useState } from "react";
import type React from "react";

const LEARNING_DRAG_MIME = "application/x-stuwy-drag-item";

function extractDragValue(event: Pick<React.DragEvent, "dataTransfer">) {
  return (
    event.dataTransfer.getData(LEARNING_DRAG_MIME).trim() ||
    event.dataTransfer.getData("text/plain").trim()
  );
}

export function useLearningDragDrop() {
  const [draggedValue, setDraggedValue] = useState<string | null>(null);

  const getDragSourceProps = (value: string) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.setData(LEARNING_DRAG_MIME, value);
      event.dataTransfer.setData("text/plain", value);
      event.dataTransfer.effectAllowed = "copyMove";
      setDraggedValue(value);
    },
    onDragEnd: () => {
      setDraggedValue(null);
    },
  });

  const getDropTargetProps = (onReceive: (value: string) => void, onHover?: () => void) => ({
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      onHover?.();
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      const value = extractDragValue(event);
      if (!value) return;
      onReceive(value);
      setDraggedValue(null);
    },
  });

  return {
    draggedValue,
    setDraggedValue,
    getDragSourceProps,
    getDropTargetProps,
  };
}
