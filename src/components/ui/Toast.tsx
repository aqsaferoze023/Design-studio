import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

export function Toast() {
  const toast = useUIStore((state) => state.toast);
  const clear = useUIStore((state) => state.clearToast);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(clear, 3600);
    return () => window.clearTimeout(timeout);
  }, [toast, clear]);
  return <AnimatePresence>{toast && <motion.div className={`toast toast-${toast.kind}`} role="status" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
    {toast.kind === "success" ? <Check size={16} /> : toast.kind === "error" ? <CircleAlert size={16} /> : <Info size={16} />}
    <span>{toast.message}</span><button onClick={clear} aria-label="Dismiss"><X size={14} /></button>
  </motion.div>}</AnimatePresence>;
}