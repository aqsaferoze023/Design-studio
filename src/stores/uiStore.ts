import { create } from "zustand";

export type ModalType = "share" | "export" | "command" | "settings" | "preview" | "versions" | "newProject" | "templates" | null;

interface UIState {
  modal: ModalType;
  sidebarView: "layers" | "assets";
  inspectorTab: "properties" | "comments" | "activity";
  leftPanelOpen: boolean;
  propertiesPanelOpen: boolean;
  collaboratorPanelOpen: boolean;
  toast: { id: number; message: string; kind: "success" | "error" | "info" } | null;
  setModal: (modal: ModalType) => void;
  setSidebarView: (view: UIState["sidebarView"]) => void;
  setInspectorTab: (tab: UIState["inspectorTab"]) => void;
  toggleLeftPanel: () => void;
  togglePropertiesPanel: () => void;
  toggleCollaboratorPanel: () => void;
  showToast: (message: string, kind?: "success" | "error" | "info") => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  modal: null,
  sidebarView: "layers",
  inspectorTab: "properties",
  leftPanelOpen: true,
  propertiesPanelOpen: true,
  collaboratorPanelOpen: true,
  toast: null,
  setModal: (modal) => set({ modal }),
  setSidebarView: (sidebarView) => set({ sidebarView, leftPanelOpen: true }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  togglePropertiesPanel: () => set((state) => ({ propertiesPanelOpen: !state.propertiesPanelOpen })),
  toggleCollaboratorPanel: () => set((state) => ({ collaboratorPanelOpen: !state.collaboratorPanelOpen })),
  showToast: (message, kind = "success") => set({ toast: { id: Date.now(), message, kind } }),
  clearToast: () => set({ toast: null }),
}));