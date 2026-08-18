import { cn } from "@workspace/ui/lib/utils"

import { ChatAttachmentChip } from "@/components/chat/chat-attachment-chip"
import type { ChatMessageData } from "@/components/chat/types"

function ChatMessageBubble({ message }: { message: ChatMessageData }) {
  if (message.role === "SYSTEM") return null

  const isUser = message.role === "USER"

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-3xl px-4 py-3 text-sm whitespace-pre-wrap",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        {message.content}
      </div>

      {message.attachments.length > 0 ? (
        <div className={cn("flex flex-wrap gap-2", isUser ? "justify-end" : "justify-start")}>
          {message.attachments.map((attachment) => (
            <ChatAttachmentChip
              key={attachment.id}
              fileName={attachment.fileName}
              mimeType={attachment.mimeType}
              href={`${process.env.NEXT_PUBLIC_API_URL}/attachments/${attachment.id}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export { ChatMessageBubble }
