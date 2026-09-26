import { collaborationService } from "../services/collaborationService";
import { useCollaborationStore } from "../stores/collaborationStore";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import type { CanvasComment } from "../types/collaboration";

export function useCollaboration() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const pageId = useProjectStore((state) => state.activePageId);
  const currentUser = useCollaborationStore((state) => state.currentUser);

  function addComment(message: string, x: number, y: number) {
    if (currentUser.permission === "viewer") { useUIStore.getState().showToast("You need Commenter access to leave feedback.", "error"); return null; }
    const comment: CanvasComment = { id: crypto.randomUUID(), projectId, pageId, authorId: currentUser.id, x, y, message: message.trim(), createdAt: Date.now(), resolved: false, replies: [] };
    useCollaborationStore.getState().addComment(comment);
    useCollaborationStore.getState().addActivity({ id: crypto.randomUUID(), userId: currentUser.id, message: "left a comment", createdAt: Date.now(), icon: "comment" });
    collaborationService.publishComment(comment);
    return comment;
  }

  return { addComment, publishCursor: collaborationService.publishCursor.bind(collaborationService), publishSelection: collaborationService.publishSelection.bind(collaborationService) };
}