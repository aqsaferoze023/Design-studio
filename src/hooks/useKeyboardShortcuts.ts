import { useEffect } from "react";
import { useCanvas } from "./useCanvas";
import { useCanvasStore } from "../stores/canvasStore";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import type { EditorTool } from "../types/canvas";

const tools: Record<string, EditorTool> = { v: "select", r: "rectangle", o: "circle", t: "text", l: "line", c: "comment", f: "frame", p: "pen" };

export function useKeyboardShortcuts() {
  const { remove, undo, redo } = useCanvas();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      if (command && key === "k") { event.preventDefault(); useUIStore.getState().setModal("command"); return; }
      if (command && key === "s") {
        event.preventDefault();
        useProjectStore.getState().markSaved();
        useUIStore.getState().showToast("All changes saved locally");
        return;
      }
      const target = event.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (command && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (command && key === "y") { event.preventDefault(); redo(); return; }
      if (key === "escape") { useUIStore.getState().setModal(null); useCanvasStore.getState().setTool("select"); return; }
      if (key === "delete" || key === "backspace") { event.preventDefault(); remove(); return; }
      if (!command && !event.altKey && tools[key]) useCanvasStore.getState().setTool(tools[key]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [remove, undo, redo]);
}