import { create } from "zustand";
import {
  api,
  streamChat,
  type ApiChatSummary,
  type ProvidersResponse,
  type SettingsPublic,
  type Integration,
  type CustomModel,
  type MeResponse,
  type Project,
} from "./api";

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** Tool calls / steps performed during this assistant turn. */
  activities?: Activity[];
}

export interface Activity {
  id: string;
  label: string;
  icon?: string;
  done: boolean;
}

export interface Chat {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
  /** High-level streaming status for the assistant turn in-flight. */
  status?: string; // e.g., "Thinking", "Drafting", "Planning"
  working?: boolean;
  error?: string;
  activities: Activity[];
  /** True when the backend signaled the provider isn't set up; UI shows a retry action. */
  needsSetup?: boolean;
  /** Last user message in this chat, used for the retry button. */
  lastUserMessage?: string;
}

export type View = "chat" | "settings" | "projects";

export type ChatBucket = "Today" | "This week" | "Earlier";

interface AppState {
  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  view: View;
  setView: (v: View) => void;

  // Backend state
  providers: ProvidersResponse | null;
  integrations: Integration[];
  settings: SettingsPublic | null;
  chatSummaries: ApiChatSummary[];
  me: MeResponse | null;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;

  // Onboarding UI state
  onboardingDone: boolean | null;
  setOnboardingDone: (v: boolean) => void;

  // Composer state
  model: string;
  setModel: (m: string) => void;
  webSearch: boolean;
  toggleWeb: () => void;

  // Per-chat runtime cache
  chats: Record<string, Chat>;
  /**
   * The chat the user is currently viewing. null = landing (new chat).
   * A brand-new chat is NOT created in the history until the user sends
   * the first message.
   */
  activeChatId: string | null;

  // Abort for an in-flight stream
  _abort: AbortController | null;

  // Projects
  projects: Project[];
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<void>;
  updateProject: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Memory / user-md content (cached for settings editor)
  memoryContent: string;
  userMdContent: string;
  refreshMemory: () => Promise<void>;
  saveMemory: (content: string) => Promise<void>;
  refreshUserMd: () => Promise<void>;
  saveUserMd: (content: string) => Promise<void>;

  // Actions
  bootstrap: () => Promise<void>;
  refreshChats: () => Promise<void>;
  refreshProviders: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshIntegrations: () => Promise<void>;
  refreshMe: () => Promise<void>;

  openLanding: () => void;
  openChat: (id: string) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;

  send: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  stop: () => void;

