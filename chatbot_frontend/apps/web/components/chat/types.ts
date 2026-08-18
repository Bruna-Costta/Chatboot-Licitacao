export interface ChatAttachmentData {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export interface ChatMessageData {
  id: string
  role: "USER" | "ASSISTANT" | "SYSTEM"
  content: string
  attachments: ChatAttachmentData[]
}
