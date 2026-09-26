import { useCallback } from "react";
import { buildTemplateObjects } from "../data/seedCanvas";
import { collaborationService } from "../services/collaborationService";
import { useCanvasStore } from "../stores/canvasStore";
import { useCollaborationStore } from "../stores/collaborationStore";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import type { CanvasHistoryEntry, CanvasObject, CanvasObjectType, ObjectOperation } from "../types/canvas";

function canEdit() {
  if (useCollaborationStore.getState().currentUser.permission === "editor") return true;
  useUIStore.getState().showToast("You need Editor access to change this design.", "error");
  return false;
}

function newObject(type: CanvasObjectType, pageId: string, x: number, y: number, extras: Partial<CanvasObject> = {}): CanvasObject {
  const sizes: Partial<Record<CanvasObjectType, [number, number]>> = {
    rect: [180, 110], ellipse: [130, 130], triangle: [140, 125], text: [240, 52], frame: [390, 290],
    image: [250, 210], line: [160, 1], arrow: [160, 1], icon: [45, 45], video: [260, 175], pen: [120, 70], group: [0, 0],
  };
  const [width, height] = sizes[type] ?? [160, 100];
  return {
    id: crypto.randomUUID(), pageId, type, name: type === "rect" ? "Rectangle" : type === "ellipse" ? "Circle" : type === "frame" ? "New Frame" : type.charAt(0).toUpperCase() + type.slice(1),
    x, y, width, height, rotation: 0, fill: type === "text" ? "#143231" : type === "frame" ? "#fffef5" : type === "video" ? "#183a38" : "#98b582",
    stroke: "transparent", strokeWidth: 0, opacity: 1, cornerRadius: type === "rect" ? 12 : 0,
    shadowBlur: 0, shadowColor: "#000000", visible: true, locked: false, version: 1,
    updatedAt: Date.now(), updatedBy: useCollaborationStore.getState().currentUser.id, text: type === "text" ? "Your text here" : undefined,
    fontFamily: "Inter", fontSize: type === "text" ? 36 : undefined, fontWeight: "600", align: "left", lineHeight: 1.25,
    points: type === "line" || type === "arrow" ? [0, 0, width, 0] : undefined,
    pathData: type === "icon" ? "M3 12c6-9 11-8 18-9-1 10-5 17-13 17-4 0-6-3-5-8Z" : undefined,
    ...extras,
  };
}

function operationFor(object: CanvasObject, type: ObjectOperation["type"], payload: ObjectOperation["payload"]): ObjectOperation {
  return {
    id: crypto.randomUUID(), projectId: useProjectStore.getState().activeProjectId, pageId: object.pageId,
    objectId: object.id, userId: useCollaborationStore.getState().currentUser.id, type, payload, timestamp: Date.now(), version: object.version,
  };
}

function logActivity(message: string, icon: "edit" | "add" | "page" = "edit") {
  useCollaborationStore.getState().addActivity({ id: crypto.randomUUID(), userId: useCollaborationStore.getState().currentUser.id, message, createdAt: Date.now(), icon });
}

function publishDifference(before: CanvasObject[], after: CanvasObject[]) {
  const oldMap = new Map(before.map((object) => [object.id, object]));
  const newMap = new Map(after.map((object) => [object.id, object]));
  after.forEach((object) => {
    const original = oldMap.get(object.id);
    if (!original) collaborationService.publishOperation(operationFor(object, "create", object));
    else if (JSON.stringify(original) !== JSON.stringify(object)) collaborationService.publishOperation(operationFor(object, "update", object));
  });
  before.forEach((object) => {
    if (!newMap.has(object.id)) collaborationService.publishOperation(operationFor({ ...object, version: object.version + 1 }, "delete", null));
  });
}

function publishReorder(entry: CanvasHistoryEntry, before: CanvasObject[], after: CanvasObject[]) {
  if (!entry.reorder) return;
  const id = entry.changedIds[0];
  const object = after.find((item) => item.id === id);
  if (!object) return;
  const earlier = before.filter((item) => item.pageId === object.pageId);
  const later = after.filter((item) => item.pageId === object.pageId);
  const oldIndex = earlier.findIndex((item) => item.id === id);
  const newIndex = later.findIndex((item) => item.id === id);
  const neighbor = newIndex < oldIndex ? later[newIndex + 1] : later[newIndex - 1];
  if (neighbor && newIndex !== oldIndex) collaborationService.publishLayerReorder(id, neighbor.id, object.pageId);
}

