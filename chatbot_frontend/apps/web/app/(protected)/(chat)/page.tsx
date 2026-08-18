import { redirect } from "next/navigation"

import { getTriageStatus } from "@/lib/get-triage-status"

export default async function ChatIndexPage() {
  const status = await getTriageStatus()

  // The layout above already guarantees status.completed === true and a conversationId exists here.
  redirect(`/chat/${status.conversationId}`)
}
