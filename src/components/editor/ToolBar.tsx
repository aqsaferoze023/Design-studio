import { useState } from "react";
import { ArrowUpRight, Circle, Frame, Image as ImageIcon, MessageSquare, MoreHorizontal, MousePointer2, PenLine, Play, Shapes, Slash, Square, Triangle, Type } from "lucide-react";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCanvas } from "../../hooks/useCanvas";
import { useUIStore } from "../../stores/uiStore";
import type { EditorTool } from "../../types/canvas";

const primary = [
  { tool: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { tool: "rectangle", label: "Rectangle", icon: Square, shortcut: "R" },
  { tool: "circle", label: "Circle", icon: Circle, shortcut: "O" },
  { tool: "text", label: "Text", icon: Type, shortcut: "T" },
  { tool: "image", label: "Image", icon: ImageIcon, shortcut: "" },
  { tool: "frame", label: "Frame", icon: Frame, shortcut: "F" },
  { tool: "pen", label: "Pen", icon: PenLine, shortcut: "P" },
  { tool: "comment", label: "Comment", icon: MessageSquare, shortcut: "C" },
] as const;

const extras = [
  { tool: "line", label: "Line", icon: Slash, shortcut: "L" },
  { tool: "arrow", label: "Arrow", icon: ArrowUpRight, shortcut: "" },
  { tool: "triangle", label: "Triangle", icon: Triangle, shortcut: "" },
  { tool: "icon", label: "Icon", icon: Shapes, shortcut: "" },
  { tool: "video", label: "Video", icon: Play, shortcut: "" },
] as const;

export function ToolBar({ onRequestImage }: { onRequestImage: () => void }) {
  const { create } = useCanvas();
  const activeTool = useCanvasStore((state) => state.activeTool);
  const setTool = useCanvasStore((state) => state.setTool);
  const [open, setOpen] = useState(false);
  const showToast = useUIStore((state) => state.showToast);

  const choose = (tool: EditorTool) => {
    setOpen(false);
    if (tool === "image") { onRequestImage(); return; }
    setTool(tool);
    if (tool === "comment") showToast("Click anywhere on the canvas to leave a comment", "info");
  };

  return <div className="editor-toolbar" role="toolbar" aria-label="Design tools"><div className="toolbar-items">{primary.map(({ tool, label, icon: Icon, shortcut }) => <button key={tool} className={`tool-button ${activeTool === tool ? "active" : ""}`} onClick={() => choose(tool)} title={`${label}${shortcut ? ` (${shortcut})` : ""}`} aria-label={`${label} tool`} aria-pressed={activeTool === tool}><Icon size={21} strokeWidth={2} /><span>{label}</span></button>)}<div className="tool-more-wrap"><button className={`tool-button tool-more ${extras.some((item) => item.tool === activeTool) ? "active" : ""}`} onClick={() => setOpen(!open)} title="More tools"><MoreHorizontal size={21} /><span>More</span></button>{open && <div className="tool-more-menu">{extras.map(({ tool, label, icon: Icon, shortcut }) => <button key={tool} onClick={() => choose(tool)}><Icon size={17} />{label}<kbd>{shortcut}</kbd></button>)}<div className="tool-menu-divider">QUICK SHAPES</div><button onClick={() => { create("rect", 160, 170, { cornerRadius: 26, name: "Rounded rectangle" }); setOpen(false); }}><Square size={17} />Rounded rectangle</button><div className="tool-menu-divider">FRAME PRESETS</div>{([{ label: "Desktop", width: 720, height: 450 }, { label: "Tablet", width: 520, height: 680 }, { label: "Mobile", width: 320, height: 620 }] as const).map((preset) => <button key={preset.label} onClick={() => { create("frame", 40, 125, { width: preset.width, height: preset.height, name: `${preset.label} frame` }); setOpen(false); }}><Frame size={17} />{preset.label}<kbd>{preset.width} x {preset.height}</kbd></button>)}</div>}</div></div></div>;
}