import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Konva from "konva";
import { Layer, Line, Rect, Stage, Transformer } from "react-konva";
import { Hand, Maximize2, Minus, MousePointer2, Plus, Scan, ZoomIn } from "lucide-react";
import { ARTBOARD_WIDTH } from "../../data/seedCanvas";
import { useCanvas } from "../../hooks/useCanvas";
import { useCollaboration } from "../../hooks/useCollaboration";
import { collaborationService } from "../../services/collaborationService";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import type { CanvasObject, EditorTool } from "../../types/canvas";
import { CanvasObjectNode } from "./CanvasObjectNode";
import { CursorLayer } from "../collaboration/CursorLayer";

type Point = { x: number; y: number };
interface DraftShape { tool: EditorTool; start: Point; end: Point; points: Point[] }
interface Guides { vertical?: number; horizontal?: number }

export function DesignCanvas({ onRequestImage, onUploadFile }: { onRequestImage: () => void; onUploadFile: (file: File, x?: number, y?: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node | null>>({});
  const previousZoom = useRef(0.68);
  const centeredPage = useRef("");
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const [guides, setGuides] = useState<Guides>({});
  const [spaceDown, setSpaceDown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [commentPoint, setCommentPoint] = useState<Point | null>(null);
  const [commentText, setCommentText] = useState("");
  const objects = useCanvasStore((state) => state.objects);
  const selected = useCanvasStore((state) => state.selectedObjectIds);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const setTool = useCanvasStore((state) => state.setTool);
  const zoom = useCanvasStore((state) => state.zoom);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const pageId = useProjectStore((state) => state.activePageId);
  const settings = useProjectStore((state) => state.settings);
  const comments = useCollaborationStore((state) => state.comments);
  const canEdit = useCollaborationStore((state) => state.currentUser.permission === "editor");
  const { create, update, select } = useCanvas();
  const { addComment, publishCursor } = useCollaboration();
  const pageObjects = useMemo(() => objects.filter((object) => object.pageId === pageId), [objects, pageId]);
  const selectedObjects = useMemo(() => selected.map((id) => pageObjects.find((item) => item.id === id)).filter(Boolean) as CanvasObject[], [selected, pageObjects]);
  const visibleComments = useMemo(() => comments.filter((item) => item.pageId === pageId && !item.resolved), [comments, pageId]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size.width || centeredPage.current === pageId) return;
    const fittedZoom = size.width < 600 ? Math.min(0.68, (size.width - 40) / ARTBOARD_WIDTH) : 0.68;
    setViewport({ x: (size.width - ARTBOARD_WIDTH * zoom) / 2, y: size.width < 600 ? 98 : 108 });
    previousZoom.current = zoom;
    if (zoom !== fittedZoom) setZoom(fittedZoom);
    centeredPage.current = pageId;
  }, [pageId, size.width, setViewport, setZoom, zoom]);

  useEffect(() => {
    if (!size.width || zoom === previousZoom.current) return;
    const oldZoom = previousZoom.current;
    const centerX = (size.width / 2 - viewport.x) / oldZoom;
    const centerY = (size.height / 2 - viewport.y) / oldZoom;
    setViewport({ x: size.width / 2 - centerX * zoom, y: size.height / 2 - centerY * zoom });
    previousZoom.current = zoom;
  }, [zoom, size.width, size.height, viewport.x, viewport.y, setViewport]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => { if (event.code === "Space" && !(event.target as HTMLElement).matches("input, textarea, select")) { event.preventDefault(); setSpaceDown(true); } };
    const keyUp = (event: KeyboardEvent) => { if (event.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    transformer.nodes(selected.map((id) => nodeRefs.current[id]).filter((node): node is Konva.Node => Boolean(node)));
    transformer.getLayer()?.batchDraw();
  }, [selected, pageObjects]);

  const pointerWorld = useCallback((): Point | null => {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return null;
    return { x: (pointer.x - stage.x()) / zoom, y: (pointer.y - stage.y()) / zoom };
  }, [zoom]);

  const register = useCallback((id: string, node: Konva.Node | null) => { nodeRefs.current[id] = node; }, []);
  const onSelect = useCallback((id: string, shift: boolean) => {
    const ids = useCanvasStore.getState().selectedObjectIds;
    select(shift ? ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] : [id]);
  }, [select]);

  const snapNode = useCallback((id: string, node: Konva.Node) => {
    const object = useCanvasStore.getState().objects.find((item) => item.id === id);
    if (!object || !settings.snapToGrid) return { x: node.x(), y: node.y(), guides: {} as Guides };
    const candidates = useCanvasStore.getState().objects.filter((item) => item.pageId === pageId && item.id !== id && item.type !== "group" && item.type !== "frame" && item.width > 90 && item.visible);
    const xTargets = [0, ARTBOARD_WIDTH / 2, ARTBOARD_WIDTH, ...candidates.flatMap((item) => [item.x, item.x + item.width / 2, item.x + item.width])];
    const yTargets = [0, ...candidates.flatMap((item) => [item.y, item.y + item.height / 2, item.y + item.height])];
    const xEdges = [node.x(), node.x() + object.width / 2, node.x() + object.width];
    const yEdges = [node.y(), node.y() + object.height / 2, node.y() + object.height];
    let closestX = 7 / zoom;
    let closestY = 7 / zoom;
    let x = node.x(); let y = node.y();
    const lines: Guides = {};
    xTargets.forEach((target) => xEdges.forEach((edge) => { if (Math.abs(target - edge) < closestX) { closestX = Math.abs(target - edge); x = node.x() + target - edge; lines.vertical = target; } }));
    yTargets.forEach((target) => yEdges.forEach((edge) => { if (Math.abs(target - edge) < closestY) { closestY = Math.abs(target - edge); y = node.y() + target - edge; lines.horizontal = target; } }));
    return { x, y, guides: lines };
  }, [pageId, settings.snapToGrid, zoom]);

  const onMove = useCallback((id: string, node: Konva.Node) => {
    const snapped = snapNode(id, node);
    node.position({ x: snapped.x, y: snapped.y });
    setGuides((current) => current.vertical === snapped.guides.vertical && current.horizontal === snapped.guides.horizontal ? current : snapped.guides);
    const object = useCanvasStore.getState().objects.find((item) => item.id === id);
    if (object) collaborationService.publishTransientMove(id, pageId, snapped.x, snapped.y, object.version + 1);
  }, [snapNode, pageId]);

  const onMoveEnd = useCallback((id: string, node: Konva.Node) => {
    setGuides({});
    const object = useCanvasStore.getState().objects.find((item) => item.id === id);
    if (object && (Math.abs(object.x - node.x()) > 0.1 || Math.abs(object.y - node.y()) > 0.1)) update(id, { x: Math.round(node.x()), y: Math.round(node.y()) }, `Moved ${object.name}`);
  }, [update]);

  const editText = useCallback((id: string) => {
    const object = useCanvasStore.getState().objects.find((item) => item.id === id);
    if (!object || object.type !== "text") return;
    setEditingId(id);
    setEditingText(object.text ?? "");
  }, []);

  const finishTextEdit = () => {
    const original = objects.find((item) => item.id === editingId);
    if (editingId && original && editingText !== original.text) update(editingId, { text: editingText }, `Edited ${original.name}`);
    setEditingId(null);
  };

  const onStageDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (spaceDown || activeTool === "hand") return;
    const point = pointerWorld();
    if (!point) return;
    if (activeTool === "select") { if (event.target === event.target.getStage()) select([]); return; }
    if (activeTool === "image") { onRequestImage(); setTool("select"); return; }
    if (activeTool === "comment") { setCommentPoint(point); setCommentText(""); return; }
    if (activeTool === "text") { const object = create("text", point.x, point.y); setTool("select"); if (object) setTimeout(() => editText(object.id), 0); return; }
    if (activeTool === "icon" || activeTool === "video") { create(activeTool, point.x, point.y); setTool("select"); return; }
    setDraft({ tool: activeTool, start: point, end: point, points: [point] });
  };

  const onStageMove = () => {
    const point = pointerWorld();
    if (!point) return;
    publishCursor({ pageId, x: point.x, y: point.y });
    setDraft((current) => current ? { ...current, end: point, points: current.tool === "pen" ? [...current.points, point] : current.points } : null);
  };

  const onStageUp = () => {
    if (!draft) return;
    const { start, end, tool, points } = draft;
    setDraft(null);
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    if (tool === "pen") {
      if (points.length > 2) {
        const minX = Math.min(...points.map((point) => point.x));
        const minY = Math.min(...points.map((point) => point.y));
        create("pen", minX, minY, { points: points.flatMap((point) => [point.x - minX, point.y - minY]), width: Math.max(1, Math.max(...points.map((point) => point.x)) - minX), height: Math.max(1, Math.max(...points.map((point) => point.y)) - minY), fill: "#ec3b72", strokeWidth: 3 });
      }
    } else if (tool === "line" || tool === "arrow") {
      create(tool, width < 6 ? start.x : x, height < 6 ? start.y : y, width < 6 && height < 6 ? {} : { width: Math.max(1, width), height: Math.max(1, height), points: [start.x - x, start.y - y, end.x - x, end.y - y], fill: "#223b39", strokeWidth: 3 });
    } else {
      const type = tool === "rectangle" ? "rect" : tool === "circle" ? "ellipse" : tool === "frame" ? "frame" : "triangle";
      create(type, width < 6 && height < 6 ? start.x : x, width < 6 && height < 6 ? start.y : y, width < 6 && height < 6 ? {} : { width: Math.max(20, width), height: Math.max(20, height) });
    }
    setTool("select");
  };

  const onTransformEnd = () => {
    selectedObjects.forEach((object) => {
      const node = nodeRefs.current[object.id];
      if (!node || object.locked) return;
      const scaleX = node.scaleX(); const scaleY = node.scaleY();
      const changes: Partial<CanvasObject> = { x: Math.round(node.x()), y: Math.round(node.y()), width: Math.max(8, Math.round(object.width * scaleX)), height: Math.max(8, Math.round(object.height * scaleY)), rotation: Math.round(node.rotation()) };
      if (object.type === "line" || object.type === "arrow" || object.type === "pen") changes.points = object.points?.map((value, index) => value * (index % 2 === 0 ? scaleX : scaleY));
      node.scale({ x: 1, y: 1 });
      update(object.id, changes, `Transformed ${object.name}`);
    });
  };

  const onWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    if (event.evt.ctrlKey || event.evt.metaKey) {
      const pointer = stageRef.current?.getPointerPosition();
      if (!pointer) return;
      const next = Math.max(0.25, Math.min(2.5, zoom * (event.evt.deltaY > 0 ? 0.94 : 1.06)));
      const world = { x: (pointer.x - viewport.x) / zoom, y: (pointer.y - viewport.y) / zoom };
      previousZoom.current = next;
      setZoom(next);
      setViewport({ x: pointer.x - world.x * next, y: pointer.y - world.y * next });
    } else setViewport({ x: viewport.x - event.evt.deltaX, y: viewport.y - event.evt.deltaY });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = (event.clientX - bounds.left - viewport.x) / zoom;
    const y = (event.clientY - bounds.top - viewport.y) / zoom;
    if (event.dataTransfer.files.length) { onUploadFile(event.dataTransfer.files[0], x, y); return; }
    try {
      const asset = JSON.parse(event.dataTransfer.getData("application/collabcanvas")) as Partial<CanvasObject>;
      if (asset.type) create(asset.type, x, y, asset);
    } catch { /* Ignore unrelated drops. */ }
  };

  const submitComment = () => {
    if (commentPoint && commentText.trim() && addComment(commentText, commentPoint.x, commentPoint.y)) useUIStore.getState().showToast("Comment added to canvas");
    setCommentPoint(null);
    setCommentText("");
    setTool("select");
  };

  const textObject = objects.find((item) => item.id === editingId);
  const zoomIn = () => setZoom(Math.min(2.5, Number((zoom + 0.1).toFixed(2))));
  const zoomOut = () => setZoom(Math.max(0.25, Number((zoom - 0.1).toFixed(2))));
  const fit = () => { const next = Math.min(0.76, (size.width - 42) / ARTBOARD_WIDTH); previousZoom.current = next; setZoom(next); setViewport({ x: (size.width - ARTBOARD_WIDTH * next) / 2, y: 100 }); };

  return <div ref={containerRef} className={`design-canvas ${settings.showGrid ? "" : "grid-hidden"} ${activeTool === "hand" || spaceDown ? "canvas-panning" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
    <Stage ref={stageRef} width={size.width} height={size.height} x={viewport.x} y={viewport.y} scaleX={zoom} scaleY={zoom} draggable={activeTool === "hand" || spaceDown} onDragEnd={(event) => { if (event.target === stageRef.current) setViewport({ x: event.target.x(), y: event.target.y() }); }} onMouseDown={onStageDown} onTouchStart={onStageDown} onMouseMove={onStageMove} onTouchMove={onStageMove} onMouseUp={onStageUp} onTouchEnd={onStageUp} onWheel={onWheel}>
      <Layer>{pageObjects.map((object) => <CanvasObjectNode key={object.id} object={object} activeTool={activeTool} canEdit={canEdit} register={register} onSelect={onSelect} onMove={onMove} onMoveEnd={onMoveEnd} onEditText={editText} />)}</Layer>
      <Layer listening={false}>{draft && draft.tool !== "pen" && draft.tool !== "line" && draft.tool !== "arrow" && <Rect x={Math.min(draft.start.x, draft.end.x)} y={Math.min(draft.start.y, draft.end.y)} width={Math.abs(draft.end.x - draft.start.x)} height={Math.abs(draft.end.y - draft.start.y)} stroke="#629356" strokeWidth={2} dash={[7, 5]} fill="#80a86c22" />}{draft && (draft.tool === "line" || draft.tool === "arrow" || draft.tool === "pen") && <Line points={draft.tool === "pen" ? draft.points.flatMap((point) => [point.x, point.y]) : [draft.start.x, draft.start.y, draft.end.x, draft.end.y]} stroke="#619655" strokeWidth={3} lineCap="round" />}{guides.vertical !== undefined && <Line points={[guides.vertical, -3000, guides.vertical, 4000]} stroke="#ef4c7e" strokeWidth={1} dash={[4, 4]} />}{guides.horizontal !== undefined && <Line points={[-3000, guides.horizontal, 4000, guides.horizontal]} stroke="#ef4c7e" strokeWidth={1} dash={[4, 4]} />}</Layer>
      <Layer><Transformer ref={transformerRef} rotateEnabled={canEdit} resizeEnabled={canEdit} borderStroke="#5d874c" anchorStroke="#5d874c" anchorFill="#fffefa" anchorSize={8} anchorCornerRadius={1} borderStrokeWidth={1.5} rotateAnchorOffset={24} boundBoxFunc={(oldBox, next) => next.width < 8 || next.height < 8 ? oldBox : next} onTransformEnd={onTransformEnd} /></Layer>
    </Stage>
    <CursorLayer zoom={zoom} viewport={viewport} />
    <div className="canvas-comment-markers">{visibleComments.map((comment, index) => <button key={comment.id} className="canvas-comment-pin" style={{ left: viewport.x + comment.x * zoom, top: viewport.y + comment.y * zoom }} title={`Comment by ${comment.authorId}`} onClick={() => useUIStore.getState().setInspectorTab("comments")}>{index + 1}</button>)}</div>
    {textObject && <textarea autoFocus className="canvas-text-editor" value={editingText} onChange={(event) => setEditingText(event.target.value)} onBlur={finishTextEdit} onKeyDown={(event) => { if (event.key === "Escape") { setEditingId(null); return; } if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.blur(); }} style={{ left: viewport.x + textObject.x * zoom, top: viewport.y + textObject.y * zoom, width: Math.max(140, textObject.width * zoom), minHeight: Math.max(45, textObject.height * zoom), fontSize: (textObject.fontSize ?? 16) * zoom, color: textObject.fill, fontFamily: textObject.fontFamily, fontWeight: textObject.fontWeight }} />}
    {commentPoint && <div className="canvas-comment-composer" style={{ left: Math.max(10, Math.min(size.width - 280, viewport.x + commentPoint.x * zoom + 14)), top: Math.max(82, Math.min(size.height - 185, viewport.y + commentPoint.y * zoom + 10)) }}><strong>Leave a comment</strong><textarea autoFocus value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="What are you thinking?" onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") submitComment(); }} /><div><button onClick={() => setCommentPoint(null)}>Cancel</button><button className="primary-button" disabled={!commentText.trim()} onClick={submitComment}>Post comment</button></div></div>}
    <div className="canvas-hint">{activeTool === "select" ? "Drag to move  ·  Shift-click to select multiple" : activeTool === "hand" ? "Drag to pan around your canvas" : activeTool === "comment" ? "Click anywhere to add a comment" : `Click or drag to add ${activeTool}`}</div>
    <div className="canvas-bottom-controls"><div className="canvas-nav-controls"><button className={activeTool === "hand" ? "active" : ""} title="Hand tool (Space)" onClick={() => setTool(activeTool === "hand" ? "select" : "hand")}><Hand size={17} /></button><button className={activeTool === "select" ? "active" : ""} title="Select tool (V)" onClick={() => setTool("select")}><MousePointer2 size={17} /></button><span /><button title="Fit to canvas" onClick={fit}><Scan size={17} /></button><button title="Zoom in" onClick={zoomIn}><ZoomIn size={17} /></button></div><div className="canvas-zoom-controls"><button onClick={zoomOut} title="Zoom out"><Minus size={17} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={zoomIn} title="Zoom in"><Plus size={17} /></button></div><button className="canvas-fullscreen" title="Fullscreen" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }}><Maximize2 size={17} /></button></div>
  </div>;
}