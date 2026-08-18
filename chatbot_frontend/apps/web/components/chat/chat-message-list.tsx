"use client"

import { useEffect, useRef } from "react"

import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { ChatEmptyState } from "@/components/chat/chat-empty-state"
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble"
import { ChatThinkingIndicator } from "@/components/chat/chat-thinking-indicator"
import type { ChatMessageData } from "@/components/chat/types"

function ChatMessageList({ messages, pending }: { messages: ChatMessageData[]; pending: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pending])

  if (messages.length === 0 && !pending) {
    return (
      <div className="flex flex-1 items-center justify-center px-8">
        <ChatEmptyState />
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 px-6 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        {pending ? <ChatThinkingIndicator /> : null}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

export { ChatMessageList }
