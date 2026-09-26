import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialCanvasObjects } from "../data/seedCanvas";
import { useCollaborationStore } from "./collaborationStore";
import type { CanvasHistoryEntry, CanvasObject, EditorTool, ObjectOperation, Viewport } from "../types/canvas";

interface CanvasState {
  objects: CanvasObject[];
  selectedObjectIds: string[];
  activeTool: EditorTool;
  zoom: number;
  viewport: Viewport;
  history: CanvasHistoryEntry[];
  future: CanvasHistoryEntry[];
  setSelected: (ids: string[]) => void;
  setTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  setViewport: (viewport: Viewport) => void;
  addObject: (object: CanvasObject, description?: string) => void;
  updateObject: (id: string, changes: Partial<CanvasObject>, description?: string) => CanvasObject | null;
  deleteObjects: (ids: string[]) => CanvasObject[];
  replacePageObjects: (pageId: string, objects: CanvasObject[], description?: string) => void;
  reorderObject: (id: string, targetId: string) => void;
  applyRemoteReorder: (id: string, targetId: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  applyRemoteOperation: (operation: ObjectOperation) => boolean;
}

const historyEntry = (objects: CanvasObject[], description: string, changedIds: string[], reorder = false): CanvasHistoryEntry => ({ objects, description, changedIds, reorder, timestamp: Date.now() });
const withHistory = (state: CanvasState, description: string, changedIds: string[], reorder = false) => [...state.history.slice(-39), historyEntry(state.objects, description, changedIds, reorder)];

function restoreVersioned(target: CanvasObject[], current: CanvasObject[], changedIds: string[], reorder = false): CanvasObject[] {
  const changed = new Set(changedIds);
  const currentById = new Map(current.map((object) => [object.id, object]));
  const targetById = new Map(target.map((object) => [object.id, object]));
  const restore = (object: CanvasObject) => {
    const latest = currentById.get(object.id);
    if (latest && JSON.stringify({ ...latest, version: 0, updatedAt: 0 }) === JSON.stringify({ ...object, version: 0, updatedAt: 0 })) return latest;
    return { ...object, version: Math.max(object.version, latest?.version ?? 0) + 1, updatedAt: Date.now(), updatedBy: useCollaborationStore.getState().currentUser.id };
  };
  if (reorder) return [...target.filter((object) => currentById.has(object.id)).map((object) => currentById.get(object.id)!), ...current.filter((object) => !targetById.has(object.id))];
  const result = current.flatMap((object) => {
    if (!changed.has(object.id)) return [object];
    const previous = targetById.get(object.id);
    return previous ? [restore(previous)] : [];
  });
  target.forEach((object, index) => {
    if (!changed.has(object.id) || currentById.has(object.id)) return;
    const nextExisting = target.slice(index + 1).find((item) => result.some((currentItem) => currentItem.id === item.id));
    const insertAt = nextExisting ? result.findIndex((item) => item.id === nextExisting.id) : result.length;
    result.splice(insertAt, 0, restore(object));
  });
  return result;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      objects: initialCanvasObjects,
      selectedObjectIds: ["home-hero-image"],
      activeTool: "select",
      zoom: 0.68,
      viewport: { x: 0, y: 0 },
      history: [],
      future: [],
      setSelected: (ids) => set({ selectedObjectIds: ids }),
      setTool: (tool) => set({ activeTool: tool }),
      setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2.5, Number(zoom.toFixed(2)))) }),
      setViewport: (viewport) => set({ viewport }),
      addObject: (object, description = `Added ${object.name}`) => set((state) => ({
        objects: [...state.objects, object],
        selectedObjectIds: [object.id],
        history: withHistory(state, description, [object.id]),
        future: [],
      })),
      updateObject: (id, changes, description = "Updated object") => {
        const existing = get().objects.find((object) => object.id === id);
        if (!existing || (existing.locked && changes.locked === undefined && changes.visible === undefined)) return null;
        const updated = { ...existing, ...changes, id, version: existing.version + 1, updatedAt: Date.now(), updatedBy: useCollaborationStore.getState().currentUser.id };
        set((state) => ({
          objects: state.objects.map((object) => object.id === id ? updated : object),
          history: withHistory(state, description, [id]),
          future: [],
        }));
        return updated;
      },
      deleteObjects: (ids) => {
        const allIds = new Set(ids);
        const objects = get().objects;
        let changed = true;
        while (changed) {
          changed = false;
          objects.forEach((object) => {
            if (object.parentId && allIds.has(object.parentId) && !allIds.has(object.id)) {
              allIds.add(object.id);
              changed = true;
            }
          });
        }
        const deleted = objects.filter((object) => allIds.has(object.id) && !object.locked);
        if (!deleted.length) return [];
        set((state) => ({
          objects: state.objects.filter((object) => !deleted.some((item) => item.id === object.id)),
          selectedObjectIds: state.selectedObjectIds.filter((id) => !allIds.has(id)),
          history: withHistory(state, `Deleted ${deleted.length} layer${deleted.length > 1 ? "s" : ""}`, deleted.map((object) => object.id)),
          future: [],
        }));
        return deleted;
      },
      replacePageObjects: (pageId, objects, description = "Loaded template") => set((state) => ({
        objects: [...state.objects.filter((object) => object.pageId !== pageId), ...objects],
        selectedObjectIds: [],
        history: withHistory(state, description, [...state.objects.filter((object) => object.pageId === pageId).map((object) => object.id), ...objects.map((object) => object.id)]),
        future: [],
      })),
      reorderObject: (id, targetId) => set((state) => {
        const list = [...state.objects];
        const from = list.findIndex((item) => item.id === id);
        const to = list.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0 || from === to) return state;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return { objects: list, history: withHistory(state, "Reordered layers", [id, targetId], true), future: [] };
      }),
      applyRemoteReorder: (id, targetId) => set((state) => {
        const list = [...state.objects];
        const from = list.findIndex((item) => item.id === id);
        const to = list.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0 || from === to) return state;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return { objects: list };
      }),
      undo: () => {
        const state = get();
        if (!state.history.length) return false;
        const previous = state.history[state.history.length - 1];
        if (state.objects.some((object) => previous.changedIds.includes(object.id) && object.updatedBy !== useCollaborationStore.getState().currentUser.id && object.updatedAt > previous.timestamp)) return false;
        const restored = restoreVersioned(previous.objects, state.objects, previous.changedIds, previous.reorder);
        set({
          objects: restored,
          selectedObjectIds: state.selectedObjectIds.filter((id) => restored.some((object) => object.id === id)),
          history: state.history.slice(0, -1),
          future: [...state.future, historyEntry(state.objects, previous.description, previous.changedIds, previous.reorder)],
        });
        return true;
      },
      redo: () => {
        const state = get();
        if (!state.future.length) return false;
        const next = state.future[state.future.length - 1];
        if (state.objects.some((object) => next.changedIds.includes(object.id) && object.updatedBy !== useCollaborationStore.getState().currentUser.id && object.updatedAt > next.timestamp)) return false;
        const restored = restoreVersioned(next.objects, state.objects, next.changedIds, next.reorder);
        set({
          objects: restored,
          selectedObjectIds: state.selectedObjectIds.filter((id) => restored.some((object) => object.id === id)),
          history: [...state.history, historyEntry(state.objects, next.description, next.changedIds, next.reorder)],
          future: state.future.slice(0, -1),
        });
        return true;
      },
      applyRemoteOperation: (operation) => {
        const existing = get().objects.find((object) => object.id === operation.objectId);
        if (operation.type === "delete") {
          if (!existing || operation.version < existing.version) return false;
          set((state) => ({ objects: state.objects.filter((object) => object.id !== operation.objectId), selectedObjectIds: state.selectedObjectIds.filter((id) => id !== operation.objectId) }));
          return true;
        }
        if (existing && (operation.version < existing.version || (operation.version === existing.version && operation.timestamp <= existing.updatedAt))) return false;
        if (operation.type === "create") {
          const created = operation.payload as CanvasObject;
          if (!created) return false;
          set((state) => ({ objects: [...state.objects.filter((object) => object.id !== created.id), { ...created, version: operation.version, updatedAt: operation.timestamp, updatedBy: operation.userId }] }));
          return true;
        }
        if (!existing || !operation.payload) return false;
        const changes = operation.payload as Partial<CanvasObject>;
        set((state) => ({ objects: state.objects.map((object) => object.id === operation.objectId ? { ...object, ...changes, version: operation.version, updatedAt: operation.timestamp, updatedBy: operation.userId } : object) }));
        return true;
      },
    }),
    { name: "collabcanvas-canvas-v1", partialize: (state) => ({ objects: state.objects }) },
  ),
);