import { memo, useEffect, useMemo, useState } from "react";
import Konva from "konva";
import { Arrow, Circle, Group, Image, Line, Path, Rect, Text } from "react-konva";
import type { CanvasObject, EditorTool } from "../../types/canvas";

interface Props {
  object: CanvasObject;
  activeTool: EditorTool;
  canEdit: boolean;
  register: (id: string, node: Konva.Node | null) => void;
  onSelect: (id: string, shift: boolean) => void;
  onMove: (id: string, node: Konva.Node) => void;
  onMoveEnd: (id: string, node: Konva.Node) => void;
  onEditText: (id: string) => void;
}

function useCanvasImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImage(null); return; }
    let mounted = true;
    const next = new window.Image();
    if (src.startsWith("http")) next.crossOrigin = "anonymous";
    next.onload = () => { if (mounted) setImage(next); };
    next.onerror = () => { if (mounted) setImage(null); };
    next.src = src;
    return () => { mounted = false; };
  }, [src]);
  return image;
}

function CanvasObjectNodeInner({ object, activeTool, canEdit, register, onSelect, onMove, onMoveEnd, onEditText }: Props) {
  const image = useCanvasImage(object.src);
  const { width, height } = object;
  const crop = useMemo(() => {
    if (!image) return undefined;
    const ratio = Math.max(width / image.width, height / image.height);
    const cropWidth = width / ratio;
    const cropHeight = height / ratio;
    return { x: (image.width - cropWidth) / 2, y: (image.height - cropHeight) / 2, width: cropWidth, height: cropHeight };
  }, [image, width, height]);
  if (object.type === "group") return null;
  const commonShape = { fill: object.fill, stroke: object.stroke, strokeWidth: object.strokeWidth, shadowBlur: object.shadowBlur, shadowColor: object.shadowColor, shadowOpacity: 0.17 };

  return <Group ref={(node) => register(object.id, node)} x={object.x} y={object.y} rotation={object.rotation} opacity={object.opacity} visible={object.visible} listening={!object.locked} draggable={canEdit && !object.locked && activeTool === "select"} onClick={(event) => { event.cancelBubble = true; if (activeTool === "select") onSelect(object.id, event.evt.shiftKey); }} onTap={(event) => { event.cancelBubble = true; if (activeTool === "select") onSelect(object.id, false); }} onDragMove={(event) => onMove(object.id, event.target)} onDragEnd={(event) => onMoveEnd(object.id, event.target)} onDblClick={(event) => { if (canEdit && object.type === "text") { event.cancelBubble = true; onEditText(object.id); } }}>
    {object.type === "frame" || object.type === "rect" ? <Rect width={width} height={height} cornerRadius={object.cornerRadius} {...commonShape} /> : null}
    {object.type === "ellipse" ? <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2} scaleX={width / Math.min(width, height)} scaleY={height / Math.min(width, height)} {...commonShape} /> : null}
    {object.type === "triangle" ? <Line points={[width / 2, 0, width, height, 0, height]} closed {...commonShape} /> : null}
    {object.type === "line" ? <Line points={object.points ?? [0, 0, width, height]} stroke={object.stroke === "transparent" ? object.fill : object.stroke} strokeWidth={object.strokeWidth || 3} lineCap="round" /> : null}
    {object.type === "arrow" ? <Arrow points={object.points ?? [0, 0, width, height]} stroke={object.stroke === "transparent" ? object.fill : object.stroke} fill={object.stroke === "transparent" ? object.fill : object.stroke} strokeWidth={object.strokeWidth || 3} pointerLength={12} pointerWidth={12} /> : null}
    {object.type === "pen" ? <Line points={object.points ?? [0, 0, width, height]} stroke={object.fill} strokeWidth={object.strokeWidth || 3} lineCap="round" lineJoin="round" tension={0.35} /> : null}
    {object.type === "text" ? <Text text={object.text ?? ""} width={width} height={height} fill={object.fill} fontFamily={object.fontFamily ?? "Inter"} fontSize={object.fontSize ?? 16} fontStyle={object.fontWeight ?? "400"} align={object.align ?? "left"} lineHeight={object.lineHeight ?? 1.2} letterSpacing={object.letterSpacing ?? 0} wrap="word" /> : null}
    {object.type === "image" ? <Group clipFunc={object.arch ? (ctx) => { ctx.beginPath(); ctx.moveTo(0, height); ctx.lineTo(0, width / 2); ctx.arc(width / 2, width / 2, width / 2, Math.PI, 0, false); ctx.lineTo(width, height); ctx.closePath(); } : undefined}><Rect width={width} height={height} fill={object.fill} cornerRadius={object.cornerRadius} />{image && <Image image={image} width={width} height={height} crop={crop} />}</Group> : null}
    {object.type === "icon" ? <Path data={object.pathData ?? "M3 12c6-9 11-8 18-9-1 10-5 17-13 17-4 0-6-3-5-8Z"} fill={object.fill} stroke={object.stroke === "transparent" ? object.fill : object.stroke} strokeWidth={1.5} scaleX={width / 24} scaleY={height / 24} /> : null}
    {object.type === "video" ? <><Rect width={width} height={height} fill={object.fill} cornerRadius={object.cornerRadius || 12} /><Circle x={width / 2} y={height / 2} radius={24} fill="#ffffff" opacity={0.88} /><Text x={width / 2 - 6} y={height / 2 - 12} text=">" fill="#183a38" fontSize={23} fontStyle="bold" /><Text x={14} y={height - 30} text="Video" fill="#ffffff" fontSize={13} /></> : null}
  </Group>;
}

export const CanvasObjectNode = memo(CanvasObjectNodeInner, (prev, next) => prev.object === next.object && prev.activeTool === next.activeTool && prev.canEdit === next.canEdit && prev.onSelect === next.onSelect && prev.onMove === next.onMove && prev.onMoveEnd === next.onMoveEnd && prev.onEditText === next.onEditText);