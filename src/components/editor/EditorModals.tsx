import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Download, FileImage, FileText, Globe2, Image as ImageIcon, Keyboard, Layers3, Link2, LockKeyhole, PanelRight, Search, Settings2, Share2, Square, Type, UserPlus, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "framer-motion";
import { findUser, mockUsers } from "../../data/mockUsers";
import { templates } from "../../data/mockTemplates";
import { buildLandingObjects } from "../../data/seedCanvas";
import { useCanvas } from "../../hooks/useCanvas";
import { exportDesign, renderPageCanvas, type ExportFormat, type ExportScope } from "../../services/exportService";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import type { User } from "../../types/user";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";
import { ProjectThumbnail } from "../ui/ProjectThumbnail";

const EMPTY_USERS: User[] = [];
const EMPTY_PERMISSIONS: Record<string, User["permission"]> = {};
const DEFAULT_LINK_ACCESS = { visibility: "Anyone with the link" as const, permission: "viewer" as const };

function ShareDialog({ open, close, projectName }: { open: boolean; close: () => void; projectName: string }) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<User["permission"]>("editor");
  const projectId = useProjectStore((state) => state.activeProjectId);
  const project = useProjectStore((state) => state.projects.find((item) => item.id === projectId));
  const invitedUsers = useProjectStore((state) => state.invitedUsers[projectId] ?? EMPTY_USERS);
  const permissions = useProjectStore((state) => state.projectPermissions[projectId] ?? EMPTY_PERMISSIONS);
  const linkAccess = useProjectStore((state) => state.linkAccess[projectId] ?? DEFAULT_LINK_ACCESS);
  const inviteUser = useProjectStore((state) => state.inviteUser);
  const setProjectPermission = useProjectStore((state) => state.setProjectPermission);
  const setLinkAccess = useProjectStore((state) => state.setLinkAccess);
  const people = (project?.collaboratorIds ?? []).filter((id) => id !== "aqsa").map((id) => mockUsers.find((user) => user.id === id) ?? invitedUsers.find((user) => user.id === id)).filter((user): user is User => Boolean(user));
  const showToast = useUIStore((state) => state.showToast);
  const invite = () => {
    if (useCollaborationStore.getState().currentUser.permission !== "editor") { showToast("You need Editor access to invite people.", "error"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showToast("Enter a valid email address", "error"); return; }
    const newUser: User = { id: crypto.randomUUID(), name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), title: "Invited", avatar: "", color: "#a68268", status: "away", permission };
    inviteUser(projectId, newUser);
    setEmail("");
    showToast(`Invitation sent to ${email}`);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); showToast("Project link copied to clipboard"); }
    catch { showToast("Clipboard unavailable. Copy the URL from your address bar.", "info"); }
  };
  return <Modal open={open} onClose={close} title={`Share "${projectName}"`} subtitle="Bring your people into the process."><div className="share-dialog"><div className="share-section-title">People with access <span>{people.length + 1}</span></div><div className="share-people"><div className="share-person"><Avatar user={useCollaborationStore.getState().currentUser} size="sm" /><div><strong>Aqsa <small>(you)</small></strong><span>aqsa@collabcanvas.design</span></div><em>Owner</em></div>{people.map((user) => <div className="share-person" key={user.id}><Avatar user={user} size="sm" /><div><strong>{user.name}</strong><span>{user.title === "Invited" ? "Invitation pending" : `${user.title} · ${user.status === "away" ? "Away" : "Active now"}`}</span></div><select aria-label={`${user.name} permission`} value={permissions[user.id] ?? user.permission} onChange={(event) => setProjectPermission(projectId, user.id, event.target.value as User["permission"])}><option value="viewer">Viewer</option><option value="commenter">Commenter</option><option value="editor">Editor</option></select></div>)}</div><div className="share-invite"><input value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") invite(); }} placeholder="Add people by email" aria-label="Invite by email" /><select value={permission} onChange={(event) => setPermission(event.target.value as User["permission"])} aria-label="Invite permission"><option value="editor">Editor</option><option value="commenter">Commenter</option><option value="viewer">Viewer</option></select><button onClick={invite} aria-label="Send invite"><ArrowRight size={17} /></button></div><div className="share-access"><div className="share-section-title">General access</div><div className="general-access-row"><span className="access-icon">{linkAccess.visibility === "Restricted" ? <LockKeyhole size={19} /> : <Globe2 size={19} />}</span><div><select value={linkAccess.visibility} onChange={(event) => setLinkAccess(projectId, { visibility: event.target.value as "Restricted" | "Anyone with the link" })}><option>Anyone with the link</option><option>Restricted</option></select><small>{linkAccess.visibility === "Restricted" ? "Only invited people can access" : "Anyone with the link can view this design"}</small></div><select className="general-role" value={linkAccess.permission} onChange={(event) => setLinkAccess(projectId, { permission: event.target.value as User["permission"] })} disabled={linkAccess.visibility === "Restricted"}><option value="viewer">Viewer</option><option value="commenter">Commenter</option><option value="editor">Editor</option></select></div></div><div className="share-footer"><button className="outline-button" onClick={copy}><Link2 size={17} /> Copy link</button><button className="primary-button" onClick={close}>Done</button></div></div></Modal>;
}