  saveSettings: (patch: Partial<SettingsPublic> & { api_keys?: Record<string, string> }) => Promise<void>;
  upsertCustomModel: (m: Omit<CustomModel, "id"> & { id?: string }) => Promise<void>;
  deleteCustomModel: (id: string) => Promise<void>;
}

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useApp = create<AppState>((set, get) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  view: "chat",
  setView: (v) => set({ view: v }),

  providers: null,
  integrations: [],
  settings: null,
  chatSummaries: [],
  me: null,
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),

  onboardingDone: null,
  setOnboardingDone: (v) => set({ onboardingDone: v }),

  model: "",
  setModel: (m) => set({ model: m }),
  webSearch: false,
  toggleWeb: () => set((s) => ({ webSearch: !s.webSearch })),

  chats: {},
  activeChatId: null,
  _abort: null,

  projects: [],
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
  memoryContent: "",
  userMdContent: "",

  refreshProjects: async () => {
    try {
      const { projects } = await api.listProjects();
      set({ projects });
    } catch { /* ignore */ }
  },

  createProject: async (name, description) => {
    await api.createProject(name, description);
    await get().refreshProjects();
  },

  updateProject: async (id, data) => {
    await api.updateProject(id, data);
    await get().refreshProjects();
  },

  deleteProject: async (id) => {
    await api.deleteProject(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  refreshMemory: async () => {
    try {
      const { content } = await api.getMemory();
      set({ memoryContent: content });
    } catch { /* ignore */ }
  },

  saveMemory: async (content) => {
    await api.putMemory(content);
    set({ memoryContent: content });
  },

  refreshUserMd: async () => {
    try {
      const { content } = await api.getUserMd();
      set({ userMdContent: content });
    } catch { /* ignore */ }
  },

  saveUserMd: async (content) => {
    await api.putUserMd(content);
    set({ userMdContent: content });
  },

  bootstrap: async () => {
    await Promise.all([
      get().refreshProviders(),
      get().refreshSettings(),
      get().refreshIntegrations(),
      get().refreshChats(),
      get().refreshMe(),
      get().refreshProjects(),
      api
        .onboardStatus()
        .then((st) => set({ onboardingDone: !!st.completed }))
        .catch(() => set({ onboardingDone: true })),
    ]);
    // default model: backend default if not chosen, else first configured model
    if (!get().model) {
      const p = get().providers;
      const fallback =
        p?.default_model ||
        p?.models.find((m) => m.configured)?.id ||
        p?.models[0]?.id ||
        "";
      if (fallback) set({ model: fallback });
    }
  },

  refreshChats: async () => {
    try {
      const { chats } = await api.listChats();
      set({ chatSummaries: chats });
    } catch {
      /* ignore */
    }
  },

  refreshProviders: async () => {
    try {
      const p = await api.providers();
      set({ providers: p });
    } catch {
      /* ignore */
    }
  },

  refreshSettings: async () => {
    try {
      const s = await api.getSettings();
      set({ settings: s });
    } catch {
      /* ignore */
    }
  },

  refreshIntegrations: async () => {
    try {
      const { integrations } = await api.integrations();
      set({ integrations });
    } catch {
      /* ignore */
    }
  },

  refreshMe: async () => {
    try {
      const me = await api.me();
      set({ me });
    } catch {
      /* ignore */
    }
  },

  openLanding: () => set({ activeChatId: null, view: "chat" }),

  openChat: async (id) => {
    set({ activeChatId: id, view: "chat" });
    // Fetch full chat lazily
    if (!get().chats[id]) {
      try {
        const full = await api.getChat(id);
        const messages: Message[] = full.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            id: m.id,
            role: m.role as Role,
            content: m.content,
            createdAt: m.created_at,
          }));
        set((s) => ({
          chats: {
            ...s.chats,
            [id]: {
              id,
              title: full.title,
              updatedAt: full.updated_at,
              messages,
              activities: [],
            },
          },
        }));
      } catch (e) {
        set((s) => ({
          chats: {
            ...s.chats,
            [id]: {
              id,
              title: "Unavailable",
              updatedAt: Date.now(),
              messages: [],
              error: String(e),
              activities: [],
            },
          },
        }));
      }
    }
  },

  deleteChat: async (id) => {
    try {
      await api.deleteChat(id);
    } catch {
      /* ignore */
    }
    set((s) => {
      const { [id]: _, ...rest } = s.chats;
      void _;
      return {
        chats: rest,
        activeChatId: s.activeChatId === id ? null : s.activeChatId,
      };
    });
    await get().refreshChats();
  },

  renameChat: async (id, title) => {
    try {
      await api.renameChat(id, title);
    } catch {
      /* ignore */
    }
    set((s) => {
      const c = s.chats[id];
      if (!c) return s;
      return { chats: { ...s.chats, [id]: { ...c, title } } };
    });
    await get().refreshChats();
  },

  stop: () => {
    get()._abort?.abort();
    set({ _abort: null });
  },

  retry: async () => {
    // Re-send the last user message for the current chat. Drops the trailing
    // assistant "setup needed" message so the UI doesn't duplicate.
    const id = get().activeChatId;
    if (!id) return;
    const c = get().chats[id];
    if (!c) return;
    const last = c.lastUserMessage;
    if (!last) return;

    // Remove the last assistant message (the setup error) and the prior user
    // message — `send` will re-append both cleanly.
    set((s) => {
      const chat = s.chats[id];
      if (!chat) return s;
      const msgs = [...chat.messages];
      // drop trailing assistant
      while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
      // drop matching trailing user
      if (msgs.length && msgs[msgs.length - 1].role === "user"
        && msgs[msgs.length - 1].content === last) {
        msgs.pop();
      }
      return {
        chats: {
          ...s.chats,
          [id]: { ...chat, messages: msgs, needsSetup: false, error: undefined },
        },
      };
    });

    // Refresh providers so a newly added key is picked up, then send.
    await get().refreshProviders();
    const p = get().providers;
    if (p && !get().model) {
      const fallback = p.default_model
        || p.models.find((m) => m.configured)?.id
        || p.models[0]?.id
        || "";
      if (fallback) set({ model: fallback });
    }
    await get().send(last);
  },

  send: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const currentId = get().activeChatId;
    const model = get().model || get().providers?.default_model || "";

    // Optimistically place the user message into a local chat.
    // If there's no active chat yet, create a provisional client-side one; the
    // server will assign the real id via the "chat" SSE event and we reconcile.
    let localId = currentId ?? `tmp_${uid()}`;
    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    set((s) => {
      const existing = s.chats[localId];
      const chat: Chat = existing
        ? {
          ...existing,
          messages: [...existing.messages, userMsg],
          working: true,
          status: "Thinking",
          error: undefined,
          needsSetup: false,
          lastUserMessage: trimmed,
          activities: [],
          updatedAt: Date.now(),
        }
        : {
          id: localId,
          title:
            trimmed.slice(0, 56) + (trimmed.length > 56 ? "…" : ""),
          updatedAt: Date.now(),
          messages: [userMsg],
          working: true,
          status: "Thinking",
          lastUserMessage: trimmed,
          activities: [],
        };
      return {
        chats: { ...s.chats, [localId]: chat },
        activeChatId: localId,
      };
    });

    // Prepare assistant message placeholder for streaming
    const asstId = uid();
    set((s) => {
      const c = s.chats[localId]!;
      return {
        chats: {
          ...s.chats,
          [localId]: {
            ...c,
            messages: [
              ...c.messages,
              {
                id: asstId,
                role: "assistant",
                content: "",
                createdAt: Date.now(),
              },
            ],
          },
        },
      };
    });

    const controller = new AbortController();
    set({ _abort: controller });

    try {
      await streamChat(
        {
          chat_id: currentId && !currentId.startsWith("tmp_") ? currentId : undefined,
          message: trimmed,
          model,
        },
        (evt) => {
          if (evt.type === "chat") {
            // Server assigned an id — reconcile if we were provisional.
            const prevId = localId;
            if (prevId !== evt.id) {
              set((s) => {
                const c = s.chats[prevId];
                if (!c) return s;
                const { [prevId]: _, ...rest } = s.chats;
                void _;
                const updated: Chat = { ...c, id: evt.id, title: evt.title };
                return {
                  chats: { ...rest, [evt.id]: updated },
                  activeChatId: evt.id,
                };
              });
              localId = evt.id;
            }
          } else if (evt.type === "status") {
            set((s) => {
              const c = s.chats[localId];
              if (!c) return s;
              return {
                chats: {
                  ...s.chats,
                  [localId]: { ...c, status: evt.text, working: true },
                },
              };
            });
          } else if (evt.type === "delta") {
            set((s) => {
              const c = s.chats[localId];
              if (!c) return s;
              const msgs = c.messages.map((m) =>
                m.id === asstId ? { ...m, content: m.content + evt.text } : m,
              );
              return {
                chats: {
                  ...s.chats,
                  [localId]: { ...c, messages: msgs },
                },
              };
            });
          } else if (evt.type === "needs_setup") {
            set((s) => {
              const c = s.chats[localId];
              if (!c) return s;
              return {
                chats: {
                  ...s.chats,
                  [localId]: { ...c, needsSetup: true },
                },
              };
            });
          } else if (evt.type === "error") {
            set((s) => {
              const c = s.chats[localId];
              if (!c) return s;
              return {
                chats: {
                  ...s.chats,
                  [localId]: { ...c, error: evt.text, working: false, status: undefined },
                },
              };
            });
          } else if (evt.type === "activity") {
            set((s) => {
              const c = s.chats[localId];
              if (!c) return s;
              const existing = c.activities.find((a) => a.id === evt.id);
              let activities = c.activities;
              if (existing) {
                activities = activities.map((a) =>
                  a.id === evt.id
                    ? { ...a, label: evt.label, icon: evt.icon, done: evt.done ?? false }
                    : a,
                );
              } else {
                activities = [...activities, { id: evt.id, label: evt.label, icon: evt.icon, done: evt.done ?? false }];
              }
              // Sync activities to the assistant message for persistence
              const msgs = c.messages.map((m) =>
                m.id === asstId ? { ...m, activities } : m,
              );
              return {
                chats: {
                  ...s.chats,
                  [localId]: { ...c, activities, messages: msgs },
                },
              };
            });
          } else if (evt.type === "done" || evt.type === "end") {
            set((s) => {
              const c = s.chats[localId];
              if (!c) return s;
              // Final sync of activities to the assistant message
              const msgs = c.messages.map((m) =>
                m.id === asstId ? { ...m, activities: [...c.activities] } : m,
              );
              return {
                chats: {
                  ...s.chats,
                  [localId]: { ...c, working: false, status: undefined, messages: msgs },
                },
              };
            });
          }
        },
        controller.signal,
      );
    } catch (e) {
      set((s) => {
        const c = s.chats[localId];
        if (!c) return s;
        return {
          chats: {
            ...s.chats,
            [localId]: { ...c, working: false, status: undefined, error: String(e) },
          },
        };
      });
    } finally {
      set({ _abort: null });
      // Refresh history so the new chat shows up in the sidebar.
      get().refreshChats();
    }
  },

  saveSettings: async (patch) => {
    const s = await api.putSettings(patch);
    set({ settings: s });
    await get().refreshProviders();
  },

  upsertCustomModel: async (m) => {
    await api.upsertCustomModel(m);
    await Promise.all([get().refreshProviders(), get().refreshSettings()]);
  },

  deleteCustomModel: async (id) => {
    await api.deleteCustomModel(id);
    await Promise.all([get().refreshProviders(), get().refreshSettings()]);
  },
}));

export function bucketFor(ts: number): ChatBucket {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Today";
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (ts > weekAgo) return "This week";
  return "Earlier";
}
