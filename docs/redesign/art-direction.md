# Art direction: the product, rebuilt

The first pass only changed colour and type. This is the actual design. Every
screen is rebuilt to it, from scratch where needed. If a screen still looks
like "the old layout in new colours", it is not done.

## The look in one line

**A notary's desk run like a trading terminal.** Bond paper, carbon type,
ink-violet authority, yellow sign-here flags, security-print texture on the
moments that matter, and dense, mono-annotated, enterprise-grade data
everywhere else.

## Signature elements (use them; they are what make it ours)

1. **Display headings.** Page titles in Geist 600 at 36–44px desktop /
   28–30px phone, `letter-spacing: -0.04em`, `line-height: 1`. No title card
   wrapping them: titles sit on the Bond ground, not inside white boxes.
2. **Mono metadata.** Every ID, timestamp, count, hash, step number, column
   header and eyebrow label in Geist Mono, 11–12px, uppercase,
   `letter-spacing: 0.06em`, `--tertiary`. Example eyebrow:
   `ENV-8F3A21 · CREATED 17 NOV 2026`. Numbers always `tabular-nums`.
3. **The tab.** The plate silhouette (a rectangle with a pointed right end,
   skewed -12deg) is our flag shape. Used for: the current step in a flow,
   the "Sign here" marker (Tab yellow, carbon text), the "Your turn" badge,
   the active filter. Component: `<Tab>` in `ui/tab-flag.tsx`.
4. **Status flags, not pills.** Status = small square-ish chip with a 6px
   glyph (dot, ring, check, x, clock) + mono uppercase label. Colours:
   Draft neutral, Sent/Waiting ink violet, Completed success with a tiny
   seal glyph, Declined/Voided danger, Expired warning.
5. **Carbon plates.** Dark `--fg` blocks with Bond text used structurally,
   sparingly: the builder toolbar dock, the signer action bar, the "Your
   turn" banner, the envelope detail summary strip, keyboard hint chips.
6. **Ink violet slabs with guilloche.** Full-bleed accent blocks with the
   `Rosette` (or ribbon) at 12–18% opacity in Copy lilac: empty states,
   onboarding, auth side panel, completion/sealed moments, verify success.
   At most one per screen.
7. **Sign lines.** The yellow `x` + line motif marks every place a person
   signs: signature fields, the draw pad, the signature preview.
8. **Hairline sheets.** Content sits on paper sheets (`--paper`) with a 1px
   `--border` edge and 12px radius. No drop shadows on resting content.
   Shadows only on floating things (menus, trays, the dragged field, the
   dock). Sheets stack in sections separated by hairlines, not gaps of
   floating cards.
9. **Tables first.** Enterprise lists are tables: 44px rows, hairline
   dividers, mono metadata columns, row hover wash, row actions revealed on
   hover (always visible on touch), sticky header, checkbox selection where
   bulk actions make sense. On phones a table collapses into stacked rows
   (title line, mono meta line, status flag), never a horizontal scroll of
   a desktop table.
10. **Keyboard hints.** `kbd` chips (mono, 1px border, 4px radius) beside
    actions that have shortcuts: ⌘K search, N new envelope, ⌘↵ send,
    ⌫ delete field, ⌘D duplicate.

## Layout system

- App shell: 240px rail (desktop ≥1024), header + bottom bar on phone.
  Content max width 1240px; the builder and signing view are full-bleed.
- Page anatomy, top to bottom: mono eyebrow → display title + one-line
  description on the left, primary action (+ secondary) on the right →
  toolbar row (segmented filters, search, view toggle) → content sheet.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72. Section rhythm 32px
  desktop / 24px phone.
- Radii: 12px sheets, 10px trays inner, 8px controls, 6px chips and fields
  on the document, 999px only for avatars and toggles.
- Density: body 14px, secondary 13px, mono meta 11–12px. Controls 36px
  (desktop compact) / 44px (touch). Hit areas ≥44px on touch.

## Components you must use (from `src/components/ui`)

Built by the primitives pass. Do not hand-roll alternatives:
Button, IconButton, Input, Textarea, Field (label/hint/error), Select,
Checkbox, Switch, Segmented (sliding thumb), Tabs, Tooltip (with Kbd),
DropdownMenu, Popover, Tray (dialog on desktop, Vaul drawer on phone),
ConfirmTray (danger + hold-to-confirm), Toast (`toast()` from sonner,
`<Toaster />` mounted in the root), StatusFlag, TabFlag, Kbd, Avatar /
SignerChip, EmptyState, Skeleton, Table (Table, TableHeader, TableRow,
TableCell, responsive stacked mode), Sheet (section container),
PageHeader (eyebrow/title/description/actions), Toolbar, CopyButton,
NumberRoll, ProgressSteps, TextMorph (label change with shared letters).

## Motion (see motion.md)

`motion/react` is installed for springs, layout and shared-element
transitions (`layoutId`); prefer CSS for simple state transitions.
`sonner` for toasts, `vaul` for phone trays. Required moments:

- Lists: rows enter with 6px rise and 30ms stagger on first load only.
- Filters/segmented: thumb slides with `--ease-spring`; the list
  cross-fades 160ms, it does not jump.
- Primary actions that change meaning use TextMorph (Send → Sending… →
  Sent; Sign → Signed; Save → Saved).
- Trays morph from their trigger on desktop where practical (`layoutId`),
  slide up with `--ease-drawer` on phone.
- No `window.location.reload()` after an action: update state, show a
  toast.

## Voice

Plain, warm, specific. Sentence case. Buttons say what happens ("Send to 2
signers", "Download signed PDF"). No exclamation marks. Errors say what to
do next.

## Never

Gradients (except the guilloche texture), emoji, generic stock
illustrations, rounded-2xl/3xl white floating cards on grey, `font-bold`
or `font-extrabold` in UI (use 500/600), raw hex or rgba in components
(tokens only), `transition: all`, centred-everything layouts, horizontal
scroll of whole pages on phone.
