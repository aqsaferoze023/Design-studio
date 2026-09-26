import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { GlobalSidebar } from "../../components/editor/GlobalSidebar";
import { ProjectThumbnail } from "../../components/ui/ProjectThumbnail";
import { templates } from "../../data/mockTemplates";
import { buildTemplateObjects } from "../../data/seedCanvas";
import { useCanvasStore } from "../../stores/canvasStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";

const categories = ["All templates", "Landing Page", "Mobile App", "Dashboard", "Social Media", "Presentation", "Portfolio", "E-commerce"];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const createProject = useProjectStore((state) => state.createProject);
  const [category, setCategory] = useState("All templates");
  const [query, setQuery] = useState("");
  const filtered = templates.filter((template) => (category === "All templates" || template.category === category) && template.name.toLowerCase().includes(query.toLowerCase()));

  const startTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId)!;
    const { project, page } = createProject(template.name, template.thumbnail);
    useCanvasStore.getState().replacePageObjects(page.id, buildTemplateObjects(template.id, page.id));
    useUIStore.getState().showToast(`${template.name} is ready to edit`);
    navigate(`/editor/${project.id}`);
  };

  return <div className="app-shell dashboard-shell"><GlobalSidebar /><main className="dashboard-main"><header className="dashboard-topbar"><button className="back-link" onClick={() => navigate("/dashboard")}><ArrowLeft size={16} /> Workspace</button><span className="template-top-label">THE COLLABCANVAS LIBRARY</span></header><div className="dashboard-scroll"><div className="dashboard-content templates-content"><div className="templates-intro"><span className="section-kicker">MADE TO MAKE THINGS HAPPEN</span><h1>A head start for<br /><em>every idea.</em></h1><p>Beautifully considered starting points. Make them yours, together.</p></div><div className="template-filters"><div className="category-filters">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="dashboard-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates" /></label></div><div className="template-grid">{filtered.map((template, index) => <motion.button key={template.id} className="template-card" onClick={() => startTemplate(template.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -4 }}><ProjectThumbnail variant={template.thumbnail} /><div className="template-card-meta"><div><small>{template.category}</small><h3>{template.name}</h3><p>{template.description}</p></div><ArrowRight size={19} /></div></motion.button>)}</div>{!filtered.length && <div className="dashboard-empty"><Search size={28} /><h3>No templates found</h3><p>Try another search or category.</p></div>}</div></div></main></div>;
}