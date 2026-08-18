"use client"

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Paperclip, Send } from "lucide-react"

import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_FILES_PER_MESSAGE,
  ATTACHMENT_MAX_SIZE_BYTES,
} from "@workspace/types/attachment"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"

import { ChatAttachmentChip } from "@/components/chat/chat-attachment-chip"

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp"

function isAllowedMimeType(mimeType: string): boolean {
  return (ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

function ChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean
  onSend: (content: string, files: File[]) => void | Promise<void>
}) {
  const [content, setContent] = useState("")
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (incoming.length === 0) return

    setValidationError(null)

    const accepted: File[] = []
    for (const file of incoming) {
      if (!isAllowedMimeType(file.type)) {
        setValidationError(`"${file.name}" não é um tipo de arquivo permitido (apenas PDF ou imagem).`)
        continue
      }
      if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
        setValidationError(`"${file.name}" excede o limite de 10MB.`)
        continue
      }
      accepted.push(file)
    }

    setStagedFiles((current) => {
      const next = [...current, ...accepted]
      if (next.length > ATTACHMENT_MAX_FILES_PER_MESSAGE) {
        setValidationError(`Você pode anexar no máximo ${ATTACHMENT_MAX_FILES_PER_MESSAGE} arquivos por mensagem.`)
        return next.slice(0, ATTACHMENT_MAX_FILES_PER_MESSAGE)
      }
      return next
    })
  }

  function handleRemoveFile(index: number) {
    setStagedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
  }

  async function handleSubmit() {
    const trimmed = content.trim()
    if (disabled || (!trimmed && stagedFiles.length === 0)) return

    await onSend(trimmed, stagedFiles)
    setContent("")
    setStagedFiles([])
    setValidationError(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      {validationError ? (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      ) : null}

      {stagedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {stagedFiles.map((file, index) => (
            <ChatAttachmentChip
              key={`${file.name}-${index}`}
              fileName={file.name}
              mimeType={file.type}
              onRemove={() => handleRemoveFile(index)}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={handleFilesSelected}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Anexar arquivo"
        >
          <Paperclip />
        </Button>

        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua dúvida…"
          rows={1}
          className="min-h-9 flex-1 resize-none border-none bg-transparent px-1 py-1.5 shadow-none focus-visible:ring-0"
          disabled={disabled}
        />

        <Button
          type="button"
          size="icon"
          disabled={disabled || (!content.trim() && stagedFiles.length === 0)}
          onClick={() => void handleSubmit()}
          aria-label="Enviar mensagem"
        >
          <Send />
        </Button>
      </div>
    </div>
  )
}

export { ChatInput }
