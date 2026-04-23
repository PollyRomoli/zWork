import { useEffect, useRef, useState, useCallback } from "react";
import { Share2, Archive, Pencil, Check, X, AlertCircle, PanelRight, PanelRightClose, Copy, Settings as SettingsIcon, RefreshCcw } from "lucide-react";
import { useApp } from "../lib/store";
import { ChatInput } from "./ChatInput";
import { Message, ThinkingRow } from "./Message";
import { IconButton } from "./IconButton";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

function CodePanel({
  code,
  lang,
  onClose,
}: {
  code: string;
  lang: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex h-full flex-col border-l border-line bg-paper">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-[12px] font-mono text-ink-muted">{lang || "code"}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copy}
            className="press flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-ink-muted hover:bg-paper-sunken hover:text-ink"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <IconButton icon={<PanelRightClose />} label="Close panel" size="sm" onClick={onClose} />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={lang || "text"}
          style={oneLight as Record<string, React.CSSProperties>}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "12.5px",
            background: "transparent",
            height: "100%",
            padding: "16px",
          }}
          codeTagProps={{ style: { fontFamily: "var(--font-mono, monospace)" } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function ChatView() {
  const chat = useApp((s) =>
    s.activeChatId ? s.chats[s.activeChatId] : undefined,
  );
  const rename = useApp((s) => s.renameChat);
  const send = useApp((s) => s.send);
  const retry = useApp((s) => s.retry);
  const setView = useApp((s) => s.setView);
  const endRef = useRef<HTMLDivElement>(null);

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [panel, setPanel] = useState<{ code: string; lang: string } | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.messages.length, chat?.working, chat?.status]);

  const handleOpenPanel = useCallback((code: string, lang: string) => {
    setPanel({ code, lang });
  }, []);

  const handleAskSubmit = useCallback(
    (_msgId: string, choice: string) => {
      void send(choice);
    },
    [send],
  );

  if (!chat) return null;

  const lastIsUser =
    chat.messages.length > 0 &&
    chat.messages[chat.messages.length - 1].role === "user";
  const lastAssistantStreaming =
    chat.messages.length > 0 &&
    chat.messages[chat.messages.length - 1].role === "assistant" &&
    chat.messages[chat.messages.length - 1].content.length === 0;
  const showThinking =
    !!chat.working && (lastIsUser || lastAssistantStreaming);

  const commitRename = () => {
    const t = titleDraft.trim();
    setEditing(false);
    if (t && t !== chat.title && !chat.id.startsWith("tmp_")) {
      void rename(chat.id, t);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 bg-paper">
      {/* Main chat column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="titlebar-drag flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <div className="min-w-0 flex items-center gap-2" data-no-drag>
            {editing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  className="w-[280px] rounded-md border border-line-strong bg-paper px-2 py-1 text-[13px] text-ink focus:outline-none"
                />
                <IconButton icon={<Check />} label="Save" size="sm" onClick={commitRename} />
                <IconButton icon={<X />} label="Cancel" size="sm" onClick={() => setEditing(false)} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(chat.title);
                  setEditing(true);
                }}
                className="press group flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-paper-sunken"
                title="Rename chat"
              >
                <span className="truncate text-[13px] font-medium text-ink">
                  {chat.title}
                </span>
                <Pencil className="h-3 w-3 opacity-0 text-ink-faint transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1" data-no-drag>
            <span className="text-[10.5px] text-ink-faint font-mono">
              {chat.messages.length} msgs
            </span>
            {panel ? (
              <IconButton
                icon={<PanelRightClose />}
                label="Close panel"
                size="md"
                onClick={() => setPanel(null)}
              />
            ) : (
              <IconButton
                icon={<PanelRight />}
                label="Code panel"
                size="md"
                onClick={() => {}}
              />
            )}
            <IconButton icon={<Archive />} label="Archive" size="md" />
            <IconButton icon={<Share2 />} label="Share" size="md" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[960px] flex-col gap-5 px-6 py-8">
            {chat.messages.map((m, idx) => {
              const isLast = idx === chat.messages.length - 1;
              const isStreaming = !!chat.working && isLast;
              const activities = isStreaming && m.role === "assistant"
                ? chat.activities
                : m.activities;
              return (
                <Message
                  key={m.id}
                  message={m}
                  onAskSubmit={handleAskSubmit}
                  onOpenPanel={handleOpenPanel}
                  streaming={isStreaming}
                  activities={activities}
                />
              );
            })}
            {showThinking && chat.activities.length === 0 && <ThinkingRow status={chat.status || "Thinking"} />}
            {chat.error && (
              <div className="flex animate-fade-in items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">{chat.error}</span>
              </div>
            )}
            {chat.needsSetup && !chat.working && (
              <div className="flex animate-fade-in items-center gap-2 rounded-lg border border-line bg-paper-raised px-3 py-2">
                <button
                  type="button"
                  onClick={() => setView("settings")}
                  className="press inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12.5px] font-medium text-ink hover:bg-paper-sunken"
                >
                  <SettingsIcon className="h-3.5 w-3.5" /> Open Settings
                </button>
                <button
                  type="button"
                  onClick={() => void retry()}
                  className="press inline-flex items-center gap-1.5 rounded-md bg-ink px-2.5 py-1 text-[12.5px] font-medium text-paper hover:bg-ink-soft"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Composer — no top border, just padding */}
        <div className="shrink-0 bg-paper px-6 pb-5 pt-3">
          <div className="mx-auto max-w-[960px]">
            <ChatInput autoFocus placeholder="Reply to zWork" />
            <p className="mt-2 text-center text-[11px] text-ink-faint">
              zWork can take actions on your computer. Review before approving.
            </p>
          </div>
        </div>
      </div>

      {/* Right code panel */}
      {panel && (
        <div className="h-full w-[480px] shrink-0">
          <CodePanel
            code={panel.code}
            lang={panel.lang}
            onClose={() => setPanel(null)}
          />
        </div>
      )}
    </div>
  );
}