function ExportDialog({ open, close, projectName }: { open: boolean; close: () => void; projectName: string }) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scope, setScope] = useState<ExportScope>("frame");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const projectId = useProjectStore((state) => state.activeProjectId);
  const pageId = useProjectStore((state) => state.activePageId);
  const pages = useProjectStore((state) => state.pages);
  const objects = useCanvasStore((state) => state.objects);
  const selected = useCanvasStore((state) => state.selectedObjectIds);
  const showToast = useUIStore((state) => state.showToast);
  const formats = [{ id: "png", name: "PNG", detail: "High quality image", icon: FileImage }, { id: "jpg", name: "JPG", detail: "Smaller image file", icon: ImageIcon }, { id: "svg", name: "SVG", detail: "Scalable vector", icon: Share2 }, { id: "pdf", name: "PDF", detail: "Ready to present", icon: FileText }] as const;
  const runExport = async () => {
    setBusy(true); setProgress(0);
    try {
      await exportDesign({ format, scope, projectName, pages: pages.filter((page) => page.projectId === projectId), activePageId: pageId, objects, selectedObjectIds: selected, onProgress: setProgress });
      showToast(`${format.toUpperCase()} export is ready`);
      close();
    } catch (error) { showToast(error instanceof Error ? error.message : "Export failed. Please try again.", "error"); }
    finally { setBusy(false); setProgress(0); }
  };
  return <Modal open={open} onClose={() => { if (!busy) close(); }} title="Export design" subtitle="Take your work wherever it needs to go."><div className="export-dialog"><div className="modal-field-title">File format</div><div className="export-formats">{formats.map(({ id, name, detail, icon: Icon }) => <button key={id} className={format === id ? "active" : ""} onClick={() => setFormat(id)}><Icon size={20} /><strong>{name}</strong><small>{detail}</small>{format === id && <Check className="format-check" size={14} />}</button>)}</div><div className="modal-field-title scope-title">Export area</div><div className="export-scope">{([{ id: "frame", label: "Current frame", detail: "The active page" }, { id: "selection", label: "Selected object", detail: selected.length ? `${selected.length} selected` : "Select a layer first" }, { id: "project", label: "Entire project", detail: `${pages.filter((page) => page.projectId === projectId).length} pages` }] as const).map((item) => <label key={item.id} className={scope === item.id ? "active" : ""}><input type="radio" name="export-scope" value={item.id} checked={scope === item.id} onChange={() => setScope(item.id)} disabled={item.id === "selection" && !selected.length} /><span><strong>{item.label}</strong><small>{item.detail}</small></span></label>)}</div>{busy && <div className="export-progress"><div><span>Preparing your export...</span><strong>{progress}%</strong></div><div className="progress-track"><motion.span animate={{ width: `${progress}%` }} transition={{ duration: 0.22 }} /></div></div>}<div className="modal-actions"><button className="outline-button" disabled={busy} onClick={close}>Cancel</button><button className="primary-button" disabled={busy} onClick={runExport}><Download size={17} /> {busy ? "Exporting..." : "Export design"}</button></div></div></Modal>;
}

