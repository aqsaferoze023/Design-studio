# CollabCanvas

A browser-based collaborative design studio built with React, TypeScript, Vite, Zustand, React Konva, Socket.IO Client, Framer Motion, and Tailwind CSS. The app opens a populated design editor at `/` and also includes a project dashboard at `/dashboard` and a template library at `/templates`.

## Run

Install dependencies and start the Vite development server with `npm install` and `npm run dev`. Open the URL Vite prints. To connect a Node.js Socket.IO backend, copy `.env.example` to `.env` and set `VITE_SOCKET_URL` to the server origin. No backend is required: Demo Collaboration Mode simulates remote collaborators and also uses `BroadcastChannel` to synchronize edits between tabs on the same origin.

## Editor

- Click or drag with the shape tools to create layers. Select to drag, resize, rotate, multi-select with Shift, and edit text by double-clicking it.
- Scroll to pan; Ctrl/Cmd + scroll to zoom; hold Space or use the hand tool to pan by dragging. Alignment guides appear while dragging.
- Use the Pages and Layers panel to organize work. Drag layer rows to reorder. The Assets panel supports clicking or dragging assets onto the canvas.
- Open the profile menu to switch between demo identities and inspect Editor, Commenter, and Viewer permissions.
- Use Ctrl/Cmd + K for commands, Ctrl/Cmd + Z to undo, Ctrl/Cmd + Shift + Z to redo, and Ctrl/Cmd + S to save locally. V, R, O, T, L, C, F, and P select tools.
- Export the active frame, selected layers, or all pages as PNG, JPG, SVG, or PDF.

## Socket.IO Contract

The client emits `project:join` with `{ projectId, room: "project:<id>", user }` after connecting and `project:leave` on exit. The server should join the socket to that room and send a `project:snapshot` containing:

```ts
{
  projectId: string;
  objects: CanvasObject[];
  pages: Page[];
  comments: CanvasComment[];
  users: User[];
}
```

Relay events to the project room (normally excluding the sender): `user:joined`, `user:left`, `cursor:moved`, `object:selected`, `object:created`, `object:updated`, `object:moved`, `object:deleted`, `layer:reordered`, `comment:created`, `comment:updated`, and `page:changed`. See `src/types/` for payload definitions and `src/services/socketService.ts` for the typed client listeners.

Object mutations use the `ObjectOperation` envelope: unique operation ID, project/page/object IDs, user ID, partial or full payload, timestamp, and monotonically increasing object version. The client applies optimistic edits immediately, ignores duplicate/stale operations, reconciles incoming snapshots with pending local changes, and queues unsent events in local storage while disconnected. High-frequency cursor and drag-preview messages are throttled and sent as volatile Socket.IO events; final transforms are committed once to history. A backend should persist canonical versions and broadcast authoritative updates or a fresh snapshot after resolving conflicts.

Project data, canvas layers, comments, activity, invitations, and settings persist locally. The `src/stores/` directory isolates canvas, project, collaboration, and UI state; `src/hooks/` contains interaction and keyboard logic; `src/services/` contains networking and export logic.