import type { Page, Project } from "../types/project";

const now = Date.now();

export const initialProjects: Project[] = [
  {
    id: "saas-landing",
    name: "SaaS Landing Page",
    description: "A greener way to grow, together.",
    ownerId: "aqsa",
    collaboratorIds: ["sarah", "ahmed", "maria", "john"],
    createdAt: now - 1000 * 60 * 60 * 24 * 9,
    updatedAt: now - 1000 * 60 * 2,
    thumbnail: "landing",
    status: "In progress",
  },
  {
    id: "mobile-banking",
    name: "Mobile Banking App",
    description: "Thoughtful finance for everyone.",
    ownerId: "aqsa",
    collaboratorIds: ["ahmed", "sarah"],
    createdAt: now - 1000 * 60 * 60 * 24 * 15,
    updatedAt: now - 1000 * 60 * 60 * 5,
    thumbnail: "mobile",
    status: "Ready for review",
  },
  {
    id: "portfolio-site",
    name: "Portfolio Website",
    description: "A personal space for good work.",
    ownerId: "maria",
    collaboratorIds: ["aqsa", "maria"],
    createdAt: now - 1000 * 60 * 60 * 24 * 22,
    updatedAt: now - 1000 * 60 * 60 * 24,
    thumbnail: "portfolio",
    status: "Draft",
  },
  {
    id: "commerce-dashboard",
    name: "E-commerce Dashboard",
    description: "Commerce insights at a glance.",
    ownerId: "aqsa",
    collaboratorIds: ["ahmed", "john"],
    createdAt: now - 1000 * 60 * 60 * 24 * 30,
    updatedAt: now - 1000 * 60 * 60 * 60,
    thumbnail: "dashboard",
    status: "In progress",
  },
];

export const initialPages: Page[] = [
  { id: "home", projectId: "saas-landing", name: "Home", order: 0 },
  { id: "about", projectId: "saas-landing", name: "About", order: 1 },
  { id: "pricing", projectId: "saas-landing", name: "Pricing", order: 2 },
  { id: "contact", projectId: "saas-landing", name: "Contact", order: 3 },
  { id: "mobile-home", projectId: "mobile-banking", name: "Overview", order: 0 },
  { id: "portfolio-home", projectId: "portfolio-site", name: "Home", order: 0 },
  { id: "commerce-home", projectId: "commerce-dashboard", name: "Dashboard", order: 0 },
];