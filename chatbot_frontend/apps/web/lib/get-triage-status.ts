import { cookies } from "next/headers"

import type { TriageStatusResponse } from "@workspace/types"

export async function getTriageStatus(): Promise<TriageStatusResponse> {
  const cookieStore = await cookies()

  const response = await fetch(`${process.env.API_INTERNAL_URL}/triage/status`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  })

  if (!response.ok) {
    return { completed: false, conversationId: null }
  }

  return (await response.json()) as TriageStatusResponse
}
