import Link from "next/link";
import type { ChangeEventHandler, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FieldShellProps = {
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  helper?: string;
  label: string;
  name?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  readOnly?: boolean;
  type?: "text" | "email" | "password";
  value?: string;
  /**
   * Keeps password managers from treating this field as part of a login,
   * for email fields that are not the account's own (a support address).
   */
  ignorePasswordManagers?: boolean;
  /** Length limits, which password managers read when they make a password. */
  maxLength?: number;
  minLength?: number;
  /**
   * The rules a generated password must follow, in the format password
   * managers (Safari, 1Password) read from the passwordrules attribute.
   * https://developer.apple.com/password-rules/
   */
  passwordRules?: string;
};

type ShellButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  href?: string;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "danger" | "ghost" | "primary" | "secondary";
};

const variantMap: Record<
  NonNullable<ShellButtonProps["variant"]>,
  NonNullable<React.ComponentProps<typeof Button>["variant"]>
> = {
  danger: "destructive",
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
};

/**
 * A labelled text field (label, input, hint or error) in the new field
 * look. Older screens use it; new work composes FormField + Input.
 */
export function FieldShell({
  autoComplete,
  disabled = false,
  error,
  helper,
  ignorePasswordManagers = false,
  label,
  maxLength,
  minLength,
  name,
  passwordRules,
  onChange,
  placeholder,
  readOnly = true,
  type = "text",
  value,
}: FieldShellProps) {
  return (
    <FormField
      disabled={disabled}
      error={error}
      hint={helper}
      id={name}
      label={label}
    >
      <Input
        autoComplete={autoComplete}
        className="read-only:text-(--secondary)"
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        value={value ?? ""}
        {...(ignorePasswordManagers
          ? { "data-1p-ignore": "true", "data-lpignore": "true" }
          : {})}
        {...(passwordRules ? { passwordrules: passwordRules } : {})}
      />
    </FormField>
  );
}

/**
 * The large call-to-action button older screens use (auth, forms). It is a
 * Button at size `lg`; `loading` shows the spinner without changing width.
 */
export function ShellButton({
  children,
  className = "",
  disabled = false,
  href,
  loading = false,
  onClick,
  type = "button",
  variant = "primary",
}: ShellButtonProps) {
  const buttonVariant = variantMap[variant];

  if (href && !disabled && !loading) {
    return (
      <Button asChild className={className} size="lg" variant={buttonVariant}>
        <Link href={href}>{children}</Link>
      </Button>
    );
  }

  return (
    <Button
      className={className}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      size="lg"
      type={type}
      variant={buttonVariant}
    >
      {children}
    </Button>
  );
}

type StaticShellButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: NonNullable<ShellButtonProps["variant"]>;
};

export function StaticShellButton({
  children,
  className = "",
  variant = "primary",
}: StaticShellButtonProps) {
  return (
    <span
      className={cn(
        buttonVariants({ size: "lg", variant: variantMap[variant] }),
        className,
      )}
      style={
        variant === "primary" || variant === "danger"
          ? { color: "var(--on-accent)" }
          : undefined
      }
    >
      {children}
    </span>
  );
}
