import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Frame, Grip, History, Image as ImageIcon, Layers3, LockKeyhole, Magnet, MoreHorizontal, Plus, Shapes, Square, Type, UnlockKeyhole, Upload, X } from "lucide-react";
import { buildSecondaryObjects } from "../../data/seedCanvas";
import { useCanvas } from "../../hooks/useCanvas";
import { collaborationService } from "../../services/collaborationService";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import type { CanvasObject } from "../../types/canvas";
import { ProjectThumbnail } from "../ui/ProjectThumbnail";

const layerIcon = (type: CanvasObject["type"]) => type === "text" ? Type : type === "image" ? ImageIcon : type === "frame" || type === "group" ? Frame : type === "rect" ? Square : Shapes;

interface LayerRowProps {
  object: CanvasObject;
  objects: CanvasObject[];
  level: number;
  selected: string[];
  expanded: Set<string>;
  toggle: (id: string) => void;
  select: (ids: string[]) => void;
  update: (id: string, changes: Partial<CanvasObject>) => void;
  remove: (ids: string[]) => void;
  duplicate: (id: string) => void;
}

function LayerRow({ object, objects, level, selected, expanded, toggle, select, update, remove, duplicate }: LayerRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(object.name);
  const [menu, setMenu] = useState(false);
  const children = objects.filter((item) => item.parentId === object.id);
  const hasChildren = children.length > 0;
  const Icon = layerIcon(object.type);
  const saveName = () => { if (draft.trim()) update(object.id, { name: draft.trim() }); setRenaming(false); };
  return <><div className={`layer-row ${selected.includes(object.id) ? "selected" : ""} ${!object.visible ? "layer-hidden" : ""}`} style={{ paddingLeft: 7 + level * 19 }} draggable={!object.locked && useCollaborationStore.getState().currentUser.permission === "editor"} onDragStart={(event) => event.dataTransfer.setData("text/layer-id", object.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (useCollaborationStore.getState().currentUser.permission !== "editor") return; const sourceId = event.dataTransfer.getData("text/layer-id"); if (sourceId && sourceId !== object.id) { useCanvasStore.getState().reorderObject(sourceId, object.id); collaborationService.publishLayerReorder(sourceId, object.id, object.pageId); } }}>
    <button className="layer-expand" onClick={() => hasChildren && toggle(object.id)} aria-label={expanded.has(object.id) ? "Collapse layer" : "Expand layer"}>{hasChildren ? expanded.has(object.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}</button>
    <button className="layer-name-area" onClick={(event) => { if (hasChildren) toggle(object.id); if (object.type !== "group") select(event.shiftKey ? [...selected, object.id] : [object.id]); }} onDoubleClick={() => { setDraft(object.name); setRenaming(true); }}><Icon size={15} strokeWidth={1.9} />{renaming ? <input autoFocus value={draft} onClick={(event) => event.stopPropagation()} onChange={(event) => setDraft(event.target.value)} onBlur={saveName} onKeyDown={(event) => { if (event.key === "Enter") saveName(); if (event.key === "Escape") setRenaming(false); }} /> : <span>{object.name}</span>}</button>
    <div className="layer-row-actions"><button title={object.visible ? "Hide layer" : "Show layer"} onClick={() => update(object.id, { visible: !object.visible })}>{object.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button><button title={object.locked ? "Unlock layer" : "Lock layer"} onClick={() => update(object.id, { locked: !object.locked })}>{object.locked ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}</button><div className="relative"><button title="Layer actions" onClick={() => setMenu(!menu)}><MoreHorizontal size={14} /></button>{menu && <div className="layer-context-menu"><button onClick={() => { setRenaming(true); setMenu(false); }}>Rename</button><button onClick={() => { duplicate(object.id); setMenu(false); }}>Duplicate</button><button className="danger" onClick={() => { remove([object.id]); setMenu(false); }}>Delete</button></div>}</div></div>
  </div>{hasChildren && expanded.has(object.id) && children.map((child) => <LayerRow key={child.id} object={child} objects={objects} level={level + 1} selected={selected} expanded={expanded} toggle={toggle} select={select} update={update} remove={remove} duplicate={duplicate} />)}</>;
}

function AssetsView({ onRequestImage }: { onRequestImage: () => void }) {
  const { create } = useCanvas();
  const allObjects = useCanvasStore((state) => state.objects);
  const uploaded = [{ src: "/images/plant-hero.jpg", name: "Botanical photo" }, ...allObjects.filter((object) => object.type === "image" && object.src && object.src !== "/images/plant-hero.jpg").map((object) => ({ src: object.src!, name: object.name }))].filter((asset, index, items) => items.findIndex((item) => item.src === asset.src) === index);
  const [category, setCategory] = useState<"Uploads" | "Icons" | "Logos" | "Shapes" | "Illustrations">("Uploads");
  const assetGroups: Record<Exclude<typeof category, "Uploads">, { label: string; mark: string; type: CanvasObject["type"]; extra?: Partial<CanvasObject> }[]> = {
    Icons: [
      { label: "Leaf", mark: "N", type: "icon", extra: { pathData: "M3 12c6-9 11-8 18-9-1 10-5 17-13 17-4 0-6-3-5-8Z", fill: "#61934d" } },
      { label: "Star", mark: "*", type: "icon", extra: { pathData: "M12 2l2.8 6.7L22 9.3l-5.4 4.8 1.6 7.1L12 17.5l-6.2 3.7 1.6-7.1L2 9.3l7.2-.6L12 2Z", fill: "#e3a938" } },
      { label: "Heart", mark: "<3", type: "icon", extra: { pathData: "M20.8 4.6c-2.3-2.2-6-2.1-8.2.2L12 5.4l-.6-.6C9.1 2.5 5.4 2.4 3.2 4.6c-2.4 2.4-2.4 6.2 0 8.6L12 22l8.8-8.8c2.4-2.4 2.4-6.2 0-8.6Z", fill: "#ea6a86" } },
      { label: "Bolt", mark: "/", type: "icon", extra: { pathData: "M13 2 4 14h7l-1 8 10-13h-7V2Z", fill: "#dcaa46" } },
    ],
    Logos: [
      { label: "NovaGrow", mark: "N", type: "text", extra: { name: "NovaGrow logo", text: "NovaGrow", width: 220, height: 58, fontSize: 38, fontWeight: "800", fill: "#193f34" } },
      { label: "Studio mark", mark: "S", type: "text", extra: { name: "Studio logo", text: "STUDIO /", width: 250, height: 54, fontSize: 34, fontWeight: "700", fill: "#923e50" } },
    ],
    Shapes: [
      { label: "Rectangle", mark: "", type: "rect" }, { label: "Circle", mark: "", type: "ellipse" },
      { label: "Triangle", mark: "", type: "triangle" }, { label: "Frame", mark: "", type: "frame" },
    ],
    Illustrations: [
      { label: "Botanical", mark: "N", type: "image", extra: { src: "/images/plant-hero.jpg", name: "Botanical illustration", width: 265, height: 290, arch: true } },
      { label: "Organic shape", mark: "", type: "ellipse", extra: { fill: "#d5e7c7", width: 190, height: 260, rotation: -19, name: "Organic illustration" } },
    ],
  };
  return <div className="assets-view">
    <div className="panel-heading"><h3>Assets</h3><button className="panel-round-button" onClick={onRequestImage} title="Upload image"><Plus size={18} /></button></div>
    <div className="asset-tabs">{(["Uploads", "Icons", "Logos", "Shapes", "Illustrations"] as const).map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
    {category === "Uploads" ? <div className="assets-upload">{uploaded.map((asset) => <div key={asset.src} className="uploaded-asset" draggable onDragStart={(event) => event.dataTransfer.setData("application/collabcanvas", JSON.stringify({ type: "image", src: asset.src, name: asset.name, width: 270, height: 305 }))} onClick={() => create("image", 240, 205, { src: asset.src, width: 270, height: 305, name: asset.name })}><img src={asset.src} alt={asset.name} /><span>{asset.name}</span></div>)}<button className="asset-upload-button" onClick={onRequestImage}><Upload size={18} /><strong>Upload a file</strong><small>PNG, JPG or SVG</small></button></div> : <div className="asset-grid">{assetGroups[category].map((item) => <button key={item.label} draggable onDragStart={(event) => event.dataTransfer.setData("application/collabcanvas", JSON.stringify({ type: item.type, ...item.extra }))} onClick={() => create(item.type, 250, 210, item.extra)}><span className={`asset-shape asset-shape-${item.type}`}>{item.mark}</span><small>{item.label}</small></button>)}</div>}
    <p className="asset-tip">Drag an asset onto the canvas, or click to add it.</p>
  </div>;
}

export function LeftPanel({ onRequestImage }: { onRequestImage: () => void }) {
  const sidebarView = useUIStore((state) => state.sidebarView);
  const setSidebarView = useUIStore((state) => state.setSidebarView);
  const panelOpen = useUIStore((state) => state.leftPanelOpen);
  const setModal = useUIStore((state) => state.setModal);
  const showToast = useUIStore((state) => state.showToast);
  const projects = useProjectStore((state) => state.projects);
  const pages = useProjectStore((state) => state.pages);
  const projectId = useProjectStore((state) => state.activeProjectId);
  const pageId = useProjectStore((state) => state.activePageId);
  const settings = useProjectStore((state) => state.settings);
  const setSettings = useProjectStore((state) => state.setSettings);
  const createPage = useProjectStore((state) => state.createPage);
  const duplicatePage = useProjectStore((state) => state.duplicatePage);
  const renamePage = useProjectStore((state) => state.renamePage);
  const deletePage = useProjectStore((state) => state.deletePage);
  const setActivePage = useProjectStore((state) => state.setActivePage);
  const allObjects = useCanvasStore((state) => state.objects);
  const selected = useCanvasStore((state) => state.selectedObjectIds);
  const { select, update, remove, duplicate, create } = useCanvas();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["home-artboard", "home-hero", "home-features"]));
  const [pageMenu, setPageMenu] = useState<string | null>(null);
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState("");
  const pageList = useMemo(() => pages.filter((page) => page.projectId === projectId).sort((a, b) => a.order - b.order), [pages, projectId]);
  const objects = useMemo(() => allObjects.filter((object) => object.pageId === pageId), [allObjects, pageId]);
  const rootObjects = objects.filter((object) => !object.parentId);
  const toggle = (id: string) => setExpanded((old) => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const canEditPages = () => {
    if (useCollaborationStore.getState().currentUser.permission === "editor") return true;
    showToast("You need Editor access to change pages.", "error");
    return false;
  };

  const addPage = () => {
    if (!canEditPages()) return;
    const page = createPage(projectId);
    const pageObjects = buildSecondaryObjects(page.id, page.name);
    useCanvasStore.getState().replacePageObjects(page.id, pageObjects);
    collaborationService.publishPage("created", page);
    collaborationService.publishPageObjects(pageObjects, "create");
    setExpanded(new Set([`${page.id}-artboard`, `${page.id}-content`]));
    showToast("Page created");
  };
  const duplicateCurrentPage = (id: string) => {
    if (!canEditPages()) return;
    const newPage = duplicatePage(id);
    if (!newPage) return;
    const source = allObjects.filter((object) => object.pageId === id);
    const mapping = new Map(source.map((object) => [object.id, crypto.randomUUID()]));
    const copies = source.map((object) => ({ ...object, id: mapping.get(object.id)!, parentId: object.parentId ? mapping.get(object.parentId) : undefined, pageId: newPage.id, version: 1, updatedAt: Date.now() }));
    useCanvasStore.getState().replacePageObjects(newPage.id, copies);
    collaborationService.publishPage("created", newPage);
    collaborationService.publishPageObjects(copies, "create");
    setPageMenu(null);
    showToast("Page duplicated");
  };
  const deleteCurrentPage = (id: string) => {
    if (!canEditPages()) return;
    const page = pageList.find((item) => item.id === id);
    if (page && deletePage(id)) {
      const removed = useCanvasStore.getState().objects.filter((object) => object.pageId === id);
      useCanvasStore.getState().replacePageObjects(id, []);
      collaborationService.publishPage("deleted", page);
      collaborationService.publishPageObjects(removed, "delete");
      showToast("Page deleted");
    } else showToast("A project needs at least one page", "info");
    setPageMenu(null);
  };

  if (!panelOpen) return <div className="collapsed-panel"><button onClick={() => useUIStore.getState().toggleLeftPanel()} title="Show layers"><Layers3 size={19} /></button></div>;
  return <aside className="left-panel surface-panel">
    {sidebarView === "assets" ? <AssetsView onRequestImage={onRequestImage} /> : <><div className="pages-section"><div className="panel-heading"><h3>Pages</h3><button className="panel-round-button" onClick={addPage} title="Create page"><Plus size={18} /></button></div><div className="pages-list">{pageList.map((page, index) => <div key={page.id} className={`page-row ${pageId === page.id ? "active" : ""}`} onClick={() => { setActivePage(page.id); select([]); setPageMenu(null); }}><div className="page-preview"><ProjectThumbnail variant={projects.find((project) => project.id === projectId)?.thumbnail ?? "landing"} compact /></div><span className="page-number">{String(index + 1).padStart(2, "0")}</span>{renamingPage === page.id ? <input autoFocus className="page-rename-input" value={pageDraft} onClick={(event) => event.stopPropagation()} onChange={(event) => setPageDraft(event.target.value)} onBlur={() => { if (pageDraft.trim()) { renamePage(page.id, pageDraft.trim()); collaborationService.publishPage("renamed", { ...page, name: pageDraft.trim() }); } setRenamingPage(null); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /> : <span className="page-name" onDoubleClick={(event) => { event.stopPropagation(); setPageDraft(page.name); setRenamingPage(page.id); }}>{page.name}</span>}<button className="page-menu-trigger" title="Page options" onClick={(event) => { event.stopPropagation(); setPageMenu(pageMenu === page.id ? null : page.id); }}><MoreHorizontal size={16} /></button>{pageMenu === page.id && <div className="page-context-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => { setPageDraft(page.name); setRenamingPage(page.id); setPageMenu(null); }}>Rename</button><button onClick={() => duplicateCurrentPage(page.id)}>Duplicate page</button><button className="danger" onClick={() => deleteCurrentPage(page.id)}>Delete page</button></div>}</div>)}</div></div><div className="layers-section"><div className="panel-heading layers-heading"><h3>Layers</h3><button className="panel-round-button" onClick={() => create("rect", 110, 120)} title="Add layer"><Plus size={18} /></button></div><div className="layers-tree">{rootObjects.length ? rootObjects.map((object) => <LayerRow key={object.id} object={object} objects={objects} level={0} selected={selected} expanded={expanded} toggle={toggle} select={select} update={update} remove={remove} duplicate={duplicate} />) : <div className="layers-empty"><Layers3 size={24} /><span>No layers yet. Add one with the toolbar.</span></div>}</div></div></>}
    <div className="left-panel-footer"><button className={sidebarView === "layers" ? "active" : ""} title="Layers" onClick={() => setSidebarView("layers")}><Layers3 size={17} /></button><button className={sidebarView === "assets" ? "active" : ""} title="Assets" onClick={() => setSidebarView("assets")}><Square size={17} /></button><i /><button className={settings.showGrid ? "active-subtle" : ""} title="Toggle grid" onClick={() => setSettings({ showGrid: !settingsRef.current.showGrid })}><Grip size={16} /></button><button className={settings.snapToGrid ? "active-subtle" : ""} title="Toggle snapping" onClick={() => setSettings({ snapToGrid: !settingsRef.current.snapToGrid })}><Magnet size={16} /></button><button title="Version history" onClick={() => setModal("versions")}><History size={16} /></button><button className="left-panel-close" title="Collapse panel" onClick={() => useUIStore.getState().toggleLeftPanel()}><X size={15} /></button></div>
  </aside>;
}