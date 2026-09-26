import type { Socket } from "socket.io-client";
import { allUsers, findUser } from "../data/mockUsers";
import { useCanvasStore } from "../stores/canvasStore";
import { useCollaborationStore } from "../stores/collaborationStore";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import type { CanvasComment, CollaborativeCursor, ProjectSnapshot } from "../types/collaboration";
import type { CanvasObject, LayerReorderEvent, ObjectOperation } from "../types/canvas";
import type { Page } from "../types/project";
import { openProjectSocket } from "./socketService";

interface PendingEvent { event: string; payload: unknown }
const QUEUE_KEY = "collabcanvas-pending-v1";

class CollaborationService {
  private socket: Socket | null = null;
  private channel: BroadcastChannel | null = null;
  private clientId = crypto.randomUUID();
  private projectId = "";
  private joinedUserId = "";
  private demoTimer: ReturnType<typeof setInterval> | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorLastSent = 0;
  private moveLastSent = 0;
  private mockTick = 0;
  private seen = new Set<string>();
  private queue: PendingEvent[] = this.readQueue();
  private get currentUser() { return useCollaborationStore.getState().currentUser; }
  private handleOnline = () => {
    if (this.socket && !this.socket.connected) {
      useCollaborationStore.getState().setConnection("reconnecting", "live");
      useProjectStore.getState().setSaveStatus("reconnecting");
      this.socket.connect();
    } else if (!this.socket) {
      useCollaborationStore.getState().setConnection("connected", "demo");
      // With no server configured, local persistence is the sync destination.
      this.queue = [];
      this.persistQueue();
      useProjectStore.getState().markSaved();
    }
  };
  private handleOffline = () => {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    useCollaborationStore.getState().setConnection("offline");
    useProjectStore.getState().setSaveStatus("offline");
  };

