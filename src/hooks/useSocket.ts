import { useEffect } from "react";
import { collaborationService } from "../services/collaborationService";

export function useSocket(projectId: string, userId: string) {
  useEffect(() => {
    if (!projectId) return;
    collaborationService.start(projectId);
    return () => collaborationService.stop();
  }, [projectId, userId]);
}