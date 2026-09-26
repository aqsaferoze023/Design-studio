import { useState } from "react";
import { Check, CircleAlert, MousePointer2, Plus, Send, Wifi, WifiOff, X } from "lucide-react";
import { findUser } from "../../data/mockUsers";
import { useCollaboration } from "../../hooks/useCollaboration";
import { collaborationService } from "../../services/collaborationService";
import { useCanvasStore } from "../../stores/canvasStore";
import { useCollaborationStore } from "../../stores/collaborationStore";
import { useProjectStore } from "../../stores/projectStore";
import { useUIStore } from "../../stores/uiStore";
import { Avatar } from "../ui/Avatar";

function relativeTime(timestamp: number) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function CommentList() {
  const comments = useCollaborationStore((state) => state.comments);
  const pageId = useProjectStore((state) => state.activePageId);
  const resolveComment = useCollaborationStore((state) => state.resolveComment);
  const replyComment = useCollaborationStore((state) => state.replyComment);
  const currentUserId = useCollaborationStore((state) => state.currentUser.id);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const visible = comments.filter((comment) => comment.pageId === pageId && !comment.resolved);
  const submitReply = (id: string) => {
    if (!reply.trim()) return;
    replyComment(id, currentUserId, reply.trim());
    const updated = useCollaborationStore.getState().comments.find((item) => item.id === id);
    if (updated) collaborationService.publishCommentUpdate(updated);
    setReply("");
    setReplyingTo(null);
  };
  const resolve = (id: string) => {
    resolveComment(id);
    const updated = useCollaborationStore.getState().comments.find((item) => item.id === id);
    if (updated) collaborationService.publishCommentUpdate(updated);
  };
  return <div className="collab-comments-scroll">{visible.length ? visible.map((comment) => { const user = findUser(comment.authorId); return <div className="side-comment" key={comment.id}><Avatar user={user} size="sm" /><div className="side-comment-body"><div className="side-comment-meta"><strong>{user.name}</strong><small>{relativeTime(comment.createdAt)}</small></div><p>{comment.message}</p>{comment.replies.map((item) => <div className="comment-reply" key={item.id}><b>{findUser(item.authorId).name}</b> {item.message}</div>)}<div className="comment-actions"><button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReply(""); }}>Reply</button><button onClick={() => resolve(comment.id)}>Resolve</button></div>{replyingTo === comment.id && <div className="reply-input"><input autoFocus value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitReply(comment.id); }} placeholder="Write a reply..." /><button onClick={() => submitReply(comment.id)}><Send size={14} /></button></div>}</div></div>; }) : <div className="comments-empty"><Check size={23} /><strong>All caught up</strong><span>No open comments on this page.</span></div>}</div>;
}

export function CollaborationPanel() {
  const open = useUIStore((state) => state.collaboratorPanelOpen);
  const connectedUsers = useCollaborationStore((state) => state.connectedUsers);
  const connectionStatus = useCollaborationStore((state) => state.connectionStatus);
  const mode = useCollaborationStore((state) => state.mode);
  const pendingCount = useCollaborationStore((state) => state.pendingCount);
  const setTool = useCanvasStore((state) => state.setTool);
  const showToast = useUIStore((state) => state.showToast);
  const [message, setMessage] = useState("");
  const { addComment } = useCollaboration();
  if (!open) return null;
  const submit = () => { if (!message.trim()) return; if (addComment(message, 405, 345)) { setMessage(""); showToast("Comment added to the canvas"); } };
  const statusLabel = connectionStatus === "connected" ? "Connected" : connectionStatus === "connecting" ? "Connecting..." : connectionStatus === "reconnecting" ? "Reconnecting..." : "Offline";

  return <aside className="collaboration-column"><section className="collab-card presence-card"><div className="collab-card-heading"><h3>Currently editing</h3><span className="live-pulse" title="Live presence" /><button className="collab-close" onClick={() => useUIStore.getState().toggleCollaboratorPanel()} title="Close collaborators"><X size={16} /></button></div><div className="presence-list">{connectedUsers.map((user) => <div className="presence-user" key={user.id}><Avatar user={user} size="md" showStatus /><div><strong>{user.name}</strong><small>{user.status === "away" ? "Away" : user.title}</small></div><MousePointer2 className="presence-pointer" size={15} fill={user.color} stroke={user.color} style={{ color: user.color }} /></div>)}</div></section>
    <section className="collab-card side-comments-card"><div className="collab-card-heading"><h3>Comments</h3><button title="Add comment on canvas" onClick={() => { setTool("comment"); showToast("Click anywhere on the canvas to leave a comment", "info"); }}><Plus size={17} /></button></div><CommentList /><div className="side-comment-compose"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="Add a comment..." aria-label="Add a comment" /><button onClick={submit} aria-label="Send comment" disabled={!message.trim()}><Send size={15} /></button></div></section>
    <section className="collab-card connection-card"><h3>Connection Status</h3><div className={`connection-line status-${connectionStatus}`}><span className="connection-light" /><div><strong>{statusLabel}</strong><small>{pendingCount ? `${pendingCount} changes waiting to sync` : mode === "demo" ? "Local demo sync active" : "Real-time sync active"}</small></div></div><div className={`demo-notice ${mode === "live" ? "live-notice" : ""}`}>{mode === "demo" ? <CircleAlert size={16} /> : connectionStatus === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}<div><strong>{mode === "demo" ? "Demo Collaboration Mode" : "Live collaboration"}</strong><p>{mode === "demo" ? "Using mock WebSocket events for demo. Connect your backend for real-time collaboration." : "Your team is connected to the project room."}</p></div></div></section>
  </aside>;
}