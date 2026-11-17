import {
  CalendarDaysIcon,
  CaseSensitiveIcon,
  CircleDotIcon,
  HashIcon,
  SignatureIcon,
  SquareCheckIcon,
  SquareChevronDownIcon,
  TypeIcon,
  UserRoundIcon,
  type IconComponent,
  type IconProps,
} from "@/components/ui/icons";

import { cn } from "@/lib/cn";

import { type PrepareFieldType } from "./model";

/*
 * The builder's field-type icons: plain Hugeicons marks at the kit's 1.75
 * stroke. They take `className` and `strokeWidth`
 * like any icon in the kit.
 */

export type FieldGlyphProps = IconProps;

export type FieldGlyph = IconComponent;

export const fieldToolIcons: Record<PrepareFieldType, FieldGlyph> = {
  checkbox: SquareCheckIcon,
  date: CalendarDaysIcon,
  dropdown: SquareChevronDownIcon,
  initials: CaseSensitiveIcon,
  name: UserRoundIcon,
  number: HashIcon,
  radio: CircleDotIcon,
  signature: SignatureIcon,
  text: TypeIcon,
};

/**
 * The sign-here mark along the foot of a signature or initials field: one
 * soft Tab-yellow line (yellow is reserved for "sign here").
 */
export function SignLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-[8%] bottom-[16%] h-[max(2px,0.16em)] rounded-full bg-(--sign-here)",
        className,
      )}
    />
  );
}
