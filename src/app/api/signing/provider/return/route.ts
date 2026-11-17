import { NextResponse } from "next/server";

import { getDb } from "@/lib/db/connection";
import {
  ProviderSigningError,
  resumeProviderSigning,
} from "@/lib/provider-signing";
import { readCookie, verifiedMethodsFromCookies } from "@/lib/signer-checks";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import {
  getClientIpAddress,
  getRequestUserAgent,
} from "@/lib/security/request";

// The last signer's return also finishes the envelope: long-term validation
// asks certificate authorities, within 15 seconds, and the PDFs are stored.
export const maxDuration = 60;

function seeOther(location: string, request: Request) {
  return NextResponse.redirect(new URL(location, request.url), {
    headers: { "cache-control": "private, no-store" },
    status: 303,
  });
}

// A plain page, not a React one: the session is gone, so there is no
// branding to load. The calm look inline (page ground, one white card, the
// same small drawing the signing pages use for a link that has nowhere to
// go: a page with a clock on its corner, then one sentence), sized for a
// phone first, and dark when the device is.
const ENDED_PAGE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex"><title>Signing session ended</title><style>
:root{color-scheme:light dark;--page:#f3f2ee;--paper:#fff;--fg:#0d0b14;--secondary:#6b6976;--line:#e4e2dc;--well:#f3f2ee;--warn-soft:#fbefd9;--warn:#8a5a00;--shadow:0 0 0 1px rgb(13 11 20/.04),0 1px 2px rgb(13 11 20/.04),0 6px 20px -8px rgb(13 11 20/.08)}
@media (prefers-color-scheme:dark){:root{--page:#121117;--paper:#1c1b22;--fg:#f3f2ee;--secondary:#a7a5b1;--line:#34323c;--well:#121117;--warn-soft:#3a2d12;--warn:#f2c46b;--shadow:0 0 0 1px rgb(255 255 255/.06)}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100dvh;background:var(--page);color:var(--fg);font:400 15px/1.6 Geist,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center;padding:max(1.5rem,env(safe-area-inset-top)) 1rem max(1.5rem,env(safe-area-inset-bottom))}
main{width:100%;max-width:26rem;background:var(--paper);border-radius:20px;box-shadow:var(--shadow);padding:2rem 1.5rem 2rem;text-align:center;animation:enter .32s cubic-bezier(.23,1,.32,1) both}
.art{display:flex;justify-content:center;border-radius:12px;background:var(--well);padding:1.25rem 0 .75rem}
.art svg{width:11rem;height:auto;overflow:visible}
.pg{filter:drop-shadow(0 1px 1px rgb(13 11 20/.06)) drop-shadow(0 10px 18px rgb(13 11 20/.08))}
h1{margin:1.5rem 0 0;font-weight:600;font-size:1.25rem;line-height:1.4;letter-spacing:-.02em;text-wrap:balance}
p{margin:.5rem 0 0;color:var(--secondary);text-wrap:pretty}
@keyframes enter{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){main{animation:none}}
</style></head><body><main><div class="art" aria-hidden="true"><svg viewBox="0 0 240 168" fill="none"><ellipse cx="120" cy="156" rx="66" ry="7" fill="currentColor" opacity=".05"/><rect x="66" y="10" width="108" height="136" rx="8" fill="var(--paper)" class="pg"/><rect x="82" y="26" width="44" height="5" rx="2.5" fill="var(--fg)" opacity=".75"/><rect x="82" y="42" width="76" height="4" rx="2" fill="var(--line)"/><rect x="82" y="51" width="67" height="4" rx="2" fill="var(--line)"/><rect x="82" y="60" width="72" height="4" rx="2" fill="var(--line)"/><rect x="82" y="69" width="50" height="4" rx="2" fill="var(--line)"/><rect x="82" y="98" width="50" height="18" rx="4" fill="var(--line)"/><circle cx="166" cy="118" r="27" fill="var(--paper)"/><circle cx="166" cy="118" r="23" fill="var(--warn-soft)"/><g transform="translate(166 118) scale(1.15)" stroke="var(--warn)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle r="8.5"/><path d="M0 0V-5M0 0l3.5 2.5"/></g></svg></div><h1>This signing session has ended</h1><p>Nothing was signed. Open the signing link from your email again to sign.</p></main></body></html>`;

function endedPage() {
  return new NextResponse(ENDED_PAGE_HTML, {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "text/html; charset=utf-8",
    },
    status: 410,
  });
}

/**
 * Where a signing provider sends the signer back. The state names the
 * signing session, which holds everything else.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");

  if (!state || state.length > 128) {
    return endedPage();
  }

  const rateLimitResponse = await applyRateLimit({
    category: "signing_submit",
    key: buildRateLimitKey([
      "signing-provider-return",
      getClientIpAddress(request.headers) ?? "unknown",
    ]),
    limit: 30,
    request,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const cookieHeader = request.headers.get("cookie");

  try {
    const next = await resumeProviderSigning(state, url.searchParams, {
      database: getDb(),
      requestMeta: {
        ipAddress: getClientIpAddress(request.headers),
        userAgent: getRequestUserAgent(request.headers),
      },
      verifiedMethodsFor: (token) =>
        verifiedMethodsFromCookies(token, (name) =>
          readCookie(cookieHeader, name),
        ),
    });

    return seeOther(
      "redirectUrl" in next ? next.redirectUrl : next.redirectPath,
      request,
    );
  } catch (error) {
    if (error instanceof ProviderSigningError) {
      if (!error.token) {
        return endedPage();
      }

      return seeOther(
        `/sign/${encodeURIComponent(error.token)}?signatureProblem=${error.problem}`,
        request,
      );
    }

    logRouteError(error, {
      category: "signing_submit_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure when a signer came back from a provider.",
      path: url.pathname,
    });

    return endedPage();
  }
}
