import { useEffect, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpFromLine, Eye, Layers3, LockKeyhole, MoveDown, MoveUp, RotateCw, Trash2, UnlockKeyhole, X } from "lucide-react";
import { findUser } from "../../data/mockUsers";
import { collaborationService } from "../../services/collaborationService";
import { useCanvas } from "../../hooks/useCanvas";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import type { CanvasObject } from "../../types/canvas";
import { Avatar } from "../ui/Avatar";

function NumberField({ label, value, onChange, suffix, step = 1, min }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: number; min?: number }) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setDraft(String(Math.round(value * 100) / 100)), [value]);
  const commit = () => { const next = Number(draft); if (Number.isFinite(next) && (min === undefined || next >= min) && next !== value) onChange(next); else setDraft(String(value)); };
  return <label className="property-number-field"><span>{label}</span><div><input aria-label={label} type="number" step={step} min={min} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />{suffix && <small>{suffix}</small>}</div></label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  return <div className="property-row property-color-row"><span>{label}</span><div className="color-control"><input type="color" aria-label={`${label} color`} value={valid} onChange={(event) => onChange(event.target.value)} /><input aria-label={`${label} hex value`} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (/^#[0-9a-fA-F]{6}$/.test(draft)) onChange(draft); else setDraft(value); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div></div>;
}

