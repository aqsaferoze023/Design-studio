import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Boxes, Crown, Folder, LayoutDashboard, LayoutTemplate, Settings, UsersRound, Wifi } from "lucide-react";
import { Brand } from "../ui/Brand";
import { Avatar } from "../ui/Avatar";
import { mockUsers } from "../../data/mockUsers";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useUIStore } from "../../stores/uiStore";

export function GlobalSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useCollaborationStore((state) => state.connectionStatus);
  const setModal = useUIStore((state) => state.setModal);
  const setSidebarView = useUIStore((state) => state.setSidebarView);
  const setInspectorTab = useUIStore((state) => state.setInspectorTab);
  const showToast = useUIStore((state) => state.showToast);
  const inEditor = location.pathname.startsWith("/editor");
  const items = [
    { label: "Dashboard", icon: LayoutDashboard, action: () => navigate("/dashboard"), active: location.pathname === "/dashboard" },
    { label: "Projects", icon: Folder, action: () => navigate(inEditor ? "/dashboard" : "/editor/saas-landing"), active: inEditor },
    { label: "Templates", icon: LayoutTemplate, action: () => inEditor ? setModal("templates") : navigate("/templates"), active: location.pathname === "/templates" },
    { label: "Assets", icon: Boxes, action: () => { if (!inEditor) navigate("/editor/saas-landing"); setSidebarView("assets"); }, active: false },
    { label: "Team", icon: UsersRound, action: () => { if (!inEditor) navigate("/editor/saas-landing"); setModal("share"); }, active: false },
    { label: "Activity", icon: Activity, action: () => { if (!inEditor) navigate("/editor/saas-landing"); setInspectorTab("activity"); }, active: false },
    { label: "Settings", icon: Settings, action: () => { if (!inEditor) navigate("/editor/saas-landing"); setModal("settings"); }, active: false },
  ];

  return <aside className="global-sidebar">
    <div className="sidebar-brand"><Brand /></div>
    <nav className="global-nav" aria-label="Main navigation">{items.map(({ label, icon: Icon, action, active }) => <button key={label} onClick={action} className={`global-nav-item ${active ? "active" : ""}`} title={label}><Icon size={21} strokeWidth={1.9} /><span>{label}</span></button>)}</nav>
    <div className="sidebar-bottom">
      <button className="upgrade-box" onClick={() => showToast("Your team is on the Studio plan", "info")}><Crown size={22} fill="#60884c" strokeWidth={1.5} /><strong>Upgrade to Pro</strong><span>Unlock more features,<br />collaborate without limits.</span><em>Explore plans</em></button>
      <div className="sidebar-presence"><div className="connected-line"><span className={`presence-dot ${status === "connected" ? "" : "disconnected"}`} />{status === "connected" ? "Connected" : status === "reconnecting" ? "Reconnecting" : status === "offline" ? "Offline" : "Connecting"}</div><div className="mini-avatars">{mockUsers.slice(0, 4).map((user) => <Avatar key={user.id} user={user} size="xs" />)}</div><small>4 collaborators online</small><span className="sidebar-wifi"><Wifi size={14} /></span></div>
    </div>
  </aside>;
}