function CommandPalette({ open, close, onRequestImage }: { open: boolean; close: () => void; onRequestImage: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { create } = useCanvas();
  const setZoom = useCanvasStore((state) => state.setZoom);
  const zoom = useCanvasStore((state) => state.zoom);
  const commands = [
    { label: "Create rectangle", category: "CREATE", icon: Square, shortcut: "R", action: () => create("rect", 160, 180) },
    { label: "Add text", category: "CREATE", icon: Type, shortcut: "T", action: () => create("text", 160, 180) },
    { label: "Upload image", category: "CREATE", icon: ImageIcon, shortcut: "", action: onRequestImage },
    { label: "Zoom in", category: "VIEW", icon: ZoomIn, shortcut: "", action: () => setZoom(zoom + 0.1) },
    { label: "Zoom out", category: "VIEW", icon: ZoomOut, shortcut: "", action: () => setZoom(zoom - 0.1) },
    { label: "Toggle layers", category: "VIEW", icon: Layers3, shortcut: "", action: () => useUIStore.getState().toggleLeftPanel() },
    { label: "Toggle properties", category: "VIEW", icon: PanelRight, shortcut: "", action: () => useUIStore.getState().togglePropertiesPanel() },
    { label: "Invite collaborator", category: "PROJECT", icon: UserPlus, shortcut: "", action: () => useUIStore.getState().setModal("share") },
    { label: "Export design", category: "PROJECT", icon: Download, shortcut: "", action: () => useUIStore.getState().setModal("export") },
    { label: "Open settings", category: "PROJECT", icon: Settings2, shortcut: "", action: () => useUIStore.getState().setModal("settings") },
  ];
  const matches = commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const execute = (action: () => void) => { close(); setQuery(""); setTimeout(action, 0); };
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  return <Modal open={open} onClose={close} size="medium"><div className="command-dialog"><div className="command-search"><Search size={20} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && matches.length) execute(matches[0].action); }} placeholder="What would you like to do?" /><kbd>ESC</kbd></div><div className="command-results">{matches.length ? matches.map((item, index) => <button key={item.label} className={index === 0 ? "first" : ""} onClick={() => execute(item.action)}><item.icon size={18} /><span>{item.label}</span><small>{item.category}</small>{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>) : <div className="command-empty">No matching commands. Try something else.</div>}</div><div className="command-footer"><span><Keyboard size={14} /> Ctrl + K to open</span><span>Enter to select</span></div></div></Modal>;
}

function SettingsDialog({ open, close }: { open: boolean; close: () => void }) {
  const settings = useProjectStore((state) => state.settings);
  const setSettings = useProjectStore((state) => state.setSettings);
  const mode = useCollaborationStore((state) => state.mode);
  return <Modal open={open} onClose={close} title="Workspace settings" subtitle="Make the canvas work the way you do."><div className="settings-dialog"><div className="modal-field-title">Canvas preferences</div>{([{ key: "showGrid", title: "Show canvas grid", description: "Keep a subtle reference behind your work." }, { key: "snapToGrid", title: "Smart snapping", description: "Align layers with nearby edges and centers." }, { key: "showCursors", title: "Show collaborator cursors", description: "See where everyone is working in real time." }] as const).map((item) => <label className="settings-row" key={item.key}><span><strong>{item.title}</strong><small>{item.description}</small></span><input type="checkbox" checked={settings[item.key]} onChange={(event) => setSettings({ [item.key]: event.target.checked })} /><i /></label>)}<div className="settings-connection"><strong>Collaboration connection</strong><p>{mode === "demo" ? "Running in Demo Collaboration Mode. Set VITE_SOCKET_URL to your Socket.IO server URL to connect a live backend." : "Connected to your live Socket.IO server."}</p><code>{mode === "demo" ? "VITE_SOCKET_URL=https://your-server.com" : "Live server connected"}</code></div><div className="modal-actions"><button className="primary-button" onClick={close}>Done</button></div></div></Modal>;
}

