"use client";

import { createContext, useContext } from "react";

/**
 * What a FormField or ChoiceField tells the control inside it: its id, the
 * ids that describe it (hint, error) and whether it is invalid. Input,
 * Textarea, Select, Checkbox and Switch read it, so wiring is automatic;
 * props passed directly always win.
 */
export type FieldControlContextValue = {
  describedBy?: string;
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  required?: boolean;
};

export const FieldControlContext =
  createContext<FieldControlContextValue | null>(null);

export function useFieldControl() {
  return useContext(FieldControlContext);
}

/** Merges the field's wiring under the control's own props. */
export function useFieldControlProps<
  P extends {
    "aria-describedby"?: string;
    "aria-invalid"?: React.AriaAttributes["aria-invalid"];
    disabled?: boolean;
    id?: string;
    required?: boolean;
  },
>(props: P): P {
  const field = useFieldControl();

  if (!field) {
    return props;
  }

  const describedBy =
    [field.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") ||
    undefined;

  return {
    ...props,
    "aria-describedby": describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
    disabled: props.disabled ?? field.disabled,
    id: props.id ?? field.id,
    required: props.required ?? field.required,
  };
}
