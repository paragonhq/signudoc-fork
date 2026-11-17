"use client";

import { LogOut, Settings as SettingsIcon } from "@/components/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export type ShellUser = {
  email: string;
  name: string;
};

export function getShellInitials(name: string) {
  const segments = name
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (segments.length === 0) {
    return "SU";
  }

  return segments.map((segment) => segment[0]?.toUpperCase() ?? "").join("");
}

/**
 * The account: a round avatar with your initials that opens your name and
 * email, Settings and Sign out. The same object on desktop and phone.
 */
export function AccountMenu({
  className,
  user,
}: {
  className?: string;
  user: ShellUser;
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    const result = await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/login");
        },
      },
    });

    if (result.error) {
      setIsSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Account menu for ${user.name}`}
          className={cn(
            "group/avatar tactile inline-flex size-10 shrink-0 items-center justify-center rounded-full outline-none [--press-scale:0.94]",
            "focus-visible:shadow-(--focus-ring)",
            className,
          )}
          type="button"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-(--accent-soft) text-xs font-semibold text-(--accent-ink) shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.1),var(--surface-highlight-dim),0_0_0_2px_var(--page),0_0_0_2px_rgb(var(--accent-rgb)/0)] transition-[box-shadow] duration-(--spring-pop-dur) ease-(--spring-pop) group-hover/avatar:shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.1),var(--surface-highlight-dim),0_0_0_2px_var(--page),0_0_0_4px_rgb(var(--accent-rgb)/0.18)] group-data-[state=open]/avatar:shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.1),var(--surface-highlight-dim),0_0_0_2px_var(--page),0_0_0_4px_rgb(var(--accent-rgb)/0.24)]"
          >
            {getShellInitials(user.name)}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
        <DropdownMenuLabel className="flex items-center gap-3 px-2.5 py-2">
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) text-xs font-semibold text-(--accent-ink) shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.1),var(--surface-highlight-dim)]"
          >
            {getShellInitials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-(--fg)">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate text-xs font-normal text-(--secondary)">
              {user.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isSigningOut}
          onSelect={(event: Event) => {
            event.preventDefault();
            void handleSignOut();
          }}
          variant="destructive"
        >
          <LogOut aria-hidden="true" />
          {isSigningOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
