import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialPages, initialProjects } from "../data/mockProjects";
import type { Page, Project, ProjectSettings } from "../types/project";
import type { User } from "../types/user";
import { useCollaborationStore } from "./collaborationStore";

interface ProjectState {
  projects: Project[];
  pages: Page[];
  invitedUsers: Record<string, User[]>;
  projectPermissions: Record<string, Record<string, User["permission"]>>;
  linkAccess: Record<string, { visibility: "Anyone with the link" | "Restricted"; permission: User["permission"] }>;
  activeProjectId: string;
  activePageId: string;
  settings: ProjectSettings;
  saveStatus: "saved" | "saving" | "offline" | "reconnecting";
  lastSavedAt: number;
  setActiveProject: (id: string) => void;
  setActivePage: (id: string) => void;
  createProject: (name: string, thumbnail?: Project["thumbnail"]) => { project: Project; page: Page };
  renameProject: (id: string, name: string) => void;
  inviteUser: (projectId: string, user: User) => void;
  setProjectPermission: (projectId: string, userId: string, permission: User["permission"]) => void;
  setLinkAccess: (projectId: string, changes: Partial<{ visibility: "Anyone with the link" | "Restricted"; permission: User["permission"] }>) => void;
  createPage: (projectId: string, name?: string) => Page;
  duplicatePage: (pageId: string) => Page | null;
  renamePage: (id: string, name: string) => void;
  deletePage: (id: string) => boolean;
  setSettings: (settings: Partial<ProjectSettings>) => void;
  setSaveStatus: (status: ProjectState["saveStatus"]) => void;
  markSaved: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: initialProjects,
      pages: initialPages,
      invitedUsers: {},
      projectPermissions: {},
      linkAccess: {},
      activeProjectId: "saas-landing",
      activePageId: "home",
      settings: { snapToGrid: true, showGrid: true, showCursors: true },
      saveStatus: "saved",
      lastSavedAt: Date.now(),
      setActiveProject: (id) => set((state) => ({ activeProjectId: id, activePageId: state.pages.find((page) => page.projectId === id)?.id ?? "", saveStatus: "saved" })),
      setActivePage: (id) => set({ activePageId: id }),
      createProject: (name, thumbnail = "landing") => {
        const id = crypto.randomUUID();
        const project: Project = { id, name: name.trim() || "Untitled Design", description: "Your next great idea starts here.", ownerId: useCollaborationStore.getState().currentUser.id, collaboratorIds: [], createdAt: Date.now(), updatedAt: Date.now(), thumbnail, status: "Draft" };
        const page: Page = { id: crypto.randomUUID(), projectId: id, name: "Home", order: 0 };
        set((state) => ({ projects: [project, ...state.projects], pages: [...state.pages, page], activeProjectId: id, activePageId: page.id }));
        return { project, page };
      },
      renameProject: (id, name) => set((state) => ({ projects: state.projects.map((project) => project.id === id ? { ...project, name, updatedAt: Date.now() } : project) })),
      inviteUser: (projectId, user) => set((state) => ({
        invitedUsers: { ...state.invitedUsers, [projectId]: [...(state.invitedUsers[projectId] ?? []), user] },
        projects: state.projects.map((project) => project.id === projectId ? { ...project, collaboratorIds: [...project.collaboratorIds, user.id] } : project),
      })),
      setProjectPermission: (projectId, userId, permission) => set((state) => ({ projectPermissions: { ...state.projectPermissions, [projectId]: { ...(state.projectPermissions[projectId] ?? {}), [userId]: permission } } })),
      setLinkAccess: (projectId, changes) => set((state) => ({ linkAccess: { ...state.linkAccess, [projectId]: { ...(state.linkAccess[projectId] ?? { visibility: "Anyone with the link", permission: "viewer" }), ...changes } } })),
      createPage: (projectId, name) => {
        const pages = get().pages.filter((page) => page.projectId === projectId);
        const page: Page = { id: crypto.randomUUID(), projectId, name: name || `Page ${pages.length + 1}`, order: pages.length };
        set((state) => ({ pages: [...state.pages, page], activePageId: page.id }));
        return page;
      },
      duplicatePage: (pageId) => {
        const source = get().pages.find((page) => page.id === pageId);
        if (!source) return null;
        const page: Page = { ...source, id: crypto.randomUUID(), name: `${source.name} copy`, order: get().pages.filter((item) => item.projectId === source.projectId).length };
        set((state) => ({ pages: [...state.pages, page], activePageId: page.id }));
        return page;
      },
      renamePage: (id, name) => set((state) => ({ pages: state.pages.map((page) => page.id === id ? { ...page, name } : page) })),
      deletePage: (id) => {
        const state = get();
        const page = state.pages.find((item) => item.id === id);
        if (!page || state.pages.filter((item) => item.projectId === page.projectId).length <= 1) return false;
        const remaining = state.pages.filter((item) => item.id !== id);
        set({ pages: remaining, activePageId: state.activePageId === id ? remaining.find((item) => item.projectId === page.projectId)?.id ?? "" : state.activePageId });
        return true;
      },
      setSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      markSaved: () => set((state) => ({ saveStatus: "saved", lastSavedAt: Date.now(), projects: state.projects.map((project) => project.id === state.activeProjectId ? { ...project, updatedAt: Date.now() } : project) })),
    }),
    { name: "collabcanvas-projects-v1", partialize: (state) => ({ projects: state.projects, pages: state.pages, invitedUsers: state.invitedUsers, projectPermissions: state.projectPermissions, linkAccess: state.linkAccess, settings: state.settings }) },
  ),
);