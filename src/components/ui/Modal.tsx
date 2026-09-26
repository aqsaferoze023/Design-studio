import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ open, onClose, title, subtitle, children, size = "medium" }: { open: boolean; onClose: () => void; title?: string; subtitle?: string; children: ReactNode; size?: "small" | "medium" | "large" }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className={`modal-dialog modal-${size}`} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.19, ease: "easeOut" }} onMouseDown={(event) => event.stopPropagation()}>
            {title && <div className="modal-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}