function PropertiesContent({ object }: { object: CanvasObject }) {
  const { update, remove } = useCanvas();
  const allObjects = useCanvasStore((state) => state.objects);
  const pageId = useProjectStore((state) => state.activePageId);
  const showToast = useUIStore((state) => state.showToast);
  const change = (changes: Partial<CanvasObject>) => update(object.id, changes, `Changed ${object.name}`);
  const moveLayer = (direction: "forward" | "backward" | "front" | "back") => {
    if (useCollaborationStore.getState().currentUser.permission !== "editor") { showToast("You need Editor access to reorder layers.", "error"); return; }
    const siblings = allObjects.filter((item) => item.pageId === pageId && item.parentId === object.parentId);
    const index = siblings.findIndex((item) => item.id === object.id);
    const target = direction === "forward" ? siblings[index + 1] : direction === "backward" ? siblings[index - 1] : direction === "front" ? siblings[siblings.length - 1] : siblings[0];
    if (target && target.id !== object.id) { useCanvasStore.getState().reorderObject(object.id, target.id); collaborationService.publishLayerReorder(object.id, target.id, pageId); showToast("Layer order updated"); }
  };

  return <div className="inspector-scroll"><div className="inspector-section"><div className="inspector-section-title"><h4>Position</h4><span>{object.name}</span></div><div className="property-grid"><NumberField label="X" value={object.x} onChange={(x) => change({ x })} /><NumberField label="Y" value={object.y} onChange={(y) => change({ y })} /><NumberField label="W" value={object.width} min={1} onChange={(width) => change({ width })} /><NumberField label="H" value={object.height} min={1} onChange={(height) => change({ height })} /><NumberField label="↻" value={object.rotation} suffix="°" onChange={(rotation) => change({ rotation })} /><button className="property-lock-button" title={object.locked ? "Unlock layer" : "Lock layer"} onClick={() => change({ locked: !object.locked })}>{object.locked ? <LockKeyhole size={16} /> : <UnlockKeyhole size={16} />}</button></div></div>
    <div className="inspector-section"><h4>Appearance</h4><ColorField label="Fill" value={object.fill} onChange={(fill) => change({ fill })} /><ColorField label="Stroke" value={object.stroke} onChange={(stroke) => change({ stroke, strokeWidth: object.strokeWidth || 2 })} /><div className="property-row"><span>Stroke width</span><div className="property-inline-input"><NumberField label="" value={object.strokeWidth} min={0} onChange={(strokeWidth) => change({ strokeWidth })} /><small>px</small></div></div><div className="property-row"><span>Opacity</span><select value={object.opacity} onChange={(event) => change({ opacity: Number(event.target.value) })}>{[1, 0.9, 0.8, 0.7, 0.5, 0.25, 0].map((value) => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}</select></div><div className="property-row"><span>Border radius</span><div className="property-inline-input"><NumberField label="" value={object.cornerRadius} min={0} onChange={(cornerRadius) => change({ cornerRadius })} /><small>px</small></div></div><div className="property-row"><span>Shadow</span><div className="property-inline-input"><NumberField label="" value={object.shadowBlur} min={0} onChange={(shadowBlur) => change({ shadowBlur })} /><small>blur</small></div></div></div>
    <div className="inspector-section"><h4>Typography</h4>{object.type === "text" && <label className="property-text-label">Text<textarea value={object.text ?? ""} onChange={(event) => change({ text: event.target.value })} rows={3} /></label>}<div className="property-row"><span>Font</span><select value={object.fontFamily ?? "Inter"} onChange={(event) => change({ fontFamily: event.target.value })}><option>Inter</option><option>DM Sans</option><option>Arial</option><option>Georgia</option><option>Courier New</option></select></div><div className="property-row"><span>Size</span><div className="property-inline-input"><NumberField label="" value={object.fontSize ?? 24} min={1} onChange={(fontSize) => change({ fontSize })} /><small>px</small></div></div><div className="property-row"><span>Weight</span><select value={object.fontWeight ?? "600"} onChange={(event) => change({ fontWeight: event.target.value })}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></div><div className="property-row"><span>Line height</span><NumberField label="" value={object.lineHeight ?? 1.4} step={0.1} min={0.5} onChange={(lineHeight) => change({ lineHeight })} /></div><div className="property-row"><span>Letter spacing</span><NumberField label="" value={object.letterSpacing ?? 0} step={0.5} onChange={(letterSpacing) => change({ letterSpacing })} /></div><div className="property-row"><span>Align</span><div className="align-buttons">{(["left", "center", "right"] as const).map((align) => <button key={align} className={object.align === align ? "active" : ""} onClick={() => change({ align })} title={`Align ${align}`}>{align === "left" ? <AlignLeft size={17} /> : align === "center" ? <AlignCenter size={17} /> : <AlignRight size={17} />}</button>)}</div></div></div>
    <div className="inspector-section inspector-layer-section"><h4>Layer</h4><button onClick={() => moveLayer("forward")}><MoveUp size={17} /> Bring forward</button><button onClick={() => moveLayer("backward")}><MoveDown size={17} /> Send backward</button><button onClick={() => moveLayer("front")}><ArrowUpFromLine size={17} /> Bring to front</button><button onClick={() => moveLayer("back")}><ArrowDownToLine size={17} /> Send to back</button><div className="layer-section-divider" /><button onClick={() => change({ visible: !object.visible })}><Eye size={17} /> {object.visible ? "Hide" : "Show"} layer</button><button onClick={() => change({ locked: !object.locked })}>{object.locked ? <UnlockKeyhole size={17} /> : <LockKeyhole size={17} />} {object.locked ? "Unlock" : "Lock"} layer</button><button className="danger" onClick={() => remove([object.id])}><Trash2 size={17} /> Delete layer</button></div>
  </div>;
}

function CommentsTab() {
  const comments = useCollaborationStore((state) => state.comments);
  const pageId = useProjectStore((state) => state.activePageId);
  return <div className="inspector-scroll inspector-list-tab"><p className="inspector-list-intro">Feedback on this page, all in one place.</p>{comments.filter((item) => item.pageId === pageId && !item.resolved).map((comment) => <div className="inspector-comment" key={comment.id}><Avatar user={findUser(comment.authorId)} size="sm" /><div><b>{findUser(comment.authorId).name}</b><p>{comment.message}</p><small>{comment.replies.length} replies</small></div></div>)}{comments.filter((item) => item.pageId === pageId && !item.resolved).length === 0 && <div className="inspector-empty"><Layers3 size={25} /><p>No open comments on this page.</p></div>}</div>;
}

function ActivityTab() {
  const activity = useCollaborationStore((state) => state.activity);
  const currentUserId = useCollaborationStore((state) => state.currentUser.id);
  return <div className="inspector-scroll inspector-list-tab"><p className="inspector-list-intro">A live look at what your team has been creating.</p>{activity.map((item) => <div className="activity-row" key={item.id}><Avatar user={findUser(item.userId)} size="sm" /><div><p><strong>{item.userId === currentUserId ? "You" : findUser(item.userId).name}</strong> {item.message}</p><small>{new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></div></div>)}</div>;
}

export function PropertiesPanel() {
  const open = useUIStore((state) => state.propertiesPanelOpen);
  const tab = useUIStore((state) => state.inspectorTab);
  const setTab = useUIStore((state) => state.setInspectorTab);
  const selectedIds = useCanvasStore((state) => state.selectedObjectIds);
  const objects = useCanvasStore((state) => state.objects);
  const object = objects.find((item) => item.id === selectedIds[0]);
  if (!open) return <div className="collapsed-panel"><button onClick={() => useUIStore.getState().togglePropertiesPanel()} title="Show properties"><Layers3 size={19} /></button></div>;
  return <aside className="properties-panel surface-panel"><div className="inspector-tabs"><button className={tab === "properties" ? "active" : ""} onClick={() => setTab("properties")}>Properties</button><button className={tab === "comments" ? "active" : ""} onClick={() => setTab("comments")}>Comments</button><button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>Activity</button><button className="inspector-close" onClick={() => useUIStore.getState().togglePropertiesPanel()} title="Close properties"><X size={16} /></button></div>{tab === "properties" ? selectedIds.length > 1 ? <div className="inspector-empty"><Layers3 size={27} /><h4>{selectedIds.length} layers selected</h4><p>Move, resize, or delete them together.</p></div> : object ? <PropertiesContent key={object.id} object={object} /> : <div className="inspector-empty"><RotateCw size={26} /><h4>Nothing selected</h4><p>Select a layer to inspect and edit its properties.</p></div> : tab === "comments" ? <CommentsTab /> : <ActivityTab />}</aside>;
}