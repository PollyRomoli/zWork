import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
  Star,
  Lock,
  Plus,
  FileText,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { cn } from "../lib/cn";
import { useApp } from "../lib/store";
import { ChatInput } from "./ChatInput";
import { IconButton } from "./IconButton";
import { api } from "../lib/api";

/**
 * Detail view for a single project. Layout:
 *   left column — header + composer + past chats
 *   right column — Memory / Instructions / Files cards
 */
export function ProjectView() {
  const activeId = useApp((s) => s.activeProjectId);
  const projects = useApp((s) => s.projects);
  const chatSummaries = useApp((s) => s.chatSummaries);
  const setView = useApp((s) => s.setView);
  const setActiveProject = useApp((s) => s.setActiveProject);
  const updateProject = useApp((s) => s.updateProject);
  const openChat = useApp((s) => s.openChat);

  const project = useMemo(
    () => projects.find((p) => p.id === activeId) || null,
    [projects, activeId],
  );

  const [starred, setStarred] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Editable name/description inline
  const [editingField, setEditingField] = useState<"name" | "description" | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");

  useEffect(() => {
    if (!project) return;
    setNameDraft(project.name);
    setDescDraft(project.description || "");
  }, [project?.id, project?.name, project?.description]);

  // Instructions (project.md)
  const [instructions, setInstructions] = useState<string>("");
  const [instrDraft, setInstrDraft] = useState<string>("");
  const [instrEditing, setInstrEditing] = useState(false);
  const [instrSaving, setInstrSaving] = useState(false);

  useEffect(() => {
    if (!activeId) return;
    void api
      .getProjectContext(activeId)
      .then((r) => {
        setInstructions(r.content || "");
        setInstrDraft(r.content || "");
      })
      .catch(() => {});
  }, [activeId]);

  if (!project) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-paper">
        <p className="text-[14px] text-ink-muted">No project selected</p>
        <button
          type="button"
          onClick={() => setView("settings")}
          className="press rounded-md border border-line bg-paper-raised px-3 py-1.5 text-[12.5px] text-ink hover:bg-paper-sunken"
        >
          Manage projects
        </button>
      </div>
    );
  }

  const projectChats = chatSummaries.filter((c) =>
    project.chat_ids?.includes(c.id),
  );

  const commitName = async () => {
    const next = nameDraft.trim();
    setEditingField(null);
    if (next && next !== project.name) {
      await updateProject(project.id, { name: next });
    } else {
      setNameDraft(project.name);
    }
  };

  const commitDesc = async () => {
    const next = descDraft.trim();
    setEditingField(null);
    if (next !== (project.description || "")) {
      await updateProject(project.id, { description: next });
    }
  };

  const saveInstructions = async () => {
    setInstrSaving(true);
    try {
      await api.putProjectContext(project.id, instrDraft);
      setInstructions(instrDraft);
      setInstrEditing(false);
    } finally {
      setInstrSaving(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-paper">
      {/* Titlebar: back to all projects */}
      <div className="titlebar-drag flex h-12 shrink-0 items-center border-b border-line px-4">
        <div data-no-drag>
          <button
            type="button"
            onClick={() => {
              setActiveProject(null);
              setView("settings");
            }}
            className="press inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] text-ink-muted hover:bg-paper-sunken hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All projects
          </button>
        </div>
      </div>

      {/* Body: 2-column responsive grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:py-10">
          {/* LEFT: header + composer + chats */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editingField === "name" ? (
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitName();
                      if (e.key === "Escape") {
                        setNameDraft(project.name);
                        setEditingField(null);
                      }
                    }}
                    className="w-full bg-transparent font-serif text-[40px] font-medium leading-tight text-ink focus:outline-none"
                  />
                ) : (
                  <h1
                    onClick={() => setEditingField("name")}
                    className="cursor-text font-serif text-[40px] font-medium leading-tight tracking-tight text-ink"
                  >
                    {project.name}
                  </h1>
                )}
                {editingField === "description" ? (
                  <input
                    autoFocus
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={commitDesc}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitDesc();
                      if (e.key === "Escape") {
                        setDescDraft(project.description || "");
                        setEditingField(null);
                      }
                    }}
                    placeholder="goal"
                    className="mt-1 w-full bg-transparent text-[14px] text-ink-muted focus:outline-none"
                  />
                ) : (
                  <p
                    onClick={() => setEditingField("description")}
                    className="mt-1 cursor-text text-[14px] text-ink-muted"
                  >
                    {project.description?.trim() || (
                      <span className="text-ink-faint">goal</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <ProjectMenu
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                  projectId={project.id}
                />
                <IconButton
                  icon={<Star className={cn(starred && "fill-amber-400 text-amber-400")} />}
                  label={starred ? "Unstar" : "Star"}
                  size="md"
                  onClick={() => setStarred((v) => !v)}
                />
              </div>
            </div>

            {/* Composer */}
            <ChatInput
              placeholder="How can I help you today?"
              autoFocus
            />

            {/* Chats card */}
            <div className="rounded-2xl border border-line bg-paper-raised p-5">
              {projectChats.length === 0 ? (
                <p className="text-center text-[13px] text-ink-muted">
                  Start a chat to keep conversations organized and re-use project knowledge.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {projectChats.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => void openChat(c.id)}
                        className="press flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[13px] text-ink hover:bg-paper-sunken"
                      >
                        <span className="truncate">{c.title}</span>
                        <span className="ml-3 shrink-0 text-[11px] text-ink-faint">
                          {c.message_count} msgs
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT: memory / instructions / files */}
          <aside className="flex flex-col gap-5">
            {/* Memory card */}
            <section className="rounded-2xl border border-line bg-paper-raised p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">Memory</h3>
                  <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
                    Project memory will show here after a few chats.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-[10.5px] font-medium text-ink-muted">
                  <Lock className="h-3 w-3" /> Only you
                </span>
              </div>
            </section>

            {/* Instructions card */}
            <section className="rounded-2xl border border-line bg-paper-raised p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-ink">Instructions</h3>
                  <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
                    Add instructions to tailor zWork's responses
                  </p>
                </div>
                <IconButton
                  icon={instrEditing ? <X /> : <Plus />}
                  label={instrEditing ? "Cancel" : "Edit"}
                  size="sm"
                  onClick={() => {
                    if (instrEditing) setInstrDraft(instructions);
                    setInstrEditing((v) => !v);
                  }}
                />
              </div>
              {instrEditing ? (
                <div className="mt-3">
                  <textarea
                    rows={6}
                    value={instrDraft}
                    onChange={(e) => setInstrDraft(e.target.value)}
                    placeholder="e.g. Always respond in markdown. Prefer concise answers."
                    className="block w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[12px] leading-5 text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={instrSaving}
                      onClick={() => void saveInstructions()}
                      className="press inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1 text-[12px] font-medium text-paper hover:bg-ink-soft disabled:opacity-40"
                    >
                      {instrSaving ? "Saving…" : (
                        <>
                          <Check className="h-3 w-3" /> Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : instructions.trim() ? (
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-paper-sunken p-3 font-mono text-[11.5px] leading-5 text-ink-muted">
                  {instructions}
                </pre>
              ) : null}
            </section>

            {/* Files card */}
            <section className="rounded-2xl border border-line bg-paper-raised p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-semibold text-ink">Files</h3>
                <IconButton icon={<Plus />} label="Add file" size="sm" />
              </div>
              <div className="mt-3 flex flex-col items-center justify-center gap-3 rounded-xl bg-paper-sunken px-4 py-8">
                <div className="relative flex items-end gap-1 text-ink-faint">
                  <FileText className="h-8 w-8" />
                  <FileText className="h-10 w-10 -ml-3" />
                  <FileText className="h-8 w-8 -ml-3" />
                </div>
                <p className="max-w-[220px] text-center text-[11.5px] leading-5 text-ink-muted">
                  Add PDFs, documents, or other text to reference in this project.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ProjectMenu({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  projectId: string;
}) {
  const deleteProject = useApp((s) => s.deleteProject);
  const setActiveProject = useApp((s) => s.setActiveProject);
  const setView = useApp((s) => s.setView);

  const remove = async () => {
    await deleteProject(projectId);
    setActiveProject(null);
    setView("settings");
  };

  return (
    <div className="relative">
      <IconButton
        icon={<MoreHorizontal />}
        label="More"
        size="md"
        onClick={() => onOpenChange(!open)}
      />
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-[180px] animate-fade-in rounded-xl border border-line-strong bg-paper-raised p-1 shadow-pop"
          role="menu"
          onMouseLeave={() => onOpenChange(false)}
        >
          <button
            type="button"
            onClick={() => void remove()}
            role="menuitem"
            className="press flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete project
          </button>
        </div>
      )}
    </div>
  );
}
