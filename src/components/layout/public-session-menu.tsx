"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, LogOut } from "@/components/ui/icons";

import { Avatar } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";

type PublicSessionMenuProps = {
  align?: "center" | "end" | "start";
  buttonClassName?: string;
  children?: ReactNode;
  contentClassName?: string;
};

export function PublicSessionMenu({
  align = "end",
  buttonClassName,
  children = null,
  contentClassName,
}: PublicSessionMenuProps) {
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!session) {
    return <>{children}</>;
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    const result = await authClient.signOut();

    if (result.error) {
      setIsSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open account menu"
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-[box-shadow,scale] duration-(--dur-hover) ease-(--ease-out) hover:shadow-[0_0_0_4px_var(--hover)] focus-visible:shadow-(--focus-ring) active:scale-[0.96] data-[state=open]:shadow-[0_0_0_4px_var(--press)]",
            buttonClassName,
          )}
          type="button"
        >
          <Avatar name={session.user.name || session.user.email} size="md" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("w-60", contentClassName)}
      >
        <DropdownMenuLabel className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-(--fg)">
            {session.user.name}
          </p>
          <p className="mt-0.5 truncate text-[0.8125rem] font-normal text-(--secondary)">
            {session.user.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" prefetch>
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSigningOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
          variant="destructive"
        >
          <LogOut className="size-4" />
          {isSigningOut ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
