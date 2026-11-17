"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";

type LandingSessionActionProps = {
  className?: string;
  /** "inverse" is for a button that sits on the violet closing slab. */
  tone?: "default" | "inverse";
};

/** "Start free", or "Go to dashboard" for someone already signed in. */
export function LandingSessionPrimaryAction({
  className,
  tone = "default",
}: LandingSessionActionProps) {
  const { data: session } = authClient.useSession();
  const authenticated = !!session;

  return (
    <Button
      asChild
      className={cn("group/cta", className)}
      size="lg"
      variant={tone === "inverse" ? "inverse" : "default"}
    >
      <Link href={authenticated ? "/dashboard" : "/signup"} prefetch>
        {authenticated ? "Go to dashboard" : "Start free"}
        <ArrowRight
          aria-hidden="true"
          className="transition-transform duration-(--dur-hover) ease-(--ease-out) group-hover/cta:translate-x-0.5"
        />
      </Link>
    </Button>
  );
}

/** "Log in", only for visitors who are not signed in. */
export function LandingSessionLoginAction({
  className,
  tone = "default",
}: LandingSessionActionProps) {
  const { data: session } = authClient.useSession();

  if (session) {
    return null;
  }

  return (
    <Button
      asChild
      className={className}
      size="lg"
      variant={tone === "inverse" ? "inverse" : "outline"}
    >
      <Link href="/login" prefetch>
        Log in
      </Link>
    </Button>
  );
}
