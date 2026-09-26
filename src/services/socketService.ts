import { io, type Socket } from "socket.io-client";
import type { CanvasComment, CollaborativeCursor, PresenceEvent, ProjectSnapshot } from "../types/collaboration";
import type { LayerReorderEvent, ObjectOperation } from "../types/canvas";
import type { Page } from "../types/project";

export interface SocketHandlers {
  onConnect: () => void;
  onDisconnect: () => void;
  onConnectError: () => void;
  onReconnecting: () => void;
  onOperation: (operation: ObjectOperation) => void;
  onCursor: (cursor: CollaborativeCursor) => void;
  onSelection: (selection: { userId: string; objectId?: string }) => void;
  onJoin: (event: PresenceEvent) => void;
  onLeave: (event: { userId: string }) => void;
  onComment: (comment: CanvasComment) => void;
  onCommentUpdated: (comment: CanvasComment) => void;
  onPageEvent: (event: { action: "created" | "renamed" | "deleted"; page: Page }) => void;
  onSnapshot: (snapshot: ProjectSnapshot) => void;
  onLayerReorder: (event: LayerReorderEvent) => void;
}

export function openProjectSocket(url: string, handlers: SocketHandlers): Socket {
  const socket = io(url, {
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 750,
    reconnectionDelayMax: 5000,
    timeout: 3000,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", handlers.onConnect);
  socket.on("disconnect", handlers.onDisconnect);
  socket.on("connect_error", handlers.onConnectError);
  socket.io.on("reconnect_attempt", handlers.onReconnecting);
  ["object:created", "object:updated", "object:moved", "object:deleted"].forEach((event) => socket.on(event, handlers.onOperation));
  socket.on("cursor:moved", handlers.onCursor);
  socket.on("object:selected", handlers.onSelection);
  socket.on("user:joined", handlers.onJoin);
  socket.on("user:left", handlers.onLeave);
  socket.on("comment:created", handlers.onComment);
  socket.on("comment:updated", handlers.onCommentUpdated);
  socket.on("page:changed", handlers.onPageEvent);
  socket.on("project:snapshot", handlers.onSnapshot);
  socket.on("layer:reordered", handlers.onLayerReorder);
  socket.connect();
  return socket;
}