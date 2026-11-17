import { cookies, headers } from "next/headers";

import { SigningShell } from "@/components/signing/signing-shell";
import { getDb } from "@/lib/db/connection";
import {
  getClientIpAddress,
  getRequestUserAgent,
} from "@/lib/security/request";
import type { SigningVerificationState } from "@/lib/schemas/signing";
import { verifiedMethodsFromCookies } from "@/lib/signer-checks";
import {
  getSigningRouteAhead,
  type SigningRouteAhead,
} from "@/lib/signing-receipt";
import {
  SigningAccessError,
  SigningVerificationRequiredError,
  getSigningPayloadForToken,
} from "@/lib/signing";

type SignPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{ signatureProblem?: string | string[] }>;
};

const SIGNATURE_PROBLEMS = ["cancelled", "expired", "failed", "name"] as const;

export default async function SignPage({
  params,
  searchParams,
}: SignPageProps) {
  const { token } = await params;
  const { signatureProblem: problemParam } = await searchParams;
  const signatureProblem =
    SIGNATURE_PROBLEMS.find((problem) => problem === problemParam) ?? null;
  let initialState:
    "already-signed" | "declined" | "error" | "expired" | "voided" | undefined;
  let record: Awaited<ReturnType<typeof getSigningPayloadForToken>> | null =
    null;
  let verification: SigningVerificationState | null = null;
  let routeAhead: SigningRouteAhead | null = null;

  try {
    const requestHeaders = await headers();
    const cookieStore = await cookies();

    record = await getSigningPayloadForToken(token, {
      database: getDb(),
      requestMeta: {
        ipAddress: getClientIpAddress(requestHeaders),
        userAgent: getRequestUserAgent(requestHeaders),
      },
      verifiedMethods: verifiedMethodsFromCookies(
        token,
        (name) => cookieStore.get(name)?.value,
      ),
    });
    // Who signs next, for the done page: read now, while the link works.
    routeAhead = await getSigningRouteAhead(token, { database: getDb() }).catch(
      () => null,
    );
  } catch (error) {
    if (error instanceof SigningVerificationRequiredError) {
      verification = error.details;
    } else if (error instanceof SigningAccessError) {
      initialState = error.state;
    } else {
      initialState = "error";
    }
  }

  return (
    <SigningShell
      initialState={initialState}
      key={token}
      record={record ?? undefined}
      routeAhead={routeAhead}
      signatureProblem={signatureProblem}
      token={token}
      verification={verification ?? undefined}
    />
  );
}
