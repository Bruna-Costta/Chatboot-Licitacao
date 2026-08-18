import { Skeleton } from "@workspace/ui/components/skeleton"

function ChatThinkingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1.5 self-start rounded-3xl bg-muted px-4 py-3">
      <Skeleton className="size-2 rounded-full" />
      <Skeleton className="size-2 rounded-full" />
      <Skeleton className="size-2 rounded-full" />
    </div>
  )
}

export { ChatThinkingIndicator }
