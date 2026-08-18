import { cookies } from "next/headers"

import type { CurrentUser } from "@workspace/types"

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()

  const response = await fetch(`${process.env.API_INTERNAL_URL}/auth/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as CurrentUser
}
