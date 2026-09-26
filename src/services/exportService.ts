import { jsPDF } from "jspdf";
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH } from "../data/seedCanvas";
import type { CanvasObject } from "../types/canvas";
import type { Page } from "../types/project";

export type ExportFormat = "png" | "jpg" | "svg" | "pdf";
export type ExportScope = "frame" | "selection" | "project";

interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  projectName: string;
  pages: Page[];
  activePageId: string;
  objects: CanvasObject[];
  selectedObjectIds: string[];
  onProgress?: (percent: number) => void;
}

interface Bounds { x: number; y: number; width: number; height: number }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getBounds(objects: CanvasObject[], selectedIds: string[], scope: ExportScope): Bounds {
  if (scope === "selection") {
    const selected = objects.filter((object) => selectedIds.includes(object.id));
    if (selected.length) {
      const x = Math.min(...selected.map((object) => object.x));
      const y = Math.min(...selected.map((object) => object.y));
      return { x, y, width: Math.max(...selected.map((object) => object.x + object.width)) - x, height: Math.max(...selected.map((object) => object.y + object.height)) - y };
    }
  }
  return { x: 0, y: 0, width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT };
}

function roundedRect(ctx: CanvasRenderingContext2D, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(width - r, 0); ctx.quadraticCurveTo(width, 0, width, r);
  ctx.lineTo(width, height - r); ctx.quadraticCurveTo(width, height, width - r, height);
  ctx.lineTo(r, height); ctx.quadraticCurveTo(0, height, 0, height - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath();
}

function drawWrappedText(ctx: CanvasRenderingContext2D, object: CanvasObject) {
  ctx.font = `${object.fontWeight ?? "400"} ${object.fontSize ?? 16}px ${object.fontFamily ?? "Inter"}`;
  ctx.fillStyle = object.fill;
  ctx.textBaseline = "top";
  ctx.textAlign = object.align ?? "left";
  const lineHeight = (object.fontSize ?? 16) * (object.lineHeight ?? 1.2);
  const lines = getTextLines(ctx, object);
  const x = object.align === "center" ? object.width / 2 : object.align === "right" ? object.width : 0;
  lines.forEach((line, index) => { if (index * lineHeight < object.height) ctx.fillText(line, x, index * lineHeight); });
}

function getTextLines(ctx: CanvasRenderingContext2D, object: CanvasObject) {
  const lines: string[] = [];
  (object.text ?? "").split("\n").forEach((paragraph) => {
    const words = paragraph.split(" ");
    let line = "";
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > object.width) { lines.push(line); line = word; }
      else line = next;
    });
    lines.push(line);
  });
  return lines;
}

async function loadImages(objects: CanvasObject[]) {
  const sources = [...new Set(objects.filter((object) => object.type === "image" && object.src).map((object) => object.src!))];
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(sources.map((src) => new Promise<void>((resolve) => {
    const image = new Image();
    if (src.startsWith("http")) image.crossOrigin = "anonymous";
    image.onload = () => { images.set(src, image); resolve(); };
    image.onerror = () => resolve();
    image.src = src;
  })));
  return images;
}

