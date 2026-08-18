import { Skeleton } from "@workspace/ui/components/skeleton"

export default function ChatConversationLoading() {
  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-6">
        <Skeleton className="h-16 w-2/3 self-start rounded-3xl" />
        <Skeleton className="h-12 w-1/2 self-end rounded-3xl" />
        <Skeleton className="h-20 w-3/4 self-start rounded-3xl" />
      </div>
      <div className="border-t border-border bg-background px-6 py-4">
        <Skeleton className="mx-auto h-14 w-full max-w-3xl rounded-3xl" />
      </div>
    </div>
  )
}
