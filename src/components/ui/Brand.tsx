import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className={`brand ${compact ? "brand-compact" : ""}`} aria-label="CollabCanvas dashboard">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 42 42" fill="none">
          <path d="M35.5 3.5C20.1 3.1 7.4 8.9 4.5 20.9c-1.5 6.2 1.7 12.4 7.8 15.2C25.4 40.7 36.3 27.6 35.5 3.5Z" fill="#92374C" />
          <path d="M8 34C14 22.5 23.2 13.5 34.5 6.5M11.2 29.5l-3-8M18.5 21.2l-1.2-9M23.9 16.9l8.2.4M14.1 26.1l10.4 1.5" stroke="#FFF9F3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && <span className="brand-copy"><strong>CollabCanvas</strong><small>Design together. In real time.</small></span>}
    </Link>
  );
}