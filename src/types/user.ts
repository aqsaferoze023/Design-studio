export interface User {
  id: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
  status: "online" | "away";
  permission: "viewer" | "commenter" | "editor";
}