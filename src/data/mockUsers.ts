import type { User } from "../types/user";

export const currentUser: User = {
  id: "aqsa",
  name: "Aqsa",
  title: "Designer",
  avatar: "https://i.pravatar.cc/96?img=47",
  color: "#8b394c",
  status: "online",
  permission: "editor",
};

export const mockUsers: User[] = [
  {
    id: "sarah",
    name: "Sarah",
    title: "Designer",
    avatar: "https://i.pravatar.cc/96?img=44",
    color: "#f53579",
    status: "online",
    permission: "editor",
  },
  {
    id: "ahmed",
    name: "Ahmed",
    title: "Developer",
    avatar: "https://i.pravatar.cc/96?img=12",
    color: "#5b8947",
    status: "online",
    permission: "editor",
  },
  {
    id: "maria",
    name: "Maria",
    title: "Designer",
    avatar: "https://i.pravatar.cc/96?img=45",
    color: "#efa900",
    status: "online",
    permission: "commenter",
  },
  {
    id: "john",
    name: "John",
    title: "Viewer",
    avatar: "https://i.pravatar.cc/96?img=14",
    color: "#90a3ac",
    status: "away",
    permission: "viewer",
  },
];

export const allUsers = [currentUser, ...mockUsers];

export const findUser = (id: string) => allUsers.find((user) => user.id === id) ?? currentUser;