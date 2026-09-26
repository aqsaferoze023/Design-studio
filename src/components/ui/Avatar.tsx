import { useState } from "react";
import type { User } from "../../types/user";

export function Avatar({ user, size = "md", showStatus = false, title }: { user: User; size?: "xs" | "sm" | "md" | "lg"; showStatus?: boolean; title?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`avatar avatar-${size}`} style={{ backgroundColor: `${user.color}28`, borderColor: user.color }} title={title ?? user.name}>
      {!failed ? <img src={user.avatar} alt={user.name} onError={() => setFailed(true)} loading="lazy" /> : <span style={{ color: user.color }}>{user.name.slice(0, 1)}</span>}
      {showStatus && <i className={`avatar-status ${user.status}`} />}
    </span>
  );
}