export async function renderPageCanvas(objects: CanvasObject[], bounds: Bounds = { x: 0, y: 0, width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT }, scale = 1.5): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(bounds.width * scale));
  canvas.height = Math.max(1, Math.ceil(bounds.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fffef5";
  ctx.fillRect(0, 0, bounds.width, bounds.height);
  const images = await loadImages(objects);
  objects.filter((object) => object.visible && object.type !== "group").forEach((object) => {
    ctx.save();
    ctx.translate(object.x - bounds.x, object.y - bounds.y);
    ctx.rotate(object.rotation * Math.PI / 180);
    ctx.globalAlpha = object.opacity;
    if (object.shadowBlur) { ctx.shadowBlur = object.shadowBlur; ctx.shadowColor = object.shadowColor; }
    ctx.fillStyle = object.fill;
    ctx.strokeStyle = object.stroke === "transparent" ? object.fill : object.stroke;
    ctx.lineWidth = object.strokeWidth;
    const { width, height } = object;
    if (object.type === "rect" || object.type === "frame" || object.type === "video") {
      roundedRect(ctx, width, height, object.cornerRadius);
      ctx.fill(); if (object.strokeWidth) ctx.stroke();
      if (object.type === "video") { ctx.fillStyle = "white"; ctx.font = "bold 40px Inter"; ctx.textAlign = "center"; ctx.fillText(">", width / 2, height / 2 - 18); }
    } else if (object.type === "ellipse") {
      ctx.beginPath(); ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2); ctx.fill(); if (object.strokeWidth) ctx.stroke();
    } else if (object.type === "triangle") {
      ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill(); if (object.strokeWidth) ctx.stroke();
    } else if (object.type === "line" || object.type === "arrow" || object.type === "pen") {
      const points = object.points ?? [0, 0, width, height];
      ctx.beginPath(); ctx.moveTo(points[0], points[1]);
      for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index], points[index + 1]);
      ctx.lineWidth = object.strokeWidth || 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      if (object.type === "arrow" && points.length >= 4) {
        const lastX = points[points.length - 2], lastY = points[points.length - 1];
        const angle = Math.atan2(lastY - points[points.length - 3], lastX - points[points.length - 4]);
        ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(lastX - 14 * Math.cos(angle - 0.45), lastY - 14 * Math.sin(angle - 0.45)); ctx.lineTo(lastX - 14 * Math.cos(angle + 0.45), lastY - 14 * Math.sin(angle + 0.45)); ctx.closePath(); ctx.fill();
      }
    } else if (object.type === "text") drawWrappedText(ctx, object);
    else if (object.type === "icon") { ctx.scale(width / 24, height / 24); ctx.fill(new Path2D(object.pathData ?? "M3 12c6-9 11-8 18-9-1 10-5 17-13 17-4 0-6-3-5-8Z")); }
    else if (object.type === "image") {
      const image = images.get(object.src ?? "");
      ctx.beginPath();
      if (object.arch) { ctx.moveTo(0, height); ctx.lineTo(0, width / 2); ctx.arc(width / 2, width / 2, width / 2, Math.PI, 0); ctx.lineTo(width, height); ctx.closePath(); }
      else roundedRect(ctx, width, height, object.cornerRadius);
      ctx.clip();
      ctx.fillRect(0, 0, width, height);
      if (image) {
        const ratio = Math.max(width / image.width, height / image.height);
        const drawWidth = image.width * ratio, drawHeight = image.height * ratio;
        ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      }
    }
    ctx.restore();
  });
  return canvas;
}

function escapeXml(input: string) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function inlineImage(src: string) {
  if (src.startsWith("data:")) return src;
  try {
    const blob = await fetch(src).then((response) => response.blob());
    return await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
  } catch { return src; }
}

