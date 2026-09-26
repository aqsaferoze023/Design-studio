import { memo } from "react";
import { MousePointer2 } from "lucide-react";
import { findUser } from "../../data/mockUsers";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import type { Viewport } from "../../types/canvas";

export const CursorLayer = memo(function CursorLayer({ zoom, viewport }: { zoom: number; viewport: Viewport }) {
  const cursors = useCollaborationStore((state) => state.cursors);
  const currentUserId = useCollaborationStore((state) => state.currentUser.id);
  const pageId = useProjectStore((state) => state.activePageId);
  const showCursors = useProjectStore((state) => state.settings.showCursors);
  if (!showCursors) return null;
  return <div className="remote-cursors" aria-hidden="true">{Object.values(cursors).filter((cursor) => cursor.userId !== currentUserId && cursor.pageId === pageId && Date.now() - cursor.timestamp < 30000).map((cursor) => {
    const user = findUser(cursor.userId);
    return <div key={cursor.userId} className="remote-cursor" style={{ transform: `translate3d(${viewport.x + cursor.x * zoom}px, ${viewport.y + cursor.y * zoom}px, 0)`, color: user.color }}><MousePointer2 size={19} fill={user.color} stroke="#ffffff" strokeWidth={1.5} /><span style={{ backgroundColor: user.color }}>{user.name}</span></div>;
  })}</div>;
});