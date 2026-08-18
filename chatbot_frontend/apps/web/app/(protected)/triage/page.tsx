import { redirect } from "next/navigation"

import { TriageWizard } from "@/components/triage/triage-wizard"
import { getTriageStatus } from "@/lib/get-triage-status"

export default async function TriagePage() {
  const status = await getTriageStatus()

  if (status.completed && status.conversationId) {
    redirect(`/chat/${status.conversationId}`)
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-8">
      <TriageWizard />
    </div>
  )
}
