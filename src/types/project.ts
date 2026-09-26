export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  collaboratorIds: string[];
  updatedAt: number;
  createdAt: number;
  thumbnail: "landing" | "mobile" | "portfolio" | "dashboard" | "social";
  status: "In progress" | "Ready for review" | "Draft";
}

export interface Page {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface ProjectSettings {
  snapToGrid: boolean;
  showGrid: boolean;
  showCursors: boolean;
}

export interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: Project["thumbnail"];
  color: string;
}