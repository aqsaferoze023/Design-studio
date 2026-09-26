import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toast } from "./components/ui/Toast";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import EditorPage from "./pages/Editor/EditorPage";
import TemplatesPage from "./pages/Templates/TemplatesPage";

export default function App() {
  return <BrowserRouter><Routes><Route path="/" element={<Navigate to="/editor/saas-landing" replace />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/templates" element={<TemplatesPage />} /><Route path="/editor/:projectId" element={<EditorPage />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes><Toast /></BrowserRouter>;
}