function PreviewDialog({ open, close, projectName }: { open: boolean; close: () => void; projectName: string }) {
  const objects = useCanvasStore((state) => state.objects);
  const pageId = useProjectStore((state) => state.activePageId);
  const [image, setImage] = useState("");
  const [device, setDevice] = useState<"Desktop" | "Tablet" | "Mobile">("Desktop");
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setImage("");
    renderPageCanvas(objects.filter((object) => object.pageId === pageId), undefined, 1.3).then((canvas) => { if (alive) setImage(canvas.toDataURL("image/png")); });
    return () => { alive = false; };
  }, [open, objects, pageId]);
  return <Modal open={open} onClose={close} title="Design preview" subtitle={`Viewing ${projectName} without the editor.`} size="large"><div className="preview-dialog"><div className="preview-device-toggle">{(["Desktop", "Tablet", "Mobile"] as const).map((item) => <button key={item} className={device === item ? "active" : ""} onClick={() => setDevice(item)}>{item}</button>)}</div><div className="preview-stage">{image ? <div className={`preview-artboard preview-${device.toLowerCase()}`}><img src={image} alt={`Preview of ${projectName}`} /></div> : <div className="preview-skeleton"><div /><div /><div /></div>}</div></div></Modal>;
}

function VersionsDialog({ open, close }: { open: boolean; close: () => void }) {
  const versions = useCollaborationStore((state) => state.versions);
  const history = useCanvasStore((state) => state.history);
  const objects = useCanvasStore((state) => state.objects);
  const pageId = useProjectStore((state) => state.activePageId);
  const [selected, setSelected] = useState("current");
  const [image, setImage] = useState("");
  const entries = useMemo(() => [{ id: "current", description: "Current version", createdAt: Date.now(), userId: "aqsa" }, ...history.map((entry, index) => ({ id: `history-${index}`, description: entry.description, createdAt: entry.timestamp, userId: "aqsa" })).reverse(), ...versions], [history, versions]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setImage("");
    const chosen = selected.startsWith("history-") ? history[Number(selected.split("-")[1])]?.objects ?? objects : selected === "current" ? objects : buildLandingObjects(pageId);
    renderPageCanvas(chosen.filter((object) => object.pageId === pageId), undefined, 0.8).then((canvas) => { if (alive) setImage(canvas.toDataURL("image/png")); });
    return () => { alive = false; };
  }, [open, selected, history, objects, pageId]);
  return <Modal open={open} onClose={close} title="Version history" subtitle="A timeline of how this design came together." size="large"><div className="versions-dialog"><div className="version-list"><div className="version-list-label">TODAY</div>{entries.map((entry) => <button key={entry.id} className={selected === entry.id ? "active" : ""} onClick={() => setSelected(entry.id)}><span className="version-dot" /><div><strong>{entry.description}</strong><small>{findUser(entry.userId).name} · {new Date(entry.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div></button>)}</div><div className="version-preview"><div className="version-preview-header"><Clock3 size={17} /> Read-only preview <span>{entries.find((item) => item.id === selected)?.description}</span></div>{image ? <img src={image} alt="Version preview" /> : <div className="version-preview-loading" />}</div></div></Modal>;
}

function TemplatesDialog({ open, close }: { open: boolean; close: () => void }) {
  const { loadTemplate } = useCanvas();
  return <Modal open={open} onClose={close} title="Explore templates" subtitle="Choose a starting point for this page." size="large"><div className="modal-template-grid">{templates.map((template) => <button key={template.id} onClick={() => { loadTemplate(template.id); close(); }}><ProjectThumbnail variant={template.thumbnail} compact /><strong>{template.name}</strong><small>{template.category}</small></button>)}</div></Modal>;
}

export function EditorModals({ onRequestImage }: { onRequestImage: () => void }) {
  const modal = useUIStore((state) => state.modal);
  const setModal = useUIStore((state) => state.setModal);
  const projectId = useProjectStore((state) => state.activeProjectId);
  const projectName = useProjectStore((state) => state.projects.find((item) => item.id === projectId)?.name ?? "Untitled Design");
  const close = () => setModal(null);
  return <><ShareDialog open={modal === "share"} close={close} projectName={projectName} /><ExportDialog open={modal === "export"} close={close} projectName={projectName} /><CommandPalette open={modal === "command"} close={close} onRequestImage={onRequestImage} /><SettingsDialog open={modal === "settings"} close={close} /><PreviewDialog open={modal === "preview"} close={close} projectName={projectName} /><VersionsDialog open={modal === "versions"} close={close} /><TemplatesDialog open={modal === "templates"} close={close} /></>;
}