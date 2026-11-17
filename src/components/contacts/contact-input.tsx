"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";

import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

import {
  highlight,
  matchContacts,
  useContactSuggestions,
  type ContactSuggestion,
} from "./contact-data";

type ContactInputProps = Omit<ComponentProps<typeof Input>, "value"> & {
  /** Addresses already on this envelope: not suggested again. */
  exclude?: readonly string[];
  /** Someone was picked from the suggestions. */
  onPick: (contact: ContactSuggestion) => void;
  value: string;
};

/**
 * A name or email field that offers people from the address book as you
 * type.
 *
 * Suggestions appear only after typing in the field, never on focus, and
 * nothing is chosen until you choose it: arrows move through them, Enter
 * or a click picks one, Escape or Tab leaves them. Focus stays in the
 * field the whole time, so typing (or a test's fill) carries on as if the
 * list were not there.
 */
export function ContactInput({
  className,
  disabled,
  exclude,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  onPick,
  value,
  ...props
}: ContactInputProps) {
  const listId = useId();
  const { contacts, load } = useContactSuggestions();
  const [typed, setTyped] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const matches =
    contacts && typed && focused && !disabled
      ? matchContacts(contacts, value, { exclude })
      : [];
  const open = matches.length > 0;
  const activeIndex = active < matches.length ? active : -1;

  function close() {
    setTyped(false);
    setActive(-1);
  }

  function pick(contact: ContactSuggestion) {
    close();
    onPick(contact);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);

    if (event.defaultPrevented || !open) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((activeIndex + 1) % matches.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive(activeIndex <= 0 ? matches.length - 1 : activeIndex - 1);
        break;
      case "Enter": {
        const chosen = matches[activeIndex];

        // Enter with nothing highlighted is the field's own Enter.
        if (chosen) {
          event.preventDefault();
          pick(chosen);
        }

        break;
      }
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  }

  return (
    <PopoverPrimitive.Root
      modal={false}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
      open={open}
    >
      <PopoverPrimitive.Anchor asChild>
        <div className="relative min-w-0">
          <Input
            {...props}
            aria-activedescendant={
              open && activeIndex >= 0
                ? `${listId}-${String(activeIndex)}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={open ? listId : undefined}
            aria-expanded={open}
            className={className}
            disabled={disabled}
            onBlur={(event) => {
              setFocused(false);
              close();
              onBlur?.(event);
            }}
            onChange={(event) => {
              setTyped(true);
              setActive(-1);
              onChange?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              load();
              onFocus?.(event);
            }}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            role="combobox"
            value={value}
          />
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          avoidCollisions
          className={cn(
            "menu-surface z-50 w-(--radix-popover-trigger-width) min-w-64 max-w-[calc(100vw-1.5rem)] origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-(--radius-well) bg-(--paper) p-1.5 shadow-(--shadow-pop) outline-none",
          )}
          collisionPadding={12}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            // Clicking back into the field keeps the list.
            if (event.target === inputRef.current) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          side="bottom"
          sideOffset={6}
        >
          <p className="px-2.5 pt-1.5 pb-1 text-xs leading-4 font-medium text-(--secondary)">
            From your contacts
          </p>
          <ul aria-label="Contacts" id={listId} role="listbox">
            {matches.map((contact, index) => (
              <li
                aria-selected={index === activeIndex}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-[0.625rem] px-2.5 py-2 select-none",
                  "transition-[background-color] duration-(--dur-press) ease-(--ease-out)",
                  "hover:bg-(--hover) aria-selected:bg-(--accent-softer)",
                )}
                id={`${listId}-${String(index)}`}
                key={contact.email}
                onClick={() => pick(contact)}
                // Keep focus in the field while choosing with the pointer.
                onPointerDown={(event) => event.preventDefault()}
                onPointerMove={() => {
                  if (index !== activeIndex) {
                    setActive(index);
                  }
                }}
                role="option"
              >
                <Avatar name={contact.name} size="md" tone="neutral" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-5 text-(--fg)">
                    <Highlighted needle={value} text={contact.name} />
                  </span>
                  <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
                    <Highlighted needle={value} text={contact.email} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function Highlighted({ needle, text }: { needle: string; text: string }) {
  return (
    <>
      {highlight(text, needle.trim()).map((segment, index) =>
        segment.match ? (
          <span className="font-semibold text-(--fg)" key={index}>
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
