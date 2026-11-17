"use client";

import { RotateCwIcon } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { StatusPanel } from "@/components/shared/status-panel";
import { Button } from "@/components/ui/button";

import { BackLink } from "./detail-header";

/**
 * The envelope could not be shown: either it is not this account's (or no
 * longer exists), or loading it failed. Retry refreshes the route in place.
 */
export function DetailUnavailable({ kind }: { kind: "error" | "not-found" }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      {kind === "not-found" ? (
        <StatusPanel
          action={{ href: "/dashboard", label: "Back to documents" }}
          description="We couldn't find this envelope, or you no longer have access to it."
          title="This envelope is unavailable"
          tone="error"
        />
      ) : (
        <StatusPanel
          description="Couldn't load this envelope. Check your connection, then try again."
          footer={
            <Button
              loading={retrying}
              onClick={() => startRetry(() => router.refresh())}
              variant="outline"
            >
              <RotateCwIcon aria-hidden="true" />
              Retry
            </Button>
          }
          title="Couldn't load this envelope"
          tone="error"
        />
      )}
    </div>
  );
}
