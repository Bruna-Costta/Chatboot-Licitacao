"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    })
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
    >
      <LogOut className="size-4" strokeWidth={1.75} />
      Sair
    </button>
  )
}

export { SignOutButton }
