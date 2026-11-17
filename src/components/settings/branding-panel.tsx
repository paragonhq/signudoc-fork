"use client";

import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { ImageUp, RotateCcw, Trash2 } from "@/components/ui/icons";

import { BrandLogo } from "@/components/layout/brand";
import {
  GENERIC_ERROR_MESSAGE,
  SettingRow,
  SettingRows,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import {
  DEFAULT_BRAND_COLOR,
  DEFAULT_BRAND_PALETTE,
  brandPaletteVariables,
  buildBrandPalette,
  normalizeBrandColor,
} from "@/lib/brand-color";
import { LOGO_CONTENT_TYPES, MAX_LOGO_BYTES } from "@/lib/branding";

// The install's own logo and color, in the Organization group of Settings.
//
// The logo is saved as soon as it is chosen. The color is part of the form
// around this panel and is saved with it. A small live preview beside the
// controls shows the top of a signer's page in the colour as it is typed.

type BrandingPanelProps = {
  brandColor: string;
  brandColorError?: string;
  disabled: boolean;
  logoUrl: string | null;
  onBrandColorChange: (value: string) => void;
  onLogoChange: (logoUrl: string | null) => void;
  /** Shown in the preview header when there is no logo. */
  organizationName?: string;
};

type LogoResponse = { error?: string; logoUrl?: string | null } | null;

export function BrandingPanel({
  brandColor,
  brandColorError,
  disabled,
  logoUrl,
  onBrandColorChange,
  onLogoChange,
  organizationName = "",
}: BrandingPanelProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState<"removing" | "uploading" | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  const typedColor = normalizeBrandColor(brandColor);
  const palette =
    (typedColor ? buildBrandPalette(typedColor) : null) ??
    DEFAULT_BRAND_PALETTE;
  const darkened = typedColor !== null && palette.accent !== typedColor;
  const usingDefault = brandColor.trim() === "";

  async function sendLogo(file: File | null) {
    setLogoError(null);
    setLogoBusy(file ? "uploading" : "removing");

    try {
      const response = await fetch("/api/admin/logo", {
        body: file,
        headers: file ? { "content-type": "application/octet-stream" } : {},
        method: file ? "PUT" : "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as LogoResponse;

      if (!response.ok || !payload || payload.logoUrl === undefined) {
        setLogoError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      onLogoChange(payload.logoUrl);
      toast.success(file ? "Logo saved" : "Logo removed", {
        description: file
          ? "It shows in the header, on signing pages and in emails."
          : "The header shows your organization's name instead.",
      });
      // The header above this page shows the logo too.
      router.refresh();
    } catch {
      setLogoError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLogoBusy(null);
    }
  }

  function acceptFile(file: File | null | undefined) {
    if (!file) {
      return;
    }

    if (!(LOGO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setLogoError("The logo must be a PNG, JPEG or WebP image.");
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("The logo must be 512 KB or smaller.");
      return;
    }

    void sendLogo(file);
  }

  function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    // So choosing the same file again, after an error, is still a change.
    event.target.value = "";
    acceptFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    if (!busy) {
      acceptFile(event.dataTransfer.files?.[0]);
    }
  }

  const busy = disabled || logoBusy !== null;

  return (
    <SettingsSection
      description="Your logo and colour on this site, on signing pages and in emails. Optional."
      id="branding"
      title="Branding"
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <SettingRows>
          <SettingRow
            description="PNG, JPEG or WebP up to 512 KB. Wide, on a transparent background, works best. Saved as soon as you choose it."
            error={logoError}
            kind="group"
            label="Logo"
            layout="stack"
          >
            <div
              className={cn(
                "flex flex-col gap-3 rounded-(--radius-well) p-3 transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out) sm:flex-row sm:items-center",
                dragging
                  ? "bg-(--accent-softer) shadow-[inset_0_0_0_1.5px_var(--accent)]"
                  : "bg-(--surface)",
              )}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDrop={handleDrop}
            >
              <div className="flex h-11 min-w-0 flex-1 items-center gap-3 px-1">
                {logoUrl ? (
                  <BrandLogo src={logoUrl} />
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--paper) text-(--secondary) shadow-(--ring-soft)"
                    >
                      <ImageUp className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="text-[0.8125rem] leading-5 text-(--secondary)">
                      No logo yet. Drop an image here.
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-sm:*:flex-1">
                <input
                  accept={LOGO_CONTENT_TYPES.join(",")}
                  aria-label="Logo image"
                  className="hidden"
                  disabled={busy}
                  onChange={handleFileChosen}
                  ref={fileInput}
                  tabIndex={-1}
                  type="file"
                />
                {logoUrl ? (
                  <Button
                    disabled={busy && logoBusy !== "removing"}
                    loading={logoBusy === "removing"}
                    onClick={() => void sendLogo(null)}
                    size="sm"
                    type="button"
                    variant="destructive-ghost"
                  >
                    <Trash2 aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
                <Button
                  disabled={busy && logoBusy !== "uploading"}
                  loading={logoBusy === "uploading"}
                  onClick={() => fileInput.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ImageUp aria-hidden="true" />
                  {logoUrl ? "Replace logo" : "Upload a logo"}
                </Button>
              </div>
            </div>
          </SettingRow>

          <SettingRow
            description={
              darkened
                ? "Too light for white text, so a darker shade of it is used."
                : "Used for buttons and links, such as #1a73e8. Leave empty for the default."
            }
            disabled={disabled}
            error={brandColorError}
            id="brand-color"
            label="Brand color"
            layout="stack"
          >
            <div className="flex flex-wrap items-center gap-2">
              <ColorPicker
                aria-label="Open color picker"
                disabled={disabled}
                displayColor={palette.accent}
                fallback={DEFAULT_BRAND_COLOR}
                onChange={onBrandColorChange}
                value={typedColor ?? ""}
              />
              <Input
                autoCapitalize="none"
                autoComplete="off"
                className="w-36 tabular-nums"
                maxLength={16}
                name="brand-color"
                onChange={(event) => onBrandColorChange(event.target.value)}
                placeholder={DEFAULT_BRAND_COLOR}
                spellCheck={false}
                value={brandColor}
              />
              {!usingDefault ? (
                <Button
                  disabled={disabled}
                  onClick={() => onBrandColorChange("")}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <RotateCcw aria-hidden="true" />
                  Use the default
                </Button>
              ) : null}
            </div>
          </SettingRow>
        </SettingRows>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5 md:py-5 md:pl-0">
          <BrandPreview
            logoUrl={logoUrl}
            organizationName={organizationName}
            style={brandPaletteVariables(palette) as CSSProperties}
          />
        </div>
      </div>
    </SettingsSection>
  );
}

/**
 * A small live preview: the top of the page a signer sees, with the main
 * button and a link in the colour as it is typed. Decorative: the
 * settings beside it are the real controls.
 */
function BrandPreview({
  logoUrl,
  organizationName,
  style,
}: {
  logoUrl: string | null;
  organizationName: string;
  style: CSSProperties;
}) {
  const name = organizationName.trim() || "Your organization";

  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col gap-3 rounded-(--radius-well) bg-(--surface) p-3"
      style={style}
    >
      <p className="px-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)">
        What signers see
      </p>
      <div className="flex flex-1 flex-col overflow-hidden rounded-[1rem] bg-(--paper) shadow-(--shadow-card)">
        <div className="flex h-12 items-center gap-2 px-3.5">
          {logoUrl ? (
            <BrandLogo className="h-5 max-w-28 sm:max-w-28" src={logoUrl} />
          ) : (
            <>
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[0.4375rem] bg-(--accent) text-[0.6875rem] font-semibold text-(--on-accent) transition-[background-color] duration-(--dur-move) ease-(--ease-out)">
                {name.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-[0.8125rem] font-semibold tracking-[-0.01em] text-(--fg)">
                {name}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3.5 px-3.5 pt-1 pb-4">
          <p className="text-[0.8125rem] leading-5 text-(--fg)">
            <span className="font-medium">{name}</span> sent you a document to
            sign.
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="h-1.5 w-11/12 rounded-full bg-(--surface-strong)" />
            <span className="h-1.5 w-4/5 rounded-full bg-(--surface-strong)" />
            <span className="h-1.5 w-3/5 rounded-full bg-(--surface-strong)" />
          </div>
          <span className="mt-auto inline-flex h-9 items-center justify-center rounded-full bg-(--accent) px-4 text-[0.8125rem] font-medium text-(--on-accent) transition-[background-color] duration-(--dur-move) ease-(--ease-out)">
            Review and sign
          </span>
          <span className="self-center text-xs font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.35)] underline-offset-4">
            Download a copy
          </span>
        </div>
      </div>
    </div>
  );
}