export function useCanvas() {
  const pageId = useProjectStore((state) => state.activePageId);

  const create = useCallback((type: CanvasObjectType, x = 95, y = 115, extras: Partial<CanvasObject> = {}) => {
    if (!canEdit()) return null;
    const object = newObject(type, useProjectStore.getState().activePageId, x, y, extras);
    useCanvasStore.getState().addObject(object);
    collaborationService.publishOperation(operationFor(object, "create", object));
    logActivity(`added ${object.name}`, "add");
    return object;
  }, []);

  const update = useCallback((id: string, changes: Partial<CanvasObject>, description?: string) => {
    if (!canEdit()) return null;
    const object = useCanvasStore.getState().updateObject(id, changes, description);
    if (object) {
      collaborationService.publishOperation(operationFor(object, "update", changes));
      logActivity(`updated ${object.name}`);
    }
    return object;
  }, []);

  const remove = useCallback((ids?: string[]) => {
    if (!canEdit()) return;
    const selected = ids ?? useCanvasStore.getState().selectedObjectIds;
    const deleted = useCanvasStore.getState().deleteObjects(selected);
    deleted.forEach((object) => collaborationService.publishOperation(operationFor({ ...object, version: object.version + 1 }, "delete", null)));
    if (deleted.length) logActivity(`deleted ${deleted.length} layer${deleted.length > 1 ? "s" : ""}`);
  }, []);

  const undo = useCallback(() => {
    if (!canEdit()) return;
    const entry = useCanvasStore.getState().history[useCanvasStore.getState().history.length - 1];
    const before = useCanvasStore.getState().objects;
    if (useCanvasStore.getState().undo()) {
      const after = useCanvasStore.getState().objects;
      publishDifference(before, after);
      if (entry) publishReorder(entry, before, after);
      useUIStore.getState().showToast("Change undone");
    } else if (useCanvasStore.getState().history.length) useUIStore.getState().showToast("A collaborator changed this layer. Undo was safely skipped.", "info");
  }, []);

  const redo = useCallback(() => {
    if (!canEdit()) return;
    const entry = useCanvasStore.getState().future[useCanvasStore.getState().future.length - 1];
    const before = useCanvasStore.getState().objects;
    if (useCanvasStore.getState().redo()) {
      const after = useCanvasStore.getState().objects;
      publishDifference(before, after);
      if (entry) publishReorder(entry, before, after);
      useUIStore.getState().showToast("Change redone");
    } else if (useCanvasStore.getState().future.length) useUIStore.getState().showToast("A collaborator changed this layer. Redo was safely skipped.", "info");
  }, []);

  const select = useCallback((ids: string[]) => {
    useCanvasStore.getState().setSelected(ids);
    collaborationService.publishSelection(ids[0]);
  }, []);

  const duplicate = useCallback((id: string) => {
    const original = useCanvasStore.getState().objects.find((item) => item.id === id);
    if (!original || original.locked) return;
    create(original.type, original.x + 24, original.y + 24, { ...original, id: crypto.randomUUID(), name: `${original.name} copy`, x: original.x + 24, y: original.y + 24, version: 1, updatedAt: Date.now() });
  }, [create]);

  const loadTemplate = useCallback((templateId: string) => {
    if (!canEdit()) return;
    const currentPage = useProjectStore.getState().activePageId;
    const before = useCanvasStore.getState().objects;
    useCanvasStore.getState().replacePageObjects(currentPage, buildTemplateObjects(templateId, currentPage));
    publishDifference(before, useCanvasStore.getState().objects);
    useUIStore.getState().showToast("Template added to your canvas");
  }, []);

  const uploadImage = useCallback((file: File, x = 220, y = 220, onProgress?: (progress: number) => void) => new Promise<void>((resolve, reject) => {
    if (!canEdit()) { reject(new Error("You need Editor access to upload images.")); return; }
    if (!file.type.startsWith("image/")) { reject(new Error("Please choose an image file.")); return; }
    const reader = new FileReader();
    reader.onprogress = (event) => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 75)); };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 1400;
        const ratio = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const src = canvas.toDataURL("image/jpeg", 0.83);
        const width = Math.min(340, image.width / Math.max(image.height, image.width) * 340);
        const height = Math.min(300, image.height / Math.max(image.width, image.height) * 300);
        create("image", x, y, { name: file.name.replace(/\.[^.]+$/, ""), src, width: Math.max(90, width), height: Math.max(90, height), fill: "#e7e7e1" });
        onProgress?.(100);
        resolve();
      };
      image.onerror = () => reject(new Error("Could not open that image."));
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }), [create]);

  return { pageId, create, update, remove, undo, redo, select, duplicate, loadTemplate, uploadImage };
}