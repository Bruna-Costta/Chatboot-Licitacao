import { FileText, Image as ImageIcon, X } from "lucide-react"

import { badgeVariants } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

interface ChatAttachmentChipProps {
  fileName: string
  mimeType: string
  href?: string
  onRemove?: () => void
}

function ChatAttachmentChip({ fileName, mimeType, href, onRemove }: ChatAttachmentChipProps) {
  const Icon = mimeType.startsWith("image/") ? ImageIcon : FileText
  const className = cn(badgeVariants({ variant: "secondary" }))

  const label = (
    <>
      <Icon />
      <span className="max-w-40 truncate">{fileName}</span>
    </>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    )
  }

  return (
    <span className={className}>
      {label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${fileName}`}
          className="ml-0.5 rounded-full hover:opacity-70"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )
}

export { ChatAttachmentChip }
