// Fake API pour TikTroQ (localStorage-based)

import type { PostT, UserT, ConversationT } from "../TikTroQApp";

const LS = {
  users: "tiktroq.users",
  posts: "tiktroq.posts",
  convs: "tiktroq.conversations",
};

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const Api = {
  getUsers: (): UserT[] => load(LS.users, []),
  saveUsers: (users: UserT[]) => save(LS.users, users),

  getPosts: (): PostT[] => load(LS.posts, []),
  savePosts: (posts: PostT[]) => save(LS.posts, posts),

  getConvs: (): ConversationT[] => load(LS.convs, []),
  saveConvs: (convs: ConversationT[]) => save(LS.convs, convs),
};
