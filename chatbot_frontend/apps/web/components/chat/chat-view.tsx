"use client"

import { useState } from "react"

import type { SendMessageAiFailureResponse, SendMessageResponse } from "@workspace/types"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"

import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessageList } from "@/components/chat/chat-message-list"
import type { ChatAttachmentData, ChatMessageData } from "@/components/chat/types"
import { ApiError, apiPostForm } from "@/lib/api-client"

interface SentMessage {
  id: string
  role: string
  content: string
  attachments?: ChatAttachmentData[]
}

function toChatMessage(message: SentMessage): ChatMessageData {
  return {
    id: message.id,
    role: message.role as ChatMessageData["role"],
    content: message.content,
    attachments: message.attachments ?? [],
  }
}

function ChatView({
  conversationId,
  initialMessages,
}: {
  conversationId: string
  initialMessages: ChatMessageData[]
}) {
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSend(content: string, files: File[]) {
    setFormError(null)

    const tempId = `temp-${Date.now()}`
    const optimisticMessage: ChatMessageData = {
      id: tempId,
      role: "USER",
      content,
      attachments: files.map((file, index) => ({
        id: `${tempId}-${index}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })),
    }
    setMessages((current) => [...current, optimisticMessage])
    setPending(true)

    const formData = new FormData()
    formData.set("content", content)
    for (const file of files) {
      formData.append("files", file)
    }

    try {
      const result = await apiPostForm<SendMessageResponse>(`/conversations/${conversationId}/messages`, formData)
      setMessages((current) => [
        ...current.filter((message) => message.id !== tempId),
        toChatMessage(result.userMessage),
        toChatMessage(result.assistantMessage),
      ])
    } catch (error) {
      if (error instanceof ApiError && error.status === 502 && error.data) {
        const failure = error.data as SendMessageAiFailureResponse
        setMessages((current) => [
          ...current.filter((message) => message.id !== tempId),
          toChatMessage(failure.userMessage),
        ])
        setFormError("O assistente não respondeu desta vez, mas sua mensagem foi salva. Tente novamente.")
      } else {
        setMessages((current) => current.filter((message) => message.id !== tempId))
        setFormError(error instanceof ApiError ? error.message : "Não foi possível enviar a mensagem.")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <ChatMessageList messages={messages} pending={pending} />

      {formError ? (
        <Alert variant="destructive" className="mx-6 mb-4">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="border-t border-border bg-background px-6 py-4">
        <ChatInput disabled={pending} onSend={handleSend} />
      </div>
    </div>
  )
}

export { ChatView }
