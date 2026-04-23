import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Globe, Paperclip, Square } from "lucide-react";
import { cn } from "../lib/cn";
import { useApp } from "../lib/store";
import { IconButton } from "./IconButton";
import { ModelPicker } from "./ModelPicker";

interface Props {
  placeholder?: string;
  autoFocus?: boolean;
  onSend?: (text: string) => void;
}

export function ChatInput({ placeholder = "Send a message", autoFocus, onSend }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const send = useApp((s) => s.send);
  const stop = useApp((s) => s.stop);
  const webSearch = useApp((s) => s.webSearch);
  const toggleWeb = useApp((s) => s.toggleWeb);
  const working = useApp((s) => {
    const id = s.activeChatId;
    return id ? (s.chats[id]?.working ?? false) : false;
  });

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  useEffect(() => {
    if (autoFocus) areaRef.current?.focus();
  }, [autoFocus]);

  const canSend = value.trim().length > 0 && !working;

  const submit = () => {
    if (!canSend) return;
    const text = value;
    setValue("");
    onSend?.(text);
    void send(text);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={cn(
        "group relative w-full rounded-xxl border border-line bg-paper-raised transition-[border-color,box-shadow]",
        focused ? "border-line-strong shadow-pop" : "shadow-chat",
      )}
    >
      <textarea
        ref={areaRef}
        rows={1}
        value={value}
        placeholder={placeholder}
        disabled={working}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "block w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[14.5px] leading-6 text-ink placeholder:text-ink-faint",
          "focus:outline-none",
        )}
      />
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
        <div className="flex items-center gap-1">
          <IconButton
            icon={<Paperclip />}
            label="Attach file"
            tooltipSide="top"
            variant="ghost"
            size="md"
            onClick={() => {}}
          />
          <IconButton
            icon={<Globe />}
            label={webSearch ? "Web search: on" : "Web search"}
            tooltipSide="top"
            variant="ghost"
            size="md"
            active={webSearch}
            onClick={toggleWeb}
            className={cn(
              webSearch && "bg-ink text-paper hover:bg-ink-soft hover:text-paper",
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <ModelPicker />
          <button
            type="button"
            aria-label={working ? "Stop" : "Send"}
            disabled={!working && !canSend}
            onClick={working ? stop : submit}
            className={cn(
              "press ring-focus inline-flex h-8 w-8 items-center justify-center rounded-full",
              "transition-colors",
              working
                ? "bg-red-500/90 text-white hover:bg-red-600"
                : canSend
                  ? "bg-ink text-paper hover:bg-ink-soft"
                  : "bg-line text-ink-faint cursor-not-allowed",
            )}
          >
            {working ? (
              <Square className="h-3 w-3 fill-white" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
