"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { BrandLogo } from "@/components/layout/brand";
import { StepHeading } from "@/components/setup/setup-parts";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { FormField } from "@/components/ui/field";
import { Check, ImageUp, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  DEFAULT_BRAND_COLOR,
  DEFAULT_BRAND_PALETTE,
  brandPaletteVariables,
  buildBrandPalette,
  normalizeBrandColor,
} from "@/lib/brand-color";
import { LOGO_CONTENT_TYPES, MAX_LOGO_BYTES } from "@/lib/branding";

/*
 * Optional: the organization's logo and colour, with a live picture of
 * what a signer will see. The logo is saved the moment it is chosen,
 * through the same route as Settings; the colour is saved when the person
 * continues.
 */

/** A few starting points. Any colour works; these just save a decision. */
const COLOR_PRESETS = [
  { label: "Violet (default)", value: "" },
  { label: "Blue", value: "#1a5fd6" },
  { label: "Teal", value: "#0f766e" },
  { label: "Green", value: "#2f7d32" },
  { label: "Orange", value: "#c2410c" },
  { label: "Carbon", value: "#26232e" },
] as const;

type LogoResponse = { error?: string; logoUrl?: string | null } | null;

const GENERIC_LOGO_ERROR = "The logo could not be saved. Please try again.";

export function SetupBrandingStep({
  brandColor,
  brandColorError,
  disabled,
  logoUrl,
  onBrandColorChange,
  onLogoChange,
  organizationName,
}: {
  brandColor: string;
  brandColorError?: string;
  disabled: boolean;
  logoUrl: string | null;
  onBrandColorChange: (value: string) => void;
  onLogoChange: (logoUrl: string | null) => void;
  organizationName: string;
}) {
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
  const busy = disabled || logoBusy !== null;

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
        setLogoError(payload?.error ?? GENERIC_LOGO_ERROR);
        return;
      }

      onLogoChange(payload.logoUrl);
    } catch {
      setLogoError(GENERIC_LOGO_ERROR);
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

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        description="Your logo and colour on signing pages and in emails. You can change them any time in Settings."
        title="Make it yours"
      />

      <SignerPreview
        logoUrl={logoUrl}
        organizationName={organizationName}
        style={brandPaletteVariables(palette) as CSSProperties}
      />

      <div
        aria-labelledby="setup-logo-label"
        className="flex flex-col gap-1.5"
        role="group"
      >
        <span
          className="text-sm leading-5 font-medium text-(--fg)"
          id="setup-logo-label"
        >
          Logo
        </span>
        <div
          className={cn(
            "flex items-center gap-3 rounded-(--radius-well) p-2.5 pl-3 transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-out)",
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
          <div className="flex h-10 min-w-0 flex-1 items-center gap-3">
            {logoUrl ? (
              <BrandLogo className="h-8 max-w-40 sm:max-w-44" src={logoUrl} />
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--paper) text-(--secondary) shadow-(--ring-soft)"
                >
                  <ImageUp className="size-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 text-[0.8125rem] leading-5 text-(--secondary)">
                  <span className="pointer-coarse:hidden">
                    Drop an image here.{" "}
                  </span>
                  PNG, JPEG or WebP, up to 512 KB.
                </span>
              </>
            )}
          </div>
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
              aria-label="Remove logo"
              disabled={busy && logoBusy !== "removing"}
              loading={logoBusy === "removing"}
              onClick={() => void sendLogo(null)}
              size="icon-sm"
              type="button"
              variant="destructive-ghost"
            >
              <Trash2 aria-hidden="true" />
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
            {logoUrl ? "Replace" : "Upload"}
          </Button>
        </div>
        {logoError ? (
          <p
            className="text-xs leading-5 font-medium text-(--danger)"
            role="alert"
          >
            {logoError}
          </p>
        ) : null}
      </div>

      <FormField
        disabled={disabled}
        error={brandColorError}
        hint={
          darkened
            ? "Too light for white text, so a darker shade of it is used."
            : "Used for buttons and links."
        }
        label="Brand color"
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
            className="w-32 tabular-nums"
            maxLength={16}
            name="setup-brand-color"
            onChange={(event) => onBrandColorChange(event.target.value)}
            placeholder={DEFAULT_BRAND_COLOR}
            spellCheck={false}
            value={brandColor}
          />
        </div>
      </FormField>
      <div
        aria-label="Suggested colors"
        className="-mt-3 flex flex-wrap gap-2"
        role="group"
      >
        {COLOR_PRESETS.map((preset) => {
          const swatch = preset.value || DEFAULT_BRAND_COLOR;
          const selected =
            (normalizeBrandColor(brandColor) ?? "") === preset.value ||
            (preset.value === "" && brandColor.trim() === "");

          return (
            <button
              aria-label={preset.label}
              aria-pressed={selected}
              className="tactile relative inline-flex size-8 items-center justify-center rounded-full text-(--on-accent) shadow-[inset_0_0_0_1px_rgb(var(--fg-rgb)/0.12)] outline-none [--press-scale:0.9] focus-visible:shadow-(--focus-ring) disabled:opacity-45 pointer-coarse:size-10"
              disabled={disabled}
              key={preset.label}
              onClick={() => onBrandColorChange(preset.value)}
              style={{ backgroundColor: swatch }}
              type="button"
            >
              <Check
                aria-hidden="true"
                className={cn(
                  "size-4 transition-[opacity,scale] duration-(--spring-pop-dur) ease-(--spring-pop)",
                  selected ? "scale-100 opacity-100" : "scale-50 opacity-0",
                )}
                strokeWidth={2.25}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A small live picture: the top of the page a signer sees, with the main
 * button in the colour as it is chosen. Decorative; the controls under it
 * are the real thing.
 */
function SignerPreview({
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
      className="flex flex-col gap-2 rounded-(--radius-well) bg-(--surface) p-2.5"
      style={style}
    >
      <div className="flex flex-col overflow-hidden rounded-[0.875rem] bg-(--paper) shadow-[var(--ring-faint),0_1px_2px_rgb(var(--fg-rgb)/0.06)]">
        <div className="flex h-11 items-center gap-2 border-b border-(--divider) px-3.5">
          {logoUrl ? (
            <BrandLogo className="h-6 max-w-32 sm:max-w-32" src={logoUrl} />
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
        <div className="flex items-end gap-4 px-3.5 pt-3 pb-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="truncate text-[0.8125rem] leading-5 text-(--fg)">
              <span className="font-medium">{name}</span> sent you a document
            </p>
            <span className="h-1.5 w-11/12 rounded-full bg-(--surface-strong)" />
            <span className="h-1.5 w-3/5 rounded-full bg-(--surface-strong)" />
          </div>
          <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-(--accent) px-3.5 text-xs font-medium text-(--on-accent) transition-[background-color] duration-(--dur-move) ease-(--ease-out)">
            Review and sign
          </span>
        </div>
      </div>
      <p className="px-1 text-xs leading-4 text-(--secondary)">
        What signers see
      </p>
    </div>
  );
}
