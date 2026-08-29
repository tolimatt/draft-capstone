import { useEffect, useRef } from "react";
import {
  REALTIME_CHAT_INPUT_MAX_LENGTH,
  REALTIME_CHAT_WORD_LIMIT,
  countRealtimeChatWords,
  sanitizeRealtimeChatInput,
} from "../utils/realtimeChatInput";

const MAX_TEXTAREA_HEIGHT = 112;

export default function ChatMessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Write a message...",
  containerClassName = "",
  textareaClassName = "",
}) {
  const textareaRef = useRef(null);
  const wordCount = countRealtimeChatWords(value);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  return (
    <div className={`rp-chat-textarea-shell ${containerClassName}`}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(event) => onChange(sanitizeRealtimeChatInput(event.target.value))}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          onSend();
        }}
        placeholder={placeholder}
        aria-label="Message"
        maxLength={REALTIME_CHAT_INPUT_MAX_LENGTH}
        disabled={disabled}
        className={`rp-chat-textarea ${textareaClassName}`}
      />
      <span className="rp-chat-word-counter" aria-live="polite">
        {wordCount}/{REALTIME_CHAT_WORD_LIMIT} words
      </span>
    </div>
  );
}
