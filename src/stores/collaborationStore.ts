import { create } from "zustand";
import { persist } from "zustand/middleware";
import { allUsers, currentUser, mockUsers } from "../data/mockUsers";
import type { ActivityItem, CanvasComment, CollaborativeCursor, ConnectionStatus, VersionItem } from "../types/collaboration";
import type { User } from "../types/user";

const now = Date.now();

const initialComments: CanvasComment[] = [
  { id: "comment-sarah", projectId: "saas-landing", pageId: "home", authorId: "sarah", x: 394, y: 247, message: "The hero section looks amazing! Maybe we can make the button slightly bigger?", createdAt: now - 120000, resolved: false, replies: [] },
  { id: "comment-ahmed", projectId: "saas-landing", pageId: "home", authorId: "ahmed", x: 633, y: 512, message: "I love this design! The colors feel so fresh and clean.", createdAt: now - 3600000, resolved: false, replies: [] },
  { id: "comment-maria", projectId: "saas-landing", pageId: "home", authorId: "maria", x: 553, y: 802, message: "Let's add a subtle animation to the feature cards.", createdAt: now - 80000, resolved: false, replies: [] },
];

const initialActivity: ActivityItem[] = [
  { id: "activity-1", userId: "sarah", message: "moved Hero Image", createdAt: now - 120000, icon: "edit" },
  { id: "activity-2", userId: "ahmed", message: "added a new text layer", createdAt: now - 1000 * 60 * 24, icon: "add" },
  { id: "activity-3", userId: "maria", message: "commented on Features", createdAt: now - 1000 * 60 * 48, icon: "comment" },
  { id: "activity-4", userId: "aqsa", message: "changed the background color", createdAt: now - 1000 * 60 * 70, icon: "edit" },
];

const initialVersions: VersionItem[] = [
  { id: "version-1", userId: "sarah", description: "Updated hero section", createdAt: now - 1000 * 60 * 18 },
  { id: "version-2", userId: "ahmed", description: "Added pricing section", createdAt: now - 1000 * 60 * 42 },
  { id: "version-3", userId: "maria", description: "Changed typography", createdAt: now - 1000 * 60 * 60 * 21 },
];

interface CollaborationState {
  currentUser: User;
  connectedUsers: User[];
  cursors: Record<string, CollaborativeCursor>;
  selections: Record<string, string | undefined>;
  connectionStatus: ConnectionStatus;
  mode: "demo" | "live";
  pendingCount: number;
  comments: CanvasComment[];
  activity: ActivityItem[];
  versions: VersionItem[];
  setConnection: (status: ConnectionStatus, mode?: "demo" | "live") => void;
  setPendingCount: (count: number) => void;
  setConnectedUsers: (users: User[]) => void;
  upsertUser: (user: User) => void;
  removeUser: (id: string) => void;
  updateCursor: (cursor: CollaborativeCursor) => void;
  setSelection: (userId: string, objectId?: string) => void;
  addComment: (comment: CanvasComment) => void;
  resolveComment: (id: string) => void;
  replyComment: (id: string, authorId: string, message: string) => void;
  addActivity: (item: ActivityItem) => void;
  addVersion: (item: VersionItem) => void;
  setCurrentUser: (user: User) => void;
}

const savedUserId = sessionStorage.getItem("collabcanvas-demo-user");
const initialUser = allUsers.find((user) => user.id === savedUserId) ?? currentUser;

export const useCollaborationStore = create<CollaborationState>()(
  persist(
    (set) => ({
      currentUser: initialUser,
      connectedUsers: mockUsers,
      cursors: {},
      selections: {},
      connectionStatus: "connecting",
      mode: "demo",
      pendingCount: 0,
      comments: initialComments,
      activity: initialActivity,
      versions: initialVersions,
      setConnection: (connectionStatus, mode) => set((state) => ({ connectionStatus, mode: mode ?? state.mode })),
      setPendingCount: (pendingCount) => set({ pendingCount }),
      setConnectedUsers: (connectedUsers) => set({ connectedUsers }),
      upsertUser: (user) => set((state) => ({ connectedUsers: [...state.connectedUsers.filter((item) => item.id !== user.id), user] })),
      removeUser: (id) => set((state) => ({ connectedUsers: state.connectedUsers.filter((user) => user.id !== id), cursors: Object.fromEntries(Object.entries(state.cursors).filter(([key]) => key !== id)) })),
      updateCursor: (cursor) => set((state) => ({ cursors: { ...state.cursors, [cursor.userId]: cursor } })),
      setSelection: (userId, objectId) => set((state) => ({ selections: { ...state.selections, [userId]: objectId } })),
      addComment: (comment) => set((state) => ({ comments: state.comments.some((item) => item.id === comment.id) ? state.comments : [comment, ...state.comments] })),
      resolveComment: (id) => set((state) => ({ comments: state.comments.map((comment) => comment.id === id ? { ...comment, resolved: !comment.resolved } : comment) })),
      replyComment: (id, authorId, message) => set((state) => ({ comments: state.comments.map((comment) => comment.id === id ? { ...comment, replies: [...comment.replies, { id: crypto.randomUUID(), authorId, message, createdAt: Date.now() }] } : comment) })),
      addActivity: (item) => set((state) => ({ activity: [item, ...state.activity].slice(0, 40) })),
      addVersion: (item) => set((state) => ({ versions: [item, ...state.versions].slice(0, 30) })),
      setCurrentUser: (user) => { sessionStorage.setItem("collabcanvas-demo-user", user.id); set({ currentUser: user }); },
    }),
    { name: "collabcanvas-collaboration-v1", partialize: (state) => ({ comments: state.comments, activity: state.activity, versions: state.versions }) },
  ),
);