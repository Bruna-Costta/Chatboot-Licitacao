"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { ClipboardList, Info, MessageSquare, Moon, Sun } from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

type AppSidebarProps = {
  userName: string
  userEmail: string
}

const NAV_ITEMS = [
  { href: "/", label: "Chat", icon: MessageSquare },
  // { href: "/triage", label: "Triagem", icon: ClipboardList },
  { href: "/sobre", label: "Sobre nós", icon: Info },
]

function AppSidebar({ userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span className="truncate px-2 py-1 text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          Licitação IA
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            // Compare only the first path segment (after the initial '/')
            const currentFirst = (pathname || "").split("/")[1] || ""
            const itemFirst = (item.href || "").split("/")[1] || ""
            const isActive = currentFirst === (itemFirst || "chat")
            const Icon = item.icon

            console.log(isActive)
            console.log(currentFirst)

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.label}
                  className={isActive ? "bg-amber-300" : ""}

                  render={<Link href={item.href} />}
                >
                  <Icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Popover>
              <PopoverTrigger render={<SidebarMenuButton size="lg" />}>
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src="/images/avatar.png"
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </span>
                <span className="flex flex-col overflow-hidden text-left">
                  <span className="truncate text-sm font-medium">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {userEmail}
                  </span>
                </span>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="w-64 gap-3">
                <PopoverHeader>
                  <PopoverTitle className="truncate">{userName}</PopoverTitle>
                  <PopoverDescription className="truncate">
                    {userEmail}
                  </PopoverDescription>
                </PopoverHeader>
                <Separator />
                <div className="flex flex-col gap-1">
                  <ThemeToggle />
                  <SignOutButton />
                </div>
              </PopoverContent>
            </Popover>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
    >
      {isDark ? (
        <Sun className="size-4" strokeWidth={1.75} />
      ) : (
        <Moon className="size-4" strokeWidth={1.75} />
      )}
      {isDark ? "Tema claro" : "Tema escuro"}
    </button>
  )
}

export { AppSidebar }
