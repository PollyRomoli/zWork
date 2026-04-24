import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Table2, Code2, BarChart3, Globe, GitCompare, X } from "lucide-react";
import { useApp, type ArtifactKind } from "../lib/store";
import { IconButton } from "./IconButton";

const KIND_META: Record<ArtifactKind, { icon: ReactNode; label: string; note: string }> = {
  code: { icon: <Code2 className="h-3.5 w-3.5" />, label: "Code", note: "Plain text or code snippet" },
  diff: { icon: <GitCompare className="h-3.5 w-3.5" />, label: "Diff", note: "Patch or comparison text" },
  doc: { icon: <FileText className="h-3.5 w-3.5" />, label: "Document", note: "Editable prose / markdown" },
  sheet: { icon: <Table2 className="h-3.5 w-3.5" />, label: "Sheet", note: "Editable tabular text" },
  graph: { icon: <BarChart3 className="h-3.5 w-3.5" />, label: "Graph", note: "Chart recipe or data" },
  preview: { icon: <Globe className="h-3.5 w-3.5" />, label: "Preview", note: "Rendered preview text" },
};

export function ArtifactPanel() {
  const open = useApp((s) => s.artifactPanelOpen);
  const artifacts = useApp((s) => s.artifacts);
  const activeId = useApp((s) => s.activeArtifactId);
  const close = useApp((s) => s.closeArtifactPanel);
  const updateArtifact = useApp((s) => s.updateArtifact);

  const active = artifacts.find((a) => a.id === activeId) ?? artifacts[0];
  const [draftTitle, setDraftTitle] = useState(active?.title ?? "");
  const [draftContent, setDraftContent] = useState(active?.content ?? "");

  useEffect(() => {
    setDraftTitle(active?.title ?? "");
    setDraftContent(active?.content ?? "");
  }, [active?.id, active?.title, active?.content]);

  const meta = useMemo(
    () => (active ? KIND_META[active.kind] : null),
    [active],
  );

  const hasArtifact = !!active;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="artifact-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "clamp(420px, 46vw, 760px)", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="h-full shrink-0 overflow-hidden border-l border-line bg-paper-raised"
        >
          <div className="flex h-full flex-col">
            <div className="titlebar-drag flex h-12 shrink-0 items-center justify-between border-b border-line px-3">
              {hasArtifact ? (
                <div className="min-w-0 flex-1" data-no-drag>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-paper-sunken text-ink-muted">
                      {meta?.icon}
                    </span>
                    <input
                      value={draftTitle}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDraftTitle(next);
                        updateArtifact(active.id, { title: next });
                      }}
                      className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-[13px] font-medium text-ink focus:border-line-strong focus:bg-paper focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[13px] font-medium text-ink-muted" data-no-drag>
                  No artifact open
                </div>
              )}
              <div className="flex items-center gap-2" data-no-drag>
                {meta && (
                  <div className="hidden rounded-full border border-line bg-paper px-2 py-1 text-[10.5px] font-medium uppercase tracking-wider text-ink-muted sm:block">
                    {meta.label}
                  </div>
                )}
                <IconButton icon={<X />} label="Close artifact" size="sm" onClick={close} />
              </div>
            </div>

            {hasArtifact ? (
              <div className="flex-1 min-h-0 overflow-hidden p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-ink-faint">
                  <span>{meta?.note}</span>
                  <span className="font-mono uppercase tracking-wider">
                    Editable
                  </span>
                </div>
                <textarea
                  value={draftContent}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDraftContent(next);
                    updateArtifact(active.id, { content: next });
                  }}
                  spellCheck={active.kind === "doc"}
                  className="h-[calc(100%-1.75rem)] w-full resize-none rounded-2xl border border-line bg-paper px-4 py-4 text-[13px] leading-6 text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
                  style={{
                    fontFamily: active.kind === "doc" || active.kind === "preview" ? "var(--font-serif, Georgia, serif)" : "var(--font-mono, ui-monospace, monospace)",
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="max-w-[320px] rounded-2xl border border-dashed border-line bg-paper px-5 py-6 text-center">
                  <div className="text-[14px] font-medium text-ink">No artifact selected</div>
                  <p className="mt-2 text-[12.5px] leading-5 text-ink-muted">
                    Generate a doc, table, graph, or code snippet in chat and click the card to open it here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
