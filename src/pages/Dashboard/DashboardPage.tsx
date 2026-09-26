import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bell, ChevronDown, Clock3, FilePlus2, LayoutGrid, Plus, Search, UsersRound } from "lucide-react";
import { GlobalSidebar } from "../../components/editor/GlobalSidebar";
import { Brand } from "../../components/ui/Brand";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { ProjectThumbnail } from "../../components/ui/ProjectThumbnail";
import { findUser } from "../../data/mockUsers";
import { templates } from "../../data/mockTemplates";
import { buildTemplateObjects } from "../../data/seedCanvas";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import type { Project } from "../../types/project";

function timeSince(timestamp: number) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const invitedUsers = useProjectStore((state) => state.invitedUsers[project.id]);
  return <motion.button className="dashboard-project-card" onClick={onOpen} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
    <ProjectThumbnail variant={project.thumbnail} />
    <div className="project-card-content"><div className="project-card-title"><h3>{project.name}</h3><ArrowRight size={17} /></div><p>{project.description}</p><div className="project-card-meta"><span><Clock3 size={13} /> Edited {timeSince(project.updatedAt)}</span><span className="project-card-avatars">{project.collaboratorIds.slice(0, 3).map((id) => <Avatar key={id} user={invitedUsers?.find((user) => user.id === id) ?? findUser(id)} size="xs" />)}</span></div></div>
  </motion.button>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = useCollaborationStore((state) => state.currentUser);
  const projects = useProjectStore((state) => state.projects);
  const createProject = useProjectStore((state) => state.createProject);
  const modal = useUIStore((state) => state.modal);
  const setModal = useUIStore((state) => state.setModal);
  const showToast = useUIStore((state) => state.showToast);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"recent" | "mine" | "shared">("recent");
  const [newName, setNewName] = useState("");
  const [newTemplate, setNewTemplate] = useState("novagrow");
  const visibleProjects = useMemo(() => projects.filter((project) => {
    const matchesTab = tab === "recent" || (tab === "mine" ? project.ownerId === currentUser.id : project.ownerId !== currentUser.id);
    return matchesTab && project.name.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => b.updatedAt - a.updatedAt), [projects, search, tab]);

  const makeProject = () => {
    const template = templates.find((item) => item.id === newTemplate);
    const { project, page } = createProject(newName || "Untitled Design", template?.thumbnail ?? "landing");
    useCanvasStore.getState().replacePageObjects(page.id, buildTemplateObjects(newTemplate, page.id));
    setModal(null);
    setNewName("");
    showToast("Your new project is ready");
    navigate(`/editor/${project.id}`);
  };

  return <div className="app-shell dashboard-shell"><GlobalSidebar /><main className="dashboard-main">
    <header className="dashboard-topbar"><div className="mobile-dashboard-brand"><Brand compact /></div><div className="dashboard-breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div><div className="dashboard-top-actions"><label className="dashboard-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects..." /></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => showToast("You're all caught up", "info")}><Bell size={19} /><i /></button><Avatar user={currentUser} size="sm" /><span className="dashboard-account">{currentUser.name} <ChevronDown size={14} /></span></div></header>
    <div className="dashboard-scroll"><div className="dashboard-content">
      <motion.section className="dashboard-welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}><div><span className="section-kicker">YOUR CREATIVE WORKSPACE</span><h1>Good morning, {currentUser.name}<span className="welcome-period">.</span></h1><p>Great ideas are better together. Pick up where your team left off.</p><button className="primary-button" onClick={() => setModal("newProject")}><Plus size={18} /> Create new project</button></div><div className="welcome-visual" aria-hidden="true"><div className="welcome-orbit orbit-one" /><div className="welcome-orbit orbit-two" /><div className="welcome-sticker"><span>CREATE</span><b>together.</b><i /></div></div></motion.section>
      <section className="dashboard-projects-section"><div className="section-heading"><div><span className="section-kicker">THE WORKSPACE</span><h2>Your projects</h2><p>Everything you and your team are creating.</p></div><button className="text-link" onClick={() => navigate("/templates")}>Explore templates <ArrowRight size={16} /></button></div><div className="dashboard-tabs"><button className={tab === "recent" ? "active" : ""} onClick={() => setTab("recent")}><Clock3 size={16} /> Recent</button><button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}><LayoutGrid size={16} /> My projects</button><button className={tab === "shared" ? "active" : ""} onClick={() => setTab("shared")}><UsersRound size={16} /> Shared with me</button></div>
        {visibleProjects.length ? <div className="project-grid">{visibleProjects.map((project, index) => <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}><ProjectCard project={project} onOpen={() => navigate(`/editor/${project.id}`)} /></motion.div>)}<button className="new-project-card" onClick={() => setModal("newProject")}><span><Plus size={25} /></span><strong>Start something new</strong><small>Open up a blank canvas or pick a template.</small></button></div> : <div className="dashboard-empty"><FilePlus2 size={29} /><h3>No projects found</h3><p>Try a different search or create something new.</p><button className="primary-button" onClick={() => setModal("newProject")}>Create a project</button></div>}
      </section>
      <section className="dashboard-template-teaser"><div><span className="section-kicker">A LITTLE HEAD START</span><h2>Start with a spark.</h2><p>Thoughtfully made templates for whatever you're dreaming up.</p></div><button className="outline-button" onClick={() => navigate("/templates")}>Browse templates <ArrowRight size={16} /></button></section>
    </div></div>
  </main>
    <Modal open={modal === "newProject"} onClose={() => setModal(null)} title="Create a new project" subtitle="Give your next idea a place to grow."><div className="new-project-form"><label className="form-label">Project name<input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") makeProject(); }} placeholder="My brilliant new project" /></label><label className="form-label">Start from<select value={newTemplate} onChange={(event) => setNewTemplate(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><div className="modal-actions"><button className="outline-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={makeProject}>Create project <ArrowRight size={17} /></button></div></div></Modal>
  </div>;
}