  private readQueue(): PendingEvent[] {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as PendingEvent[]; }
    catch { return []; }
  }

  private persistQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    useCollaborationStore.getState().setPendingCount(this.queue.length);
  }

  start(projectId: string) {
    this.stop();
    this.projectId = projectId;
    this.joinedUserId = this.currentUser.id;
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(`collabcanvas:${projectId}`);
      this.channel.onmessage = (message: MessageEvent<{ sourceId: string; event: string; payload: unknown }>) => {
        if (message.data.sourceId === this.clientId) return;
        const { event, payload } = message.data;
        if (event.startsWith("object:" ) && event !== "object:selected") this.receiveOperation(payload as ObjectOperation);
        if (event === "object:selected") { const selection = payload as { userId: string; objectId?: string }; useCollaborationStore.getState().setSelection(selection.userId, selection.objectId); }
        if (event === "cursor:moved") useCollaborationStore.getState().updateCursor(payload as CollaborativeCursor);
        if (event === "comment:created") this.receiveComment(payload as CanvasComment);
        if (event === "comment:updated") { const comment = payload as CanvasComment; useCollaborationStore.setState((state) => ({ comments: state.comments.map((item) => item.id === comment.id ? comment : item) })); }
        if (event === "page:changed") { const change = payload as { action: "created" | "renamed" | "deleted"; page: Page }; this.receivePage(change.action, change.page); }
        if (event === "layer:reordered") this.receiveLayerReorder(payload as LayerReorderEvent);
      };
    }
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    this.seen.clear();
    useCollaborationStore.getState().setPendingCount(this.queue.length);
    useCollaborationStore.getState().setConnection("connecting");
    const url = import.meta.env.VITE_SOCKET_URL as string | undefined;
    if (!url) {
      this.enableDemo();
      return;
    }

    this.socket = openProjectSocket(url, {
      onConnect: () => {
        this.clearDemo();
        if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
        useCollaborationStore.getState().setConnection("connected", "live");
        useProjectStore.getState().setSaveStatus("saved");
        this.socket?.emit("project:join", { projectId, room: `project:${projectId}`, user: this.currentUser });
        this.snapshotTimer = setTimeout(() => this.flushQueue(), 900);
      },
      onDisconnect: () => {
        useCollaborationStore.getState().setConnection(navigator.onLine ? "reconnecting" : "offline", "live");
        useProjectStore.getState().setSaveStatus(navigator.onLine ? "reconnecting" : "offline");
        this.fallbackTimer = setTimeout(() => this.enableDemo(), 2200);
      },
      onConnectError: () => {
        if (!this.demoTimer) this.enableDemo();
      },
      onReconnecting: () => {
        if (!this.demoTimer) useCollaborationStore.getState().setConnection("reconnecting", "live");
      },
      onOperation: (operation) => this.receiveOperation(operation),
      onCursor: (cursor) => { if (cursor.userId !== this.currentUser.id) useCollaborationStore.getState().updateCursor(cursor); },
      onSelection: ({ userId, objectId }) => { if (userId !== this.currentUser.id) useCollaborationStore.getState().setSelection(userId, objectId); },
      onJoin: ({ user }) => { if (user.id !== this.currentUser.id) useCollaborationStore.getState().upsertUser(user); },
      onLeave: ({ userId }) => useCollaborationStore.getState().removeUser(userId),
      onComment: (comment) => { if (comment.authorId !== this.currentUser.id) this.receiveComment(comment); },
      onCommentUpdated: (comment) => {
        useCollaborationStore.setState((state) => ({ comments: state.comments.map((item) => item.id === comment.id ? comment : item) }));
      },
      onPageEvent: ({ action, page }) => this.receivePage(action, page),
      onSnapshot: (snapshot) => { this.receiveSnapshot(snapshot); if (this.snapshotTimer) clearTimeout(this.snapshotTimer); this.flushQueue(); },
      onLayerReorder: (event) => this.receiveLayerReorder(event),
    });
    this.fallbackTimer = setTimeout(() => { if (!this.socket?.connected) this.enableDemo(); }, 3000);
  }

  stop() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.channel?.close();
    this.channel = null;
    this.clearDemo();
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.socket) {
      if (this.socket.connected) this.socket.emit("project:leave", { projectId: this.projectId, userId: this.joinedUserId });
      this.socket.removeAllListeners();
      this.socket.io.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private clearDemo() {
    if (this.demoTimer) clearInterval(this.demoTimer);
    this.demoTimer = null;
  }

  private enableDemo() {
    if (this.demoTimer) return;
    useCollaborationStore.getState().setConnection(navigator.onLine ? "connected" : "offline", "demo");
    useCollaborationStore.getState().setConnectedUsers(allUsers.filter((user) => user.id !== this.currentUser.id));
    const moveCursors = () => {
      this.mockTick++;
      const pageId = useProjectStore.getState().activePageId;
      const positions = [
        { userId: "sarah", x: 153 + Math.sin(this.mockTick * 0.72) * 24, y: 125 + Math.cos(this.mockTick * 0.5) * 18 },
        { userId: "ahmed", x: 748 + Math.cos(this.mockTick * 0.5) * 20, y: 257 + Math.sin(this.mockTick * 0.7) * 22 },
        { userId: "maria", x: 684 + Math.sin(this.mockTick * 0.4) * 27, y: 813 + Math.cos(this.mockTick * 0.65) * 19 },
      ];
      positions.forEach((cursor) => useCollaborationStore.getState().updateCursor({ ...cursor, pageId, timestamp: Date.now() }));
      if (this.mockTick % 16 === 0 && pageId === "home") this.simulateRemoteEdit();
      if (this.mockTick % 25 === 0 && pageId === "home") this.simulateRemoteComment();
    };
    moveCursors();
    this.demoTimer = setInterval(moveCursors, 1300);
  }

  private simulateRemoteEdit() {
    const object = useCanvasStore.getState().objects.find((item) => item.id === "home-feature-card-1");
    if (!object) return;
    const operation: ObjectOperation = {
      id: crypto.randomUUID(), projectId: this.projectId, pageId: "home", objectId: object.id,
      userId: this.currentUser.id === "sarah" ? "ahmed" : "sarah", type: "update", payload: { stroke: object.stroke === "#f8c9c7" ? "#e9b9bd" : "#f8c9c7" },
      version: object.version + 1, timestamp: Date.now(),
    };
    this.receiveOperation(operation);
  }

  private simulateRemoteComment() {
    if (useCollaborationStore.getState().comments.some((comment) => comment.id === "demo-live-comment")) return;
    this.receiveComment({
      id: "demo-live-comment", projectId: this.projectId, pageId: "home", authorId: this.currentUser.id === "maria" ? "sarah" : "maria",
      x: 406, y: 884, message: "The new feature layout is looking great. Love where this is going!",
      createdAt: Date.now(), resolved: false, replies: [],
    });
  }

  private receiveOperation(operation: ObjectOperation) {
    if (!operation || this.seen.has(operation.id)) return;
    this.seen.add(operation.id);
    if (this.seen.size > 500) this.seen.clear();
    const applied = useCanvasStore.getState().applyRemoteOperation(operation);
    if (!applied) {
      useUIStore.getState().showToast("A newer edit was kept. No changes were overwritten.", "info");
      return;
    }
    const object = useCanvasStore.getState().objects.find((item) => item.id === operation.objectId);
    const verb = operation.type === "create" ? "added" : operation.type === "delete" ? "deleted" : "updated";
    useCollaborationStore.getState().addActivity({ id: operation.id, userId: operation.userId, message: `${verb} ${object?.name ?? "a layer"}`, createdAt: Date.now(), icon: operation.type === "create" ? "add" : "edit" });
  }

  private receiveComment(comment: CanvasComment) {
    if (useCollaborationStore.getState().comments.some((item) => item.id === comment.id)) return;
    useCollaborationStore.getState().addComment(comment);
    useCollaborationStore.getState().addActivity({ id: crypto.randomUUID(), userId: comment.authorId, message: "left a comment", createdAt: Date.now(), icon: "comment" });
  }

  private receivePage(action: "created" | "renamed" | "deleted", page: Page) {
    const store = useProjectStore.getState();
    if (action === "created" && !store.pages.some((item) => item.id === page.id)) useProjectStore.setState({ pages: [...store.pages, page] });
    if (action === "renamed") store.renamePage(page.id, page.name);
    if (action === "deleted") useProjectStore.setState({ pages: store.pages.filter((item) => item.id !== page.id) });
  }

  private receiveLayerReorder(event: LayerReorderEvent) {
    if (this.seen.has(event.id)) return;
    this.seen.add(event.id);
    useCanvasStore.getState().applyRemoteReorder(event.objectId, event.targetId);
  }

  private receiveSnapshot(snapshot: ProjectSnapshot) {
    if (snapshot.projectId !== this.projectId) return;
    const projectStore = useProjectStore.getState();
    const localPages = projectStore.pages.filter((page) => page.projectId === this.projectId);
    const projectPageIds = new Set([...localPages, ...snapshot.pages].map((page) => page.id));
    const pendingIds = new Set(this.queue.map((item) => (item.payload as { objectId?: string })?.objectId).filter(Boolean));
    const localObjects = useCanvasStore.getState().objects;
    const localById = new Map(localObjects.map((object) => [object.id, object]));
    const serverIds = new Set(snapshot.objects.map((object) => object.id));
    const merged = snapshot.objects.map((serverObject) => {
      const local = localById.get(serverObject.id);
      return local && (pendingIds.has(local.id) || local.version > serverObject.version && local.updatedAt > serverObject.updatedAt) ? local : serverObject;
    });
    const pendingCreates = localObjects.filter((object) => projectPageIds.has(object.pageId) && pendingIds.has(object.id) && !serverIds.has(object.id));
    useCanvasStore.setState({ objects: [...localObjects.filter((object) => !projectPageIds.has(object.pageId)), ...merged, ...pendingCreates] });
    if (snapshot.pages.length) {
      useProjectStore.setState({ pages: [...projectStore.pages.filter((page) => page.projectId !== this.projectId), ...snapshot.pages], activePageId: snapshot.pages.some((page) => page.id === projectStore.activePageId) ? projectStore.activePageId : snapshot.pages[0].id });
    }
    const collaboration = useCollaborationStore.getState();
    const pendingCommentIds = new Set(this.queue.filter((item) => item.event === "comment:created").map((item) => (item.payload as CanvasComment).id));
    const localPendingComments = collaboration.comments.filter((comment) => pendingCommentIds.has(comment.id));
    useCollaborationStore.setState({
      comments: [...collaboration.comments.filter((comment) => comment.projectId !== this.projectId), ...snapshot.comments, ...localPendingComments.filter((comment) => !snapshot.comments.some((item) => item.id === comment.id))],
      connectedUsers: snapshot.users.filter((user) => user.id !== this.currentUser.id),
    });
  }

  private emit(event: string, payload: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, payload);
    } else if (this.socket || !navigator.onLine) {
      this.queue.push({ event, payload });
      this.persistQueue();
    }
    if (!this.socket?.connected) this.channel?.postMessage({ sourceId: this.clientId, event, payload });
    if (navigator.onLine) {
      useProjectStore.getState().setSaveStatus("saving");
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => useProjectStore.getState().markSaved(), 650);
    } else {
      useProjectStore.getState().setSaveStatus("offline");
    }
  }

  private flushQueue() {
    if (!this.socket?.connected) return;
    this.queue.forEach(({ event, payload }) => this.socket?.emit(event, payload));
    this.queue = [];
    this.persistQueue();
    useProjectStore.getState().markSaved();
  }

  publishOperation(operation: ObjectOperation) {
    this.seen.add(operation.id);
    const event = operation.type === "create" ? "object:created" : operation.type === "delete" ? "object:deleted" : "object:updated";
    this.emit(event, operation);
  }

  publishPageObjects(objects: CanvasObject[], type: "create" | "delete") {
    objects.forEach((object) => this.publishOperation({
      id: crypto.randomUUID(), projectId: this.projectId, pageId: object.pageId, objectId: object.id,
      userId: this.currentUser.id, type, payload: type === "create" ? object : null,
      version: type === "create" ? object.version : object.version + 1, timestamp: Date.now(),
    }));
  }

  publishTransientMove(objectId: string, pageId: string, x: number, y: number, version: number) {
    const time = performance.now();
    if (time - this.moveLastSent < 80) return;
    this.moveLastSent = time;
    const operation: ObjectOperation = {
      id: crypto.randomUUID(), projectId: this.projectId, pageId, objectId, userId: this.currentUser.id,
      type: "update", payload: { x, y }, version, timestamp: Date.now(),
    };
    if (this.socket?.connected) this.socket.volatile.emit("object:moved", operation);
    else this.channel?.postMessage({ sourceId: this.clientId, event: "object:moved", payload: operation });
  }

  publishPage(action: "created" | "renamed" | "deleted", page: Page) {
    this.emit("page:changed", { projectId: this.projectId, action, page, userId: this.currentUser.id, timestamp: Date.now() });
  }

  publishLayerReorder(objectId: string, targetId: string, pageId: string) {
    const event: LayerReorderEvent = { id: crypto.randomUUID(), projectId: this.projectId, pageId, objectId, targetId, userId: this.currentUser.id, timestamp: Date.now() };
    this.seen.add(event.id);
    this.emit("layer:reordered", event);
  }

  publishComment(comment: CanvasComment) { this.emit("comment:created", comment); }

  publishCommentUpdate(comment: CanvasComment) { this.emit("comment:updated", comment); }

  publishSelection(objectId?: string) {
    if (this.socket?.connected) this.socket.emit("object:selected", { projectId: this.projectId, userId: this.currentUser.id, objectId });
    else this.channel?.postMessage({ sourceId: this.clientId, event: "object:selected", payload: { userId: this.currentUser.id, objectId } });
  }

  publishCursor(cursor: Omit<CollaborativeCursor, "userId" | "timestamp">) {
    const time = performance.now();
    if (time - this.cursorLastSent < 55) return;
    this.cursorLastSent = time;
    const payload = { ...cursor, projectId: this.projectId, userId: this.currentUser.id, timestamp: Date.now() };
    if (this.socket?.connected) this.socket.volatile.emit("cursor:moved", payload);
    else this.channel?.postMessage({ sourceId: this.clientId, event: "cursor:moved", payload });
  }

  getUserName(id: string) { return findUser(id).name; }
}

export const collaborationService = new CollaborationService();