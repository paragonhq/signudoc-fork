"use client";

import type {
  SigningPayload,
  SigningVerificationState,
} from "@/lib/schemas/signing";
import type { SigningRouteAhead } from "@/lib/signing-receipt";

import { SignerVerificationScreen } from "./signer-verification-screen";
import { SigningStateScreen } from "./signing-state-screen";
import {
  SigningLiveShell,
  type ProviderSignatureProblem,
} from "./signing-live-shell";
import type { SigningUnavailableState } from "./live/field-logic";

type SigningShellProps = {
  initialState?: SigningUnavailableState;
  record?: SigningPayload;
  /** Who signs next, for the done page. */
  routeAhead?: SigningRouteAhead | null;
  /** Set when the signer came back from a signing provider without signing. */
  signatureProblem?: ProviderSignatureProblem | null;
  token: string;
  verification?: SigningVerificationState;
};

export function SigningShell({
  initialState,
  record,
  routeAhead = null,
  signatureProblem,
  token,
  verification,
}: SigningShellProps) {
  if (record) {
    return (
      <SigningLiveShell
        record={record}
        routeAhead={routeAhead}
        signatureProblem={signatureProblem}
        token={token}
      />
    );
  }

  if (verification) {
    return (
      // A fresh screen for each check, so the next one starts empty.
      <SignerVerificationScreen
        key={verification.pending.join(",")}
        state={verification}
        token={token}
      />
    );
  }

  return <SigningStateScreen state={initialState ?? "error"} />;
}
