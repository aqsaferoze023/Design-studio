import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layers3, PanelRight, UsersRound, UploadCloud } from "lucide-react";
import { DesignCanvas } from "../../components/canvas/DesignCanvas";
import { EditorModals } from "../../components/editor/EditorModals";
import { EditorTopbar } from "../../components/editor/EditorTopbar";
import { GlobalSidebar } from "../../components/editor/GlobalSidebar";
import { ToolBar } from "../../components/editor/ToolBar";
import { CollaborationPanel } from "../../components/panels/CollaborationPanel";
import { LeftPanel } from "../../components/panels/LeftPanel";
import { PropertiesPanel } from "../../components/panels/PropertiesPanel";
import { useCanvas } from "../../hooks/useCanvas";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useSocket } from "../../hooks/useSocket";
import { useProjectStore } from "../../stores/projectStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useUIStore } from "../../stores/uiStore";

export default function EditorPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const projects = useProjectStore((state) => state.projects);
  const userId = useCollaborationStore((state) => state.currentUser.id);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const leftOpen = useUIStore((state) => state.leftPanelOpen);
  const propertiesOpen = useUIStore((state) => state.propertiesPanelOpen);
  const collaboratorsOpen = useUIStore((state) => state.collaboratorPanelOpen);
  const showToast = useUIStore((state) => state.showToast);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { uploadImage } = useCanvas();
  useSocket(projectId, userId);
  useKeyboardShortcuts();

  useEffect(() => {
    if (window.innerWidth <= 760) useUIStore.setState({ leftPanelOpen: false, propertiesPanelOpen: false, collaboratorPanelOpen: false });
    else if (window.innerWidth <= 1100) useUIStore.setState({ collaboratorPanelOpen: false });
  }, []);

  useEffect(() => {
    if (projectId && useProjectStore.getState().projects.some((project) => project.id === projectId) && useProjectStore.getState().activeProjectId !== projectId) setActiveProject(projectId);
  }, [projectId, setActiveProject]);
  const project = projects.find((item) => item.id === projectId);
  const onRequestImage = () => inputRef.current?.click();
  const onUploadFile = async (file: File, x?: number, y?: number) => {
    setUploadProgress(1);
    try {
      await uploadImage(file, x, y, setUploadProgress);
      showToast("Image added to the canvas");
      setTimeout(() => setUploadProgress(null), 750);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Image upload failed", "error");
      setUploadProgress(null);
    }
  };

  if (!project) return <div className="project-not-found"><div><span>404 / PROJECT NOT FOUND</span><h1>That canvas isn't here.</h1><p>It may have been moved, or the link might be out of date.</p><button className="primary-button" onClick={() => navigate("/dashboard")}>Back to your workspace</button></div></div>;

  return <div className="app-shell editor-shell"><GlobalSidebar /><div className="editor-main"><EditorTopbar /><div className={`editor-columns ${leftOpen ? "" : "left-collapsed"} ${propertiesOpen ? "" : "properties-collapsed"} ${collaboratorsOpen ? "" : "collaborators-collapsed"}`}><LeftPanel onRequestImage={onRequestImage} /><main className="canvas-column"><ToolBar onRequestImage={onRequestImage} /><DesignCanvas onRequestImage={onRequestImage} onUploadFile={onUploadFile} />{uploadProgress !== null && <div className="upload-progress"><div><UploadCloud size={18} /><span>Uploading image...</span><strong>{uploadProgress}%</strong></div><div className="progress-track"><span style={{ width: `${uploadProgress}%` }} /></div></div>}</main><PropertiesPanel /><CollaborationPanel /></div><div className="mobile-panel-switcher"><button onClick={() => useUIStore.getState().toggleLeftPanel()} className={leftOpen ? "active" : ""}><Layers3 size={18} /> Layers</button><button onClick={() => useUIStore.getState().togglePropertiesPanel()} className={propertiesOpen ? "active" : ""}><PanelRight size={18} /> Properties</button><button onClick={() => useUIStore.getState().toggleCollaboratorPanel()} className={collaboratorsOpen ? "active" : ""}><UsersRound size={18} /> Team</button></div></div><input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadFile(file); event.target.value = ""; }} /><EditorModals onRequestImage={onRequestImage} /></div>;
}