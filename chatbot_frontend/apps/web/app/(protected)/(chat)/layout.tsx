import { redirect } from "next/navigation"

import { getTriageStatus } from "@/lib/get-triage-status"

export default async function ChatGateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const status = await getTriageStatus()

  if (!status.completed) {
    redirect("/triage")
  }

  return children
}
