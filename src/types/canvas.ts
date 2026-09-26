export type CanvasObjectType =
  | "frame"
  | "group"
  | "rect"
  | "ellipse"
  | "triangle"
  | "line"
  | "arrow"
  | "text"
  | "image"
  | "icon"
  | "video"
  | "pen";

export type EditorTool =
  | "select"
  | "hand"
  | "frame"
  | "rectangle"
  | "circle"
  | "triangle"
  | "line"
  | "arrow"
  | "text"
  | "image"
  | "video"
  | "icon"
  | "comment"
  | "pen";

export interface CanvasObject {
  id: string;
  pageId: string;
  parentId?: string;
  type: CanvasObjectType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
  shadowBlur: number;
  shadowColor: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  src?: string;
  arch?: boolean;
  pathData?: string;
  points?: number[];
  visible: boolean;
  locked: boolean;
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export interface Viewport {
  x: number;
  y: number;
}

export interface CanvasHistoryEntry {
  objects: CanvasObject[];
  description: string;
  timestamp: number;
  changedIds: string[];
  reorder?: boolean;
}

export interface ObjectOperation {
  id: string;
  projectId: string;
  pageId: string;
  objectId: string;
  userId: string;
  type: "create" | "update" | "delete";
  payload: CanvasObject | Partial<CanvasObject> | null;
  timestamp: number;
  version: number;
}

export interface LayerReorderEvent {
  id: string;
  projectId: string;
  pageId: string;
  objectId: string;
  targetId: string;
  userId: string;
  timestamp: number;
}