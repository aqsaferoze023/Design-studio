import type { User } from "./user";
import type { CanvasObject } from "./canvas";
import type { Page } from "./project";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

export interface CollaborativeCursor {
  userId: string;
  pageId: string;
  x: number;
  y: number;
  timestamp: number;
  selectedObjectId?: string;
}

export interface CanvasComment {
  id: string;
  projectId: string;
  pageId: string;
  authorId: string;
  x: number;
  y: number;
  message: string;
  createdAt: number;
  resolved: boolean;
  replies: { id: string; authorId: string; message: string; createdAt: number }[];
}

export interface ActivityItem {
  id: string;
  userId: string;
  message: string;
  createdAt: number;
  icon: "edit" | "add" | "comment" | "page" | "share";
}

export interface VersionItem {
  id: string;
  userId: string;
  description: string;
  createdAt: number;
}

export interface PresenceEvent {
  projectId: string;
  user: User;
}

export interface ProjectSnapshot {
  projectId: string;
  objects: CanvasObject[];
  pages: Page[];
  comments: CanvasComment[];
  users: User[];
}