async function pageToSvg(objects: CanvasObject[], offsetY: number, bounds: Bounds) {
  const parts: string[] = [];
  for (const object of objects.filter((item) => item.visible && item.type !== "group")) {
    const { x, y, width: w, height: h } = object;
    const fill = escapeXml(object.fill);
    const stroke = escapeXml(object.stroke);
    const transform = `translate(${x - bounds.x} ${y - bounds.y + offsetY}) rotate(${object.rotation})`;
    let shape = "";
    if (["rect", "frame", "video"].includes(object.type)) shape = `<rect width="${w}" height="${h}" rx="${object.cornerRadius}" fill="${fill}" stroke="${stroke}" stroke-width="${object.strokeWidth}"/>`;
    if (object.type === "ellipse") shape = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}"/>`;
    if (object.type === "triangle") shape = `<polygon points="${w / 2},0 ${w},${h} 0,${h}" fill="${fill}"/>`;
    if (["line", "arrow", "pen"].includes(object.type)) shape = `<polyline points="${(object.points ?? [0, 0, w, h]).reduce<string[]>((acc, value, index, values) => { if (index % 2 === 0) acc.push(`${value},${values[index + 1]}`); return acc; }, []).join(" ")}" fill="none" stroke="${stroke === "transparent" ? fill : stroke}" stroke-width="${object.strokeWidth || 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (object.type === "text") {
      const measurement = document.createElement("canvas").getContext("2d")!;
      measurement.font = `${object.fontWeight ?? "400"} ${object.fontSize ?? 16}px ${object.fontFamily ?? "Inter"}`;
      const textX = object.align === "center" ? w / 2 : object.align === "right" ? w : 0;
      const lines = getTextLines(measurement, object).filter((_, index) => index * (object.fontSize ?? 16) * (object.lineHeight ?? 1.2) < h);
      shape = `<text x="${textX}" y="${object.fontSize ?? 16}" fill="${fill}" font-family="${escapeXml(object.fontFamily ?? "Inter")}" font-size="${object.fontSize ?? 16}" font-weight="${object.fontWeight ?? "400"}" text-anchor="${object.align === "center" ? "middle" : object.align === "right" ? "end" : "start"}">${lines.map((line, index) => `<tspan x="${textX}" dy="${index ? (object.fontSize ?? 16) * (object.lineHeight ?? 1.2) : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
    }
    if (object.type === "icon") shape = `<path d="${escapeXml(object.pathData ?? "")}" transform="scale(${w / 24} ${h / 24})" fill="${fill}"/>`;
    if (object.type === "image" && object.src) {
      const clip = `clip-${object.id.replace(/[^a-zA-Z0-9]/g, "")}`;
      const path = object.arch ? `<path d="M0 ${h} L0 ${w / 2} A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2} L${w} ${h} Z"/>` : `<rect width="${w}" height="${h}" rx="${object.cornerRadius}"/>`;
      shape = `<defs><clipPath id="${clip}">${path}</clipPath></defs><image href="${await inlineImage(object.src)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`;
    }
    parts.push(`<g transform="${transform}" opacity="${object.opacity}">${shape}</g>`);
  }
  return parts.join("");
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export async function exportDesign(options: ExportOptions) {
  const { format, scope, projectName, pages, activePageId, objects, selectedObjectIds, onProgress } = options;
  const selectedPages = scope === "project" ? pages : pages.filter((page) => page.id === activePageId);
  if (!selectedPages.length) throw new Error("No page available to export.");
  if (scope === "selection" && !selectedObjectIds.length) throw new Error("Select an object before exporting the selection.");
  onProgress?.(8);
  await wait(160);
  const fileName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "design";
  if (format === "svg") {
    let markup = "";
    let svgWidth = ARTBOARD_WIDTH;
    let svgHeight = selectedPages.length * ARTBOARD_HEIGHT + (selectedPages.length - 1) * 25;
    for (let index = 0; index < selectedPages.length; index++) {
      const pageObjects = objects.filter((object) => object.pageId === selectedPages[index].id);
      const bounds = getBounds(pageObjects, selectedObjectIds, scope);
      if (scope === "selection") { svgWidth = Math.max(1, bounds.width); svgHeight = Math.max(1, bounds.height); }
      markup += await pageToSvg(scope === "selection" ? pageObjects.filter((object) => selectedObjectIds.includes(object.id)) : pageObjects, index * (ARTBOARD_HEIGHT + 25), bounds);
      onProgress?.(25 + (index + 1) / selectedPages.length * 60);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}"><rect width="100%" height="100%" fill="#fffef5"/>${markup}</svg>`;
    download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${fileName}.svg`);
  } else {
    const rendered: HTMLCanvasElement[] = [];
    for (let index = 0; index < selectedPages.length; index++) {
      const pageObjects = objects.filter((object) => object.pageId === selectedPages[index].id);
      const bounds = getBounds(pageObjects, selectedObjectIds, scope);
      rendered.push(await renderPageCanvas(scope === "selection" ? pageObjects.filter((object) => selectedObjectIds.includes(object.id)) : pageObjects, bounds, 2));
      onProgress?.(18 + (index + 1) / selectedPages.length * 65);
    }
    if (format === "pdf") {
      const first = rendered[0];
      const pdf = new jsPDF({ orientation: first.width > first.height ? "landscape" : "portrait", unit: "px", format: [first.width / 2, first.height / 2] });
      rendered.forEach((canvas, index) => { if (index) pdf.addPage([canvas.width / 2, canvas.height / 2], canvas.width > canvas.height ? "landscape" : "portrait"); pdf.addImage(canvas.toDataURL("image/jpeg", 0.91), "JPEG", 0, 0, canvas.width / 2, canvas.height / 2); });
      pdf.save(`${fileName}.pdf`);
    } else {
      const gap = rendered.length > 1 ? 32 : 0;
      const composite = document.createElement("canvas");
      composite.width = Math.max(...rendered.map((item) => item.width));
      composite.height = rendered.reduce((total, item) => total + item.height, 0) + gap * (rendered.length - 1);
      const ctx = composite.getContext("2d")!;
      ctx.fillStyle = "#fffef5"; ctx.fillRect(0, 0, composite.width, composite.height);
      let y = 0;
      rendered.forEach((canvas) => { ctx.drawImage(canvas, 0, y); y += canvas.height + gap; });
      const mime = format === "jpg" ? "image/jpeg" : "image/png";
      const blob = await new Promise<Blob>((resolve, reject) => composite.toBlob((result) => result ? resolve(result) : reject(new Error("Could not create the export file.")), mime, 0.94));
      download(blob, `${fileName}.${format}`);
    }
  }
  onProgress?.(100);
  await wait(220);
}