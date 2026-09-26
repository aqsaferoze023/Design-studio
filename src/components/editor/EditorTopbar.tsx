import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, CloudOff, Download, Eye, Redo2, Share2, Undo2, X } from "lucide-react";
import { useCanvas } from "../../hooks/useCanvas";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import { Avatar } from "../ui/Avatar";
import { Brand } from "../ui/Brand";
import { allUsers } from "../../data/mockUsers";

export function EditorTopbar() {
  const navigate = useNavigate();
  const { undo, redo } = useCanvas();
  const projects = useProjectStore((state) => state.projects);
  const projectId = useProjectStore((state) => state.activeProjectId);
  const renameProject = useProjectStore((state) => state.renameProject);
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const zoom = useCanvasStore((state) => state.zoom);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const canUndo = useCanvasStore((state) => state.history.length > 0);
  const canRedo = useCanvasStore((state) => state.future.length > 0);
  const users = useCollaborationStore((state) => state.connectedUsers);
  const currentUser = useCollaborationStore((state) => state.currentUser);
  const setCurrentUser = useCollaborationStore((state) => state.setCurrentUser);
  const mode = useCollaborationStore((state) => state.mode);
  const setModal = useUIStore((state) => state.setModal);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const project = projects.find((item) => item.id === projectId);

  const saveName = () => {
    if (draft.trim()) renameProject(projectId, draft.trim());
    setRenaming(false);
  };

  return <header className="editor-topbar">
    <div className="mobile-top-brand"><Brand compact /></div>
    <div className="top-project-area"><div className="project-name-control"><button className="close-project" title="Back to projects" onClick={() => navigate("/dashboard")}><X size={18} /></button>{renaming ? <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={saveName} onKeyDown={(event) => { if (event.key === "Enter") saveName(); if (event.key === "Escape") setRenaming(false); }} /> : <button className="project-name-button" onClick={() => { setDraft(project?.name ?? "Untitled Design"); setRenaming(true); }} title="Rename project">{project?.name ?? "Untitled Design"} <ChevronDown size={14} /></button>}</div><div className={`save-indicator save-${saveStatus}`}>{saveStatus === "offline" ? <CloudOff size={15} /> : <Check size={15} />}{saveStatus === "saving" ? "Saving..." : saveStatus === "offline" ? "Offline - saved locally" : saveStatus === "reconnecting" ? "Reconnecting..." : mode === "demo" ? "Saved just now" : "All changes saved"}</div></div>
    <div className="editor-top-controls"><div className="top-undo-group"><button aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2 size={19} /></button><button aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}><Redo2 size={19} /></button></div><select aria-label="Canvas zoom" className="top-zoom-select" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={0.5}>50%</option><option value={0.68}>68%</option><option value={0.75}>75%</option><option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option></select></div>
    <div className="editor-top-right"><button className="avatar-stack" onClick={() => useUIStore.getState().toggleCollaboratorPanel()} title="Toggle collaborators">{users.slice(0, 4).map((user) => <Avatar key={user.id} user={user} size="sm" />)}{users.length > 3 && <span className="avatar-overflow">+{users.length - 3}</span>}</button><button className="top-text-button preview-button" onClick={() => setModal("preview")}><Eye size={17} /> <span>Preview</span></button><button className="top-share-button" onClick={() => setModal("share")}><Share2 size={17} /><span>Share</span></button><button className="top-export-button" onClick={() => setModal("export")}><Download size={17} /><span>Export</span></button><div className="top-account-wrap"><button className="top-account" onClick={() => setAccountOpen(!accountOpen)}><Avatar user={currentUser} size="sm" /><span><strong>{currentUser.name}</strong><small>{currentUser.title}</small></span><ChevronDown size={15} /></button>{accountOpen && <div className="account-menu"><div className="account-menu-label">SWITCH DEMO USER</div>{allUsers.map((user) => <button key={user.id} className="account-user-option" onClick={() => { setCurrentUser(user); setAccountOpen(false); useUIStore.getState().showToast(`Now viewing as ${user.name}`, "info"); }}><Avatar user={user} size="xs" /><span>{user.name}</span><small>{user.permission}</small>{currentUser.id === user.id && <Check size={13} />}</button>)}<div className="account-menu-divider" /><button onClick={() => { setModal("settings"); setAccountOpen(false); }}>Workspace settings</button><button onClick={() => { setModal("versions"); setAccountOpen(false); }}>Version history</button><button onClick={() => { navigate("/dashboard"); setAccountOpen(false); }}>All projects</button></div>}</div></div>
  </header>;
}