import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import type { ConversationResponse } from "@workspace/types"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"

import { ChatView } from "@/components/chat/chat-view"

interface GetConversationResult {
  conversation: ConversationResponse | null
  error: boolean
}

async function getConversation(id: string): Promise<GetConversationResult> {
  const cookieStore = await cookies()

  const response = await fetch(`${process.env.API_INTERNAL_URL}/conversations/${id}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  })

  if (response.status === 404) {
    return { conversation: null, error: false }
  }

  if (!response.ok) {
    return { conversation: null, error: true }
  }

  return { conversation: (await response.json()) as ConversationResponse, error: false }
}

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const { conversation, error } = await getConversation(conversationId)

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Não foi possível carregar a conversa agora. Tente recarregar a página em instantes.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!conversation) {
    notFound()
  }

  return (
    <ChatView
      conversationId={conversation.id}
      initialMessages={conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        attachments: message.attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        })),
      }))}
    />
  )
}
