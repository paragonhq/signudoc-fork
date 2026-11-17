"use client";

import { useId, useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/cn";
import {
  FieldControlContext,
  type FieldControlContextValue,
} from "@/components/ui/field-context";
import { Label } from "@/components/ui/label";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { Separator } from "@/components/ui/separator";

/*
 * Fields. Most screens want FormField: a label, the control, a hint and an
 * error that slides open, with ids and aria-describedby wired for you.
 *
 *   <FormField label="Email" hint="We send the signing link here." error={errors.email}>
 *     <Input name="email" type="email" autoComplete="email" />
 *   </FormField>
 *
 * ChoiceField puts a Checkbox or Switch beside its label and description.
 * The lower-level parts (Field, FieldLabel, FieldDescription, FieldError…)
 * stay for screens that compose by hand.
 */

const ERROR_ENTER = { duration: DUR.move, ease: EASE.out } as const;
const ERROR_EXIT = {
  duration: exitDuration(DUR.move),
  ease: EASE.exit,
} as const;

/** An error line that opens with height and opacity, and closes faster. */
function AnimatedMessage({
  children,
  className,
  id,
}: {
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.div
          animate={{ height: "auto", opacity: 1, transition: ERROR_ENTER }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0, transition: ERROR_EXIT }}
          initial={{ height: 0, opacity: 0 }}
          key="message"
        >
          <div
            className={cn(
              "flex items-start gap-1.5 pt-1.5 text-xs leading-5 font-medium text-(--danger)",
              className,
            )}
            data-slot="field-error"
            id={id}
            role="alert"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-[0.1875rem] size-3.5 shrink-0"
            />
            <div className="min-w-0">{children}</div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type FormFieldProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** The error message. Set it after blur or submit, not on every keystroke. */
  error?: React.ReactNode;
  /** One line under the control. Hidden while an error shows. */
  hint?: React.ReactNode;
  /** Use your own id for the control; one is generated otherwise. */
  id?: string;
  label: React.ReactNode;
  /** Something on the label's line, right-aligned: "Optional", a link. */
  labelAside?: React.ReactNode;
  required?: boolean;
};

function FormField({
  children,
  className,
  disabled,
  error,
  hint,
  id,
  label,
  labelAside,
  required,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const invalid = Boolean(error);
  const showHint = Boolean(hint) && !invalid;
  const context = useMemo<FieldControlContextValue>(
    () => ({
      describedBy:
        [showHint ? hintId : null, invalid ? errorId : null]
          .filter(Boolean)
          .join(" ") || undefined,
      disabled,
      id: controlId,
      invalid,
      required,
    }),
    [controlId, disabled, errorId, hintId, invalid, required, showHint],
  );

  return (
    <div
      className={cn("group/field flex min-w-0 flex-col", className)}
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      data-slot="form-field"
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        {/* The label nudges up a pixel and a half while its field has focus. */}
        <Label
          className="transition-[translate,color] duration-(--spring-settle-dur) ease-(--spring-settle) group-focus-within/field:-translate-y-[1.5px] motion-reduce:group-focus-within/field:translate-y-0"
          htmlFor={controlId}
        >
          {label}
        </Label>
        {labelAside ? (
          <span className="text-xs text-(--secondary)">{labelAside}</span>
        ) : null}
      </div>
      <FieldControlContext value={context}>{children}</FieldControlContext>
      {showHint ? (
        <p
          className="pt-1.5 text-xs leading-5 text-(--secondary)"
          data-slot="field-hint"
          id={hintId}
        >
          {hint}
        </p>
      ) : null}
      <AnimatedMessage id={errorId}>{error}</AnimatedMessage>
    </div>
  );
}

/**
 * A Checkbox or Switch with its label (and optional description) beside it.
 * The whole label is the target. Put the switch after the text with
 * `controlPosition="end"` for settings rows.
 */
function ChoiceField({
  className,
  control,
  controlPosition = "start",
  description,
  disabled,
  error,
  id,
  label,
}: {
  className?: string;
  control: React.ReactElement;
  controlPosition?: "start" | "end";
  description?: React.ReactNode;
  disabled?: boolean;
  error?: React.ReactNode;
  id?: string;
  label: React.ReactNode;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const invalid = Boolean(error);
  const context = useMemo<FieldControlContextValue>(
    () => ({
      describedBy:
        [description ? descriptionId : null, invalid ? errorId : null]
          .filter(Boolean)
          .join(" ") || undefined,
      disabled,
      id: controlId,
      invalid,
    }),
    [controlId, description, descriptionId, disabled, errorId, invalid],
  );

  return (
    <div
      className={cn("flex min-w-0 flex-col", className)}
      data-disabled={disabled || undefined}
      data-slot="choice-field"
    >
      <div
        className={cn(
          "flex items-start gap-3",
          controlPosition === "end" && "flex-row-reverse justify-between",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center",
            description ? "h-5" : "min-h-5",
          )}
        >
          <FieldControlContext value={context}>{control}</FieldControlContext>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <Label
            className={cn(
              "cursor-pointer text-sm leading-5",
              disabled && "cursor-not-allowed opacity-50",
            )}
            htmlFor={controlId}
          >
            {label}
          </Label>
          {description ? (
            <span
              className="text-[0.8125rem] leading-5 text-(--secondary)"
              id={descriptionId}
            >
              {description}
            </span>
          ) : null}
        </span>
      </div>
      <AnimatedMessage id={errorId}>{error}</AnimatedMessage>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Lower-level parts (kept for screens that compose fields by hand).        */
/* ------------------------------------------------------------------------ */

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      className={cn(
        "flex min-w-0 flex-col gap-4 border-0 p-0 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      data-slot="field-set"
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      className={cn(
        "mb-1 font-medium text-(--fg) data-[variant=label]:text-[0.8125rem] data-[variant=legend]:text-[0.9375rem] data-[variant=legend]:font-semibold data-[variant=legend]:tracking-[-0.01em]",
        className,
      )}
      data-slot="field-legend"
      data-variant={variant}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className,
      )}
      data-slot="field-group"
      {...props}
    />
  );
}

const fieldVariants = cva("group/field flex w-full gap-1.5", {
  variants: {
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "flex-row items-center gap-3 has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      className={cn(fieldVariants({ orientation }), className)}
      data-orientation={orientation}
      data-slot="field"
      role="group"
      {...props}
    />
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/field-content flex flex-1 flex-col gap-0.5 leading-snug",
        className,
      )}
      data-slot="field-content"
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-5 group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-3 has-data-checked:border-[rgb(var(--accent-rgb)/0.3)] has-data-checked:bg-(--accent-softer)",
        className,
      )}
      data-slot="field-label"
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-fit items-center gap-2 text-sm leading-5 font-medium text-(--fg) group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      data-slot="field-label"
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-left text-xs leading-5 font-normal text-(--secondary) group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-0.5",
        "[&>a]:text-(--accent-ink) [&>a]:underline [&>a]:underline-offset-4",
        className,
      )}
      data-slot="field-description"
      {...props}
    />
  );
}

/** Alias: the one line of help under a control. */
const FieldHint = FieldDescription;

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative -my-2 h-5 text-sm", className)}
      data-content={!!children}
      data-slot="field-separator"
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-(--paper) px-2 text-[0.8125rem] text-(--secondary)"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

/**
 * An error under a control. Opens with height and opacity when it gets
 * content and closes when it loses it, so it can stay mounted.
 */
function FieldError({
  className,
  children,
  errors,
  id,
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  return (
    <AnimatedMessage className={className} id={id}>
      {content}
    </AnimatedMessage>
  );
}

export {
  ChoiceField,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldHint,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  FormField,
};
