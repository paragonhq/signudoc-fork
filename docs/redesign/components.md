# Components: the primitive kit

## Calm kit (pass 4) — read this first

[`calm.md`](calm.md) is binding and overrides everything below it in this
file and in `brand-depth.md`. The kit was calmed in place: **every export
and prop signature is unchanged**, so older screens declutter without
edits. Defaults now:

- **Tokens** (`globals.css`): page `--page` #F3F2EE, surfaces `--paper`
  #FFF, `--surface` / `--surface-strong` for wells and neutral pills,
  `--divider` for lines inside surfaces, `--track` for pill tracks.
  Secondary text `--secondary` #6B6976 (4.8:1 on the page, 5.4:1 on white;
  use `--secondary-strong` on tinted tracks). Radii `--radius-card` 20,
  `--radius-tray` 28, `--radius-well` 14 (`rounded-xl` = 14, `rounded-2xl`
  = 20, `rounded-3xl` = 28). Elevation `--shadow-card` (cards),
  `--shadow-card-hover`, `--shadow-pop` (menus, popovers, tooltips,
  toasts, tab bar), `--shadow-thumb` (segmented thumb, active nav pill),
  `--shadow-tray`, `--ring-soft` (white secondary buttons), `--ring-input`
  / `--focus-ring-input` (fields). Status tints: `--success|warning|danger
(-soft, -dot)`, `--dot-neutral`. Controls: `--control-h` 40 (44 touch),
  `--field-h` 44. The accent family (`--accent*`) is still driven by
  `brand-color.ts`.
- **Button**: pills; primary violet, `outline` = white + soft ring,
  `secondary` = violet tint, `ghost` text only; press `scale(.97)`. No ink
  edges or letterpress. `ink`/`inverse` still exist but are quiet.
- **Input/Textarea/Select**: 44px, 14px radius, white, 1px ring at 10%,
  accent halo on focus.
- **Sheet/Card/Table(sheet)/Ledger(card)/EmptyState**: white, borderless,
  20px, `--shadow-card`. `variant="quiet"` = faint ring only.
- **Segmented/Tabs**: pill track, one white sliding thumb (soft spring).
- **Table**: light rows (52px), faint dividers, quiet sentence-case
  headers, no hover tab, no stagger. Prefer list rows (see
  `components/dashboard/dashboard-list.tsx`) for documents.
- **Tray**: Family tray: white, 28px, title + round close button, height
  animates, `TraySteps` slides by direction and shows "Step 1 of 3".
  Desktop centred 440 (`lg` 560); phone floats 8px inset, drag to
  dismiss. `tone="danger"` only tints the header icon (ConfirmTray tints
  the primary red); `tone="seal"` looks default.
- **Toaster**: white pill, bottom-centre (above the phone tab bar).
- **StatusFlag**: soft pill + dot + sentence-case word. `sent` and
  `waiting` both read "Waiting" (amber). Completed green, Declined red,
  Draft/Voided neutral, Expired amber.
- **EmptyState**: icon tile (new optional `icon` prop) + title + one
  sentence + one action, centred in its own card (`size="compact"` inside
  another card).
- **Skeleton**: soft tint that breathes; `variant="line"` is just a rounded
  line. **ProgressSteps**: numbered dots + labels, current in accent.
  **Kbd**: quiet tinted chip. **Tooltip/Dropdown/Popover**: white, 14px,
  `--shadow-pop`. **Avatar/SignerChip**: soft tints, no edges, no order
  plates.
- **PageHeader**: 28px/600 title (24 phone), optional one-line
  `description`, actions right; `eyebrow` is a 13px/500 secondary line.
  New prop `actionsInline` keeps actions beside the title on phones.
  `rule`, `signLines`, `microtext` are accepted and ignored. No entrance
  animation.
- **App shell**: light rail, app icon + org name, violet "New envelope"
  pill, white sliding nav pill; phone: top bar + floating tab bar with a
  centred violet +.
- **Shared classes** (`.panel`, `.well`, `.pill`, `.segmented`,
  `.field-input`, `.btn-quiet`, `.notice`, `.meta`, `.section-eyebrow`,
  `.display-title`) are restyled calm. `.meta` is now 13px/500 secondary,
  **not** mono caps.

**Inert pass-3 pieces** (files kept so imports compile; do not use in new
work): `Stamp`, `PlateLabel`, `TabFlag` → soft pills (TabFlag
`tone="sign-here"` stays yellow for the signing view); `Starburst` → plain
number + caption; `Ledger` → simple key/value list; `SignLines`,
`Microtext`, `Ribbon` → render nothing; `CropMarks` → its children in a
plain wrapper; `Sticker` → children with no filter or rotation. Utilities
`ink-edge`, `print-shadow*`, `ledger-rule` and the vars `--ink-edge*`,
`--shadow-print*`, `--rule*`, `--ink-press` now resolve to soft neutral
values; `paper-grain` is gone. Remove these from screens as you touch them.

**Shared-element morph:** `dashboard/paper-thumb.tsx` gives a document's
first page a React `<ViewTransition name="document-page-{id}">`. Any
screen that shows the same document's page should use `PaperThumb` (it
morphs automatically). Names must be unique on a page: pass
`morph={false}` for a second copy.

---

## Pass 3 notes (superseded where calm.md disagrees)

Every screen is built from these. Do not hand-roll an alternative; if a
primitive is missing something, ask for it to be added here. Read
[`brand-depth.md`](brand-depth.md) (binding, pass 3),
[`art-direction.md`](art-direction.md) and [`motion.md`](motion.md) first.

**Pass 3 (brand depth):** the kit is now drawn in the brand's material:
carbon ink edges, ledger rules, letterpress buttons, plates, stamps,
stickers, sign lines, microtext and paper grain. Existing props and exports
are unchanged; the new pieces are documented in
[Brand components](#brand-components-pass-3) and every screen is checked
against the [Brand depth checklist](#brand-depth-checklist).

All primitives live in `src/components/ui/` (named exports, kebab-case
files). Shared page parts live in `src/components/shared/`.

## Ground rules (read once)

- **Tokens only.** Colour with `text-(--fg)`, `bg-(--paper)`,
  `border-(--border)`; alpha with `bg-[rgb(var(--fg-rgb)/0.06)]`. Never a hex,
  `rgba()`, `#fff` or `text-white` in a component: use `--on-accent` for
  text on violet, danger or success fills. Weights 500 (`font-medium`) and
  600 (`font-semibold`) only.
- **`hover:` is gated to fine pointers globally** (`(hover: hover) and
(pointer: fine)`, set in globals.css). Write plain `hover:`; touch never
  gets a stuck hover.
- **Control height** is `--control-h` (36px mouse, 44px touch) and
  `--control-h-sm` (32 / 40). Buttons, inputs, selects, segmented controls
  and tabs all use it, so a toolbar lines up. Use `h-(--control-h)` for
  anything custom that sits in a row of controls.
- **Radius scale** (Tailwind remapped): `rounded-xs` 4px (kbd, flags),
  `rounded-sm` 6px (chips, items inside menus), `rounded-md` 8px (controls),
  `rounded-lg` 10px (menus, popovers, toasts), `rounded-xl` 12px (sheets,
  trays). `2xl`/`3xl` are capped at 12px.
- **Type helpers** (component-layer classes, so utilities override them):
  `meta` = Geist Mono 11px, uppercase, `0.06em`, tabular, `--tertiary`
  (IDs, timestamps, counts, eyebrows, column heads). `display-title` = page
  title (Geist 600, 28→44px, `-0.04em`, leading 1). Use `tabular-nums` on
  every changing number.
- **Motion tokens.** CSS: `duration-(--dur-hover)`, `ease-(--ease-out)`, or
  the Tailwind names `ease-out`, `ease-spring`, `ease-soft-spring`,
  `ease-pop`, `ease-in-out`, `ease-exit`, `ease-drawer` (all brand curves).
  motion/react: `import { EASE, DUR, exitDuration, SPRING_SNAPPY,
SPRING_SOFT } from "@/components/ui/motion-tokens"`. Never `transition-all`
  or bare `ease`.
- **Entrances.** `data-animate="enter"` (+ `data-animate-delay="1|2"`) on a
  page block rises 6px once. `data-stagger` on a list parent staggers its
  children 30ms (first 8). TableBody does this for you on first mount.
- **Reduced motion** is handled globally: transforms and travel are dropped,
  fades stay. `<MotionProvider>` (root layout) makes motion/react follow it.
  Don't add your own blanket rules; if you write a keyframe with travel,
  add a `motion-reduce:` fade variant.
- **Overlays mounted at the root:** `TooltipProvider`, `Toaster`,
  `MotionProvider` (`src/app/layout.tsx`). Don't mount them again.
- **Phone first.** Test at 375, 768, 1440. Nothing scrolls the page
  sideways; tables stack, toolbars wrap, trays become drawers.

New tokens added in pass 2: `--page-rgb`, `--paper-rgb`,
`--on-accent`, `--danger-rgb`, `--success-rgb`, `--warning-rgb`,
`--sign-here-rgb`, `--overlay`, `--shadow-tray`, `--focus-ring-input`,
`--focus-ring-danger`, `--control-h`, `--control-h-sm`.

### Brand material tokens and utilities (pass 3)

| Token                                                        | Value                          | Use                                                                        |
| ------------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------- |
| `--ink-edge`                                                 | carbon 90%                     | 1px edge of a primary object: sheets, tables, trays, menus, focused inputs |
| `--ink-edge-soft` / `--ink-edge-hover`                       | carbon 25% / 45%               | resting / hovered input edge                                               |
| `--rule-color` / `--rule`                                    | carbon 20% / `1px solid`       | rows of a ledger, hairlines between rows                                   |
| `--rule-faint-color` / `--rule-faint`                        | carbon 12%                     | table row rules                                                            |
| `--rule-strong`                                              | `2px solid var(--fg)`          | the heavy receipt rule over a section                                      |
| `--ink-press`                                                | `0 2px 0 var(--fg)`            | the letterpress edge under a button                                        |
| `--shadow-print-sm` / `--shadow-print` / `--shadow-print-lg` | 3 / 4 / 6px hard carbon offset | toasts / the one stamped object / the open tray                            |
| `--on-carbon` / `--on-carbon-muted` / `--on-carbon-faint`    | Bond 100 / 64 / 8%             | text and washes on carbon grounds (16.7:1 and 7.1:1)                       |
| `--focus-ring-on-dark`                                       | lilac ring                     | focus on carbon grounds (violet is 2.5:1 on carbon)                        |
| `--desk` / `--desk-dot`                                      | `#DAD8CF` / `#B9B6AA`          | the document desk (`[data-paper-grid]`)                                    |
| `--sticker-edge`                                             | white                          | the die-cut edge of a Sticker                                              |
| `--sign-line-on-dark`                                        | `#8E8AA0`                      | sign lines on carbon                                                       |
| `--grain-opacity`                                            | 0.11                           | paper grain strength                                                       |
| `--plate-skew`                                               | -12deg                         | every plate, × and sign line                                               |

Utilities (Tailwind `@utility`, so variants work): `ledger-rule` (2px
carbon top rule), `ink-edge` (1px carbon border), `print-shadow`,
`print-shadow-sm`, `print-shadow-lg`. Use the hard shadow on **one** object
per screen.

**Paper grain** is mounted once in the root layout (`<div class="paper-grain">`,
fixed, `z-index:-1`, aria-hidden). It shows only on the open Bond ground:
sheets, desks and plates are opaque, so it never sits behind dense text or
a document. Don't add your own. `body` is transparent on purpose (the
ground is painted by `html`): never give `body` a background.

**Contrast checked** (`contrastRatio` in `lib/brand-color.ts`): Bond on
carbon 16.7, Bond 64% on carbon 7.1, yellow on carbon 15.7, Bond on violet
6.8, yellow on violet 6.4, Bond on danger 5.6, Bond on success 5.8, Bond
on warning 6.2. Violet on carbon is 2.5: never put violet text on carbon.

---

## Actions

### Button

`import { Button, buttonVariants } from "@/components/ui/button"`

| Prop      | Type                                                                                                     | Default   |
| --------- | -------------------------------------------------------------------------------------------------------- | --------- |
| `variant` | `default` `outline` `secondary` `ghost` `destructive` `destructive-ghost` `ink` `inverse` `link`         | `default` |
| `size`    | `default` (36/44) `xs` (28) `sm` (32/40) `lg` (44/48) `icon` `icon-xs` `icon-sm` `icon-lg`               | `default` |
| `loading` | `boolean`: spinner over the label, width kept, `aria-busy`, clicks (and form submits) ignored, focusable | `false`   |
| `asChild` | render onto the child (e.g. a `Link`)                                                                    | `false`   |

```tsx
<Button loading={sending} onClick={send}>Send to 2 signers</Button>
<Button asChild variant="outline"><Link href="/templates">Templates</Link></Button>
```

**Letterpress (pass 3):** `default`, `outline`, `secondary`, `ink`,
`destructive` and `inverse` carry a 1px carbon edge and a 2px carbon ink
edge underneath (`--btn-edge`); pressing sinks the button 2px and drops the
edge, like a stamp. `outline` is the Bond secondary (paper, carbon edge).
`ghost`, `destructive-ghost` and `link` have no edge and keep the scale
press. The ink edge sits outside the box: leave 2px under a button row.
Don't add your own `shadow-*` to a Button (it replaces the edge).

Do: one `default` (violet) per view; `inverse` on violet/carbon slabs;
`destructive-ghost` for row-level "Delete"; say what happens ("Download
signed PDF"). Don't: toggle `disabled` to show progress (use `loading`), put
icons-only content in a Button (use IconButton), override the label colour.

### IconButton

`import { IconButton } from "@/components/ui/icon-button"`

| Prop          | Type                                           | Default |
| ------------- | ---------------------------------------------- | ------- |
| `aria-label`  | `string` **required**                          |         |
| `size`        | `xs` 28 · `sm` 32/40 · `md` 36/44 · `lg` 44/48 | `md`    |
| `variant`     | any Button variant                             | `ghost` |
| `tooltip`     | `true` (shows aria-label) · node · `false`     | `true`  |
| `shortcut`    | node shown as Kbd in the tooltip, e.g. `"⌘D"`  |         |
| `tooltipSide` | `top` `right` `bottom` `left`                  | `top`   |

```tsx
<IconButton aria-label="Duplicate field" shortcut="⌘D" onClick={duplicate}>
  <Copy />
</IconButton>
```

Do: use inside `DropdownMenuTrigger asChild` for row menus. Don't: use for
an action whose meaning is unclear without a tooltip (touch has no tooltip).

### CopyButton

`import { CopyButton } from "@/components/ui/copy-button"`

| Prop           | Type                                          | Default   |
| -------------- | --------------------------------------------- | --------- |
| `value`        | `string` **required**                         |           |
| `aria-label`   | name when icon-only, e.g. "Copy signing link" | `"Copy"`  |
| `children`     | visible label after the icon                  | icon-only |
| `toastMessage` | `true` ("Copied") · string · `false`          | `false`   |
| `onCopied`     | `() => void`                                  |           |
| + Button props | `variant` (default `ghost`), `size`           |           |

```tsx
<CopyButton aria-label="Copy envelope ID" value={envelope.id} />
<CopyButton toastMessage="Link copied" value={url}>Copy link</CopyButton>
```

Icon morphs copy → check (blur cross-fade), resets after 1.6s, announces
"Copied" politely. Don't add your own "Copied!" state around it.

### Spinner

`import { Spinner } from "@/components/ui/spinner"` — decorative arc; the
busy element carries `aria-busy`. Prefer `Button loading` and Skeleton.

---

## Forms

### FormField (use this for every labelled control)

`import { FormField } from "@/components/ui/field"`

| Prop                   | Type                                                     |
| ---------------------- | -------------------------------------------------------- |
| `label`                | node **required**                                        |
| `hint`                 | one line under the control (hidden while an error shows) |
| `error`                | message; opens with height + opacity, closes faster      |
| `labelAside`           | right side of the label row ("Optional", a link)         |
| `id`                   | control id (generated otherwise)                         |
| `required`, `disabled` | passed to the control                                    |

The control inside (Input, Textarea, Select, Checkbox, Switch) picks up
`id`, `aria-describedby` (hint + error) and `aria-invalid` automatically.
Props you pass directly win.

```tsx
<FormField
  label="Email"
  hint="We send the signing link here."
  error={errors.email}
>
  <Input autoComplete="email" inputMode="email" name="email" type="email" />
</FormField>
```

Do: set `error` after blur or submit, not per keystroke; write errors that
say what to do. Don't: use placeholders as labels.

### Input / Textarea / Select / Label

`import { Input } from "@/components/ui/input"` ·
`import { Textarea } from "@/components/ui/textarea"` ·
`import { Select } from "@/components/ui/select"` ·
`import { Label } from "@/components/ui/label"`

- Input: native `<input>` props. 36px (44 touch, 16px text so iOS won't
  zoom), 8px radius, Bond-white fill with a carbon 25% edge that darkens on
  hover; on focus the edge turns carbon with a **2px carbon bottom edge**
  (an inset line, no shift) and the accent halo. Shakes once ±4px when
  `aria-invalid` turns true. Read-only reads as a quiet well. Signature-ish
  inputs (typed signature, name in the signing tray) sit on a yellow sign
  line with `×`: compose with `SignLines`/the sign-line motif, not a box.
- Textarea: same look, grows with content (`field-sizing-content`), min 80px.
- Select: a **native** `<select>` in the field look (phones get the system
  picker). `size="sm"` for toolbars. For rich pickers (colour dots,
  descriptions) use DropdownMenu + `DropdownMenuRadioGroup`.
- Label: 13px / 500 / `--fg`.
- `fieldControlClassName` (from input.tsx) styles a custom control the same.

### ChoiceField, Checkbox, Switch

`import { ChoiceField } from "@/components/ui/field"` ·
`import { Checkbox } from "@/components/ui/checkbox"` ·
`import { Switch } from "@/components/ui/switch"`

| ChoiceField prop          | Type                             | Default |
| ------------------------- | -------------------------------- | ------- |
| `control`                 | `<Checkbox …/>` or `<Switch …/>` |         |
| `label`                   | node                             |         |
| `description`             | node                             |         |
| `controlPosition`         | `start` · `end` (settings rows)  | `start` |
| `error`, `disabled`, `id` |                                  |         |

Checkbox and Switch are Radix (`checked`, `defaultChecked`,
`onCheckedChange`, `disabled`). Checkbox supports `"indeterminate"`.
Pass 3: both have carbon edges. Checkbox: carbon 60% edge, violet fill with
a carbon edge when ticked. Switch: off = Bond track with a carbon edge and
a carbon thumb; on = violet track, Bond thumb with a carbon edge. The
tick draws on and pops (`--ease-pop`); the switch thumb springs and stretches
while pressed. Hit areas are 44px on touch. Switch has `size="sm"`.

```tsx
<ChoiceField
  control={<Switch checked={on} onCheckedChange={setOn} />}
  controlPosition="end"
  description="Remind signers every 3 days."
  label="Automatic reminders"
/>
```

Do: Switch for settings that apply at once; Checkbox for choices applied
on Save and for row selection (`aria-label="Select Lease.pdf"`).

### Older field parts

`Field`, `FieldLabel`, `FieldDescription` (= `FieldHint`), `FieldError`
(now animated; keeps `errors`/`children`), `FieldGroup`, `FieldSet`,
`FieldLegend`, `FieldContent`, `FieldTitle`, `FieldSeparator` still work.
`FieldShell` / `ShellButton` / `StaticShellButton` in
`@/components/shared/form-shell` are restyled wrappers for older screens;
new screens use FormField + Input and Button `size="lg"`.

---

## Choosing and navigating

### Segmented

`import { Segmented } from "@/components/ui/segmented"`

| Prop                                       | Type                                           | Default    |
| ------------------------------------------ | ---------------------------------------------- | ---------- |
| `items`                                    | `{ value, label, count?, icon?, disabled? }[]` |            |
| `value` / `defaultValue` / `onValueChange` | controlled or not (`T extends string`)         | first item |
| `aria-label`                               | **required** (or `aria-labelledby`)            |            |
| `size`                                     | `default` · `sm`                               | `default`  |
| `fill`                                     | stretch, equal widths                          | `false`    |
| `name`                                     | form field name                                |            |

```tsx
<Segmented
  aria-label="Status"
  value={filter}
  onValueChange={setFilter}
  items={[
    { value: "all", label: "All", count: 42 },
    { value: "waiting", label: "Waiting", count: 3 },
  ]}
/>
```

A radiogroup (arrows move and select, Home/End). One thumb slides with
`--ease-spring`; counts are tabular mono. Pass 3: the track is Bond-white
with a carbon 20% edge and the thumb is a **carbon plate** (skewed -12deg)
with Bond text. Too wide for a phone, it scrolls
inside itself. Do: cross-fade the list it filters (160ms), don't jump.
Don't: use it to switch content panels (use Tabs).

### Tabs

`import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"`

`TabsList variant`: `default` (Bond track, **carbon plate** thumb with
Bond text, like Segmented) · `line` (carbon 20% hairline with a 2px carbon
underline; page sections). Vertical tabs paint the active trigger carbon. The indicator slides
to the active trigger. Radix API otherwise (`value`, `defaultValue`,
`onValueChange`, `orientation`). Vertical tabs paint the active trigger.

```tsx
<Tabs defaultValue="overview">
  <TabsList variant="line">
    <TabsTrigger value="overview">Overview</TabsTrigger>…
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
</Tabs>
```

### ProgressSteps (and StepIndicator)

`import { ProgressSteps } from "@/components/ui/progress-steps"`

| Prop      | Type                             |
| --------- | -------------------------------- |
| `steps`   | `(string \| { label, href? })[]` |
| `current` | 1-based                          |
| `label`   | nav name (default "Progress")    |

Current step is a carbon plate (`02 SIGNERS`), done steps carry the
**yellow × on a small skewed carbon chip** (a signed line) and link back
when they have an `href`, later steps are tertiary; the rail between steps
is a 1.5px sign line (carbon when done). Below 640px:
"STEP 2 OF 4", the step name, a segmented bar.
`StepIndicator({ current, steps })` in `@/components/shared/step-indicator`
renders this (with the page entrance).

### Toolbar and SearchInput

`import { Toolbar, ToolbarGroup, ToolbarSpacer, ToolbarDivider, SearchInput } from "@/components/ui/toolbar"`

Toolbar: a wrapping row (`role="group"` when given `aria-label`).
ToolbarSpacer pushes the rest right on desktop. On phones SearchInput moves
to its own full-width first line.

| SearchInput prop                           | Type                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `value` / `defaultValue` / `onValueChange` | string                                                               |
| `shortcut`                                 | `"mod+k"` (⌘K / Ctrl K) · `"/"`: shows a Kbd and focuses on that key |
| `className`                                | sizes the wrapper (default `w-full sm:w-64`)                         |
| `inputClassName`                           | classes for the input                                                |
| `aria-label`                               | **required** unless a visible label exists                           |

Escape clears, then blurs. Don't bind `mod+k` on a page that has the command
menu.

---

## Overlays

### Tray (the dialog)

`import { Tray, TrayTrigger, TrayContent, TrayHeader, TrayTitle, TrayDescription, TrayBody, TrayFooter, TrayClose, TraySteps } from "@/components/ui/tray"`

Pass 3 material: **Bond paper, 1px carbon edge, hard 6px offset print
shadow on desktop** (the open tray is the screen's stamped object), title
in display 600 (20px, -0.035em). `tone="danger"`: the header becomes a
danger band (Bond text) with diagonal hazard sign lines fading in from the
right. `tone="seal"`: a guilloche Ribbon along the top edge (sealing,
verify, certificates). `TraySteps total={n}` prints a mono
`§ 01 / 03` counter above each step's title (read as "01 of 03").

Desktop ≥640px: centred Radix Dialog, 12px radius, scale .96→1 + 8px rise

- blur clear, 260ms in / 160ms out. Phone: Vaul drawer from the bottom with
  a handle, drag down to dismiss (`--ease-drawer`). Height changes animate.

| Part              | Props                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tray`            | `open`, `defaultOpen`, `onOpenChange`, `dismissible` (true), `handleOnly` (phone: drag by handle only), `modal`                                            |
| `TrayContent`     | `size` `sm` 400 · `md` 480 · `lg` 640 · `xl` 800; `tone` `default` · `danger` · `seal`; `showCloseButton` (true); Radix Content props (`onOpenAutoFocus`…) |
| `TrayHeader`      | `icon` (danger trays get a warning glyph by default)                                                                                                       |
| `TrayTitle`       | **required** (use `className="sr-only"` to hide)                                                                                                           |
| `TrayDescription` | one or two sentences                                                                                                                                       |
| `TrayBody`        | the scrolling middle                                                                                                                                       |
| `TrayFooter`      | actions, primary last; `divided` adds a hairline. Full-width stacked buttons on phones.                                                                    |
| `TraySteps`       | `step: number` (0-based): steps slide in from the direction of travel; `total?: number` prints `§ 01 / 03` in each step's TrayHeader                       |

```tsx
<Tray open={open} onOpenChange={setOpen}>
  <TrayTrigger asChild>
    <Button>Rename</Button>
  </TrayTrigger>
  <TrayContent size="sm">
    <TrayHeader>
      <TrayTitle>Rename envelope</TrayTitle>
      <TrayDescription>Signers see this name in their email.</TrayDescription>
    </TrayHeader>
    <TrayBody>
      <FormField label="Name">
        <Input defaultValue={name} />
      </FormField>
    </TrayBody>
    <TrayFooter>
      <TrayClose asChild>
        <Button variant="outline">Cancel</Button>
      </TrayClose>
      <Button loading={saving} onClick={save}>
        Save name
      </Button>
    </TrayFooter>
  </TrayContent>
</Tray>
```

Do: always include TrayHeader (it clears the phone handle); keep one
decision per tray; put a signature pad or anything draggable behind
`handleOnly` or mark it `data-vaul-no-drag`. Don't: nest trays; open a tray
from a tray (use TraySteps); use `window.confirm`.

`Dialog*` (`@/components/ui/dialog`) keeps its old API for existing screens,
restyled to match (CSS bottom sheet on phones, no drag). New work uses Tray.

### ConfirmTray (and HoldToConfirmButton)

`import { ConfirmTray, HoldToConfirmButton } from "@/components/ui/confirm-tray"`

| Prop                                                                            | Type                                                                                                                                       | Default    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `title`                                                                         | node **required** ("Void this envelope?")                                                                                                  |            |
| `description`                                                                   | node (the consequence, "This cannot be undone.")                                                                                           |            |
| `confirmLabel`                                                                  | string **required** ("Void envelope")                                                                                                      |            |
| `cancelLabel`                                                                   | string                                                                                                                                     | `"Cancel"` |
| `onConfirm`                                                                     | `() => void \| Promise`: a promise shows progress, locks the tray, closes on resolve, shows "That didn't go through. Try again." on reject |            |
| `confirmationText`                                                              | phrase to type first (case-insensitive)                                                                                                    |            |
| `confirmationLabel`                                                             | overrides "Type X to confirm"                                                                                                              |            |
| `hold`                                                                          | press-and-hold (1.2s linear fill, snaps back 200ms)                                                                                        | `true`     |
| `holdDuration`                                                                  | ms                                                                                                                                         | `1200`     |
| `tone`                                                                          | `danger` · `default`                                                                                                                       | `danger`   |
| `error`                                                                         | your own error message                                                                                                                     |            |
| `children`                                                                      | extra body content (e.g. a reason Textarea)                                                                                                |            |
| `trigger`                                                                       | element that opens it                                                                                                                      |            |
| `open` / `defaultOpen` / `onOpenChange`, `size` (`md`), `closeOnConfirm` (true) |                                                                                                                                            |            |

```tsx
<ConfirmTray
  trigger={<Button variant="destructive-ghost">Void envelope</Button>}
  title="Void this envelope?"
  description="Signers can no longer open it. This cannot be undone."
  confirmLabel="Void envelope"
  onConfirm={() => voidEnvelope(id)}
/>
```

Keyboard: hold Enter or Space on the button. Assistive tech that clicks
without holding gets a two-step fallback (first activation arms and
announces, second confirms). Cancel takes focus first. Do: use for every
irreversible action. Don't: use for reversible ones (just do it, offer Undo
in a toast).

### Popover

`import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose, PopoverHeader } from "@/components/ui/popover"`

Menu surface (Bond paper, carbon edge, soft shadow), grows from its
trigger. `PopoverHeader` sits on a 2px carbon rule. Default
`w-72`, `p-3`, `sideOffset 6`, `collisionPadding 12`. `PopoverHeader` is a
mono title row. For small, single-decision editors only; more than one
decision belongs in a Tray.

### DropdownMenu

`@/components/ui/dropdown-menu` (unchanged API). Bond paper, carbon edge,
soft shadow; labels are mono caps; separators carbon 20%. Item
`variant="destructive"` for dangerous items; `DropdownMenuShortcut` renders
mono hints. Works from the carbon rail (it portals onto the page).

### Tooltip and Kbd

`import { SimpleTooltip, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"` ·
`import { Kbd, KbdGroup } from "@/components/ui/kbd"`

Tooltip: a small carbon plate (4px corners) with Bond text, 12px, grows from the trigger. First tooltip waits 400ms;
neighbours within 300ms open instantly with no animation.
`SimpleTooltip` props: `label`, `shortcut`, `side`, `align`, `disabled`,
one child. `TooltipContent` takes `shortcut`. Kbd is drawn like a key: Bond fill, carbon edge, **2px
bottom edge**. `tone`: `paper` (light grounds) · `plate` (carbon plates,
tooltips: Bond edges at 40/70%).

```tsx
<SimpleTooltip label="Send" shortcut="⌘↵"><Button>Send</Button></SimpleTooltip>
<Kbd>⌘K</Kbd>  <KbdGroup><Kbd>⌘</Kbd><Kbd>D</Kbd></KbdGroup>
```

Don't put the only copy of information in a tooltip (touch never sees it).
Hide Kbd chips on touch: `pointer-coarse:hidden`.

### Toasts

`import { toast, ToastMeta } from "@/components/ui/toaster"`

Bottom-right on desktop, top-centre on phones. **Small receipts:** paper,
carbon edge, 3px hard print shadow, a dashed tear line along the top, mono
meta line (`ToastMeta`); success shows a tiny seal stamp glyph. Sonner API: `toast()`, `toast.success`, `toast.error`,
`toast.promise`, `{ description, action: { label, onClick } }`.

```tsx
toast.success("Sent to 2 signers", {
  description: <ToastMeta>ENV-8F3A21 · 17 NOV 2026</ToastMeta>,
});
toast("Field deleted", { action: { label: "Undo", onClick: restore } });
```

Do: toast after an action instead of reloading; offer Undo for reversible
destructive actions. Don't: use exclamation marks; toast errors that belong
next to a field.

---

## Status and identity

### StatusFlag

`import { StatusFlag, type EnvelopeFlagStatus } from "@/components/ui/status-flag"`

| Prop       | Type                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------- |
| `status`   | `draft` `sent` `waiting` `completed` `declined` `voided` `expired` (sets tone, glyph, label) |
| `tone`     | `neutral` `accent` `success` `danger` `warning` (generic flags)                              |
| `glyph`    | `dot` `ring` `check` `x` `clock` `seal` `slash` `none`                                       |
| `children` | label override ("Waiting on 2")                                                              |
| `size`     | `sm` (20px) · `md` (22px)                                                                    |

Pass 3 shapes (props and accessible text unchanged):

| Status                                         | Drawn as                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `sent`, `waiting`                              | a **mini plate** (skewed, pointed end) in quiet violet: "in motion"          |
| `completed`                                    | a **mini oval stamp** in success ink reading `SEALED`                        |
| `voided` / `declined` / `expired`              | mini stamps `VOID` / `DECLINED` / `EXPIRED` in danger / danger / warning ink |
| `draft`, and any flag given an explicit `tone` | the square chip with glyph                                                   |

On stamps, screen readers still hear the status word ("Completed",
"Voided"…, an sr-only span), so `getByText("Completed")` keeps working. A
string `children` is pressed into the stamp instead ("Voided 3 Nov").

`EnvelopeStatus` from `lib/types/domain.ts` is `draft | sent | completed |
declined | voided`; `waiting` and `expired` are UI-derived (e.g.
`envelope.expired ? "expired" : envelope.status`).

```tsx
<StatusFlag status={row.expired ? "expired" : row.status} />
<StatusFlag tone="warning" glyph="clock">Closing</StatusFlag>
```

Don't use `.pill` classes in new work (they are kept, restyled, for old
screens).

### TabFlag

`import { TabFlag } from "@/components/ui/tab-flag"`

The skewed plate flag, now a thin wrapper over **PlateLabel** (same props:
TabFlag `sm`/`md`/`lg` = PlateLabel `xs`/`sm`/`md` mono). `tone`: `ink`
(carbon; current step, active filter) · `accent` ("Your turn") ·
`sign-here` (Tab yellow, carbon text; **only** for places a person signs).
`size` `sm` `md` `lg`, `icon`. New work can use PlateLabel directly.

```tsx
<TabFlag tone="sign-here">Sign here</TabFlag>
```

### Avatar and SignerChip

`import { Avatar, SignerChip, getInitials } from "@/components/ui/avatar"`

Avatar: `name`, `size` `xs` `sm` `md` `lg`, `tone` `ink` `accent`
`neutral`, now with a 1px carbon edge. Decorative unless given
`aria-label`. SignerChip keeps the signer colours (inner ring + tint) with
a carbon 1px edge outside; the **order number sits in a tiny carbon plate**
(PlateLabel `micro`).

| SignerChip prop | Type                                            | Default   |
| --------------- | ----------------------------------------------- | --------- |
| `index`         | 0-based signing position; picks `--signer-1..4` |           |
| `name`          | string                                          |           |
| `detail`        | mono second line (email, "Signed 17 Nov")       |           |
| `state`         | `waiting` `viewed` `signed` `declined`          |           |
| `order`         | number on the badge                             | index + 1 |
| `showOrder`     | hide for unordered envelopes                    | `true`    |
| `size`          | `sm` · `md`                                     | `md`      |
| `compact`       | avatar only, name for screen readers            | `false`   |

Map signer statuses: `pending → waiting`, `notified → waiting` (or
`viewed` once a view event exists), `signed`, `declined`.

---

## Containers and states

### Sheet (and Card)

`import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetEyebrow, SheetActions, SheetSection, SheetFooter } from "@/components/ui/sheet"`

Paper, 12px radius, no soft shadow. **`variant`: `ink` (default) · `quiet`.**
`ink` = 1px carbon edge: the primary objects on a page (the list, the
details, the form you're filling in). `quiet` = the old hairline, for
supporting sheets so a page has one or two carbon-edged objects, not ten.
Hairlines stay _inside_ both. Sections after the first get a hairline.
`SheetSection flush` drops padding (for a table or list). `SheetTitle
as="h3"` for nested levels. `Card*` keeps its API and is drawn as a Sheet
(`variant` `ink` default · `quiet`). The one "stamped" object on a focus
page may add `className="print-shadow"`.

```tsx
<Sheet>
  <SheetHeader>
    <div>
      <SheetTitle>Signers</SheetTitle>
      <SheetDescription>They sign in this order.</SheetDescription>
    </div>
    <SheetActions>
      <Button size="sm" variant="outline">
        Add signer
      </Button>
    </SheetActions>
  </SheetHeader>
  <SheetSection>…</SheetSection>
</Sheet>
```

Don't: float cards with gaps on grey, add shadows to resting content, nest
sheets in sheets.

### PageHeader

`import { PageHeader } from "@/components/shared/page-header"`

| Prop            | Type                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `title`         | node **required** (display title)                                                                |
| `eyebrow`       | mono line above ("ENV-8F3A21 · CREATED 17 NOV 2026")                                             |
| `description`   | one line                                                                                         |
| `actions`       | primary last; stack full-width on phones                                                         |
| `action`        | older single-action prop (still works)                                                           |
| `children`      | a row under the header (Toolbar, Tabs)                                                           |
| `headingLevel`  | `h1` (default) · `h2`                                                                            |
| `titleAccent`   | node after the title in Ink violet ("— **sealed**")                                              |
| `signLines`     | sign-line field behind the actions (default `true`; hidden on phones)                            |
| `signLinesSeed` | stable seed for that field (default: the title text)                                             |
| `rule`          | 2px carbon rule under the header (default `true`)                                                |
| `microtext`     | `string` seed (envelope id, digest) or `true`: a hash guard line under the rule, for proof pages |

```tsx
<PageHeader
  eyebrow="42 DOCUMENTS"
  title="Documents"
  description="Everything you have sent."
  actions={
    <Button asChild>
      <Link href="/envelopes/new">New envelope</Link>
    </Button>
  }
>
  <Toolbar aria-label="Filter documents">…</Toolbar>
</PageHeader>
```

No card around it: the title sits on the Bond ground. Pass 3 anatomy: the
eyebrow is preceded by the yellow × on a small carbon chip and a short
carbon rule (`× —— 8 DOCUMENTS · 4 WAITING`), in carbon mono; the title is
44–54px desktop at -0.05em (`.display-title`); a SignLines field fades in
behind the actions; a 2px carbon rule closes the header **before** the
`children` row (toolbar, tabs). On the detail page:

```tsx
<PageHeader
  eyebrow={`${envelope.code} · Created ${created}`}
  microtext={envelope.id}
  title={`${envelope.title} —`}
  titleAccent="sealed"
/>
```

### Table

`import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableActions, TableRowLink, TableEmpty, TableSkeletonRows } from "@/components/ui/table"`

44px rows, **carbon** mono uppercase sticky headers (stick under the
phone/tablet header; `stickyTop` to change), row rules at carbon 12%, a
hover wash plus a **3px Tab yellow tab on the hovered row's left edge**,
`selected` rows in accent wash with a **violet tab**, row actions revealed
on hover (always shown on touch), rows rise in on first mount. `bare`
tables get a 2px carbon rule over the header; `sheet` tables get a carbon
edge with the 2px rule under the header. The skeleton rows' first column is
a sign line.

| Part                | Props                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Table`             | `variant` `sheet` (default, draws the sheet) · `bare`; `stack` (true); `scroll` (sideways scroll instead of clipping); `stickyTop`     |
| `TableBody`         | `animate` (true): first-mount stagger only                                                                                             |
| `TableRow`          | `selected`                                                                                                                             |
| `TableHead`         | `align` `start` `center` `end`; `numeric`; `sort` `ascending` `descending` `none` + `onSort` (renders a sort button, sets `aria-sort`) |
| `TableCell`         | `mobile` (see below); `label` (shown in stacked block mode); `mono`; `numeric`; `align`                                                |
| `TableActions`      | wraps row actions (hover reveal)                                                                                                       |
| `TableRowLink`      | wraps the row's main `Link`; it then covers the whole row                                                                              |
| `TableEmpty`        | `colSpan`, `title`, `description`, `action` (or `children`)                                                                            |
| `TableSkeletonRows` | `columns`, `rows` (5), `delay` (150)                                                                                                   |

**Stacked mode (below 768px).** Each row becomes a card. `TableCell
mobile=`:

| `mobile`  | Where it goes on a phone                          |
| --------- | ------------------------------------------------- |
| `select`  | first, before the title (row checkbox)            |
| `title`   | first line, takes the width                       |
| `status`  | first line, right (StatusFlag)                    |
| `actions` | first line, far right (row menu)                  |
| `meta`    | second line, inline mono, joined with " · "       |
| `block`   | own line, `label` on the left, value on the right |
| `hidden`  | not shown                                         |

Default: `block` if the cell has a `label`, otherwise `meta`. The header row
is visually hidden (kept for screen readers).

```tsx
<Table aria-busy={loading || undefined}>
  <TableHeader>
    <TableRow>
      <TableHead className="w-10"><span className="sr-only">Select</span></TableHead>
      <TableHead sort={sort} onSort={toggleSort}>Document</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Updated</TableHead>
      <TableHead numeric>Signers</TableHead>
      <TableHead><span className="sr-only">Actions</span></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {loading ? <TableSkeletonRows columns={6} /> : rows.map((row) => (
      <TableRow key={row.id} selected={selected.has(row.id)}>
        <TableCell mobile="select"><Checkbox aria-label={`Select ${row.name}`} … /></TableCell>
        <TableCell mobile="title"><TableRowLink><Link href={`/envelopes/${row.id}`}>{row.name}</Link></TableRowLink></TableCell>
        <TableCell mobile="status"><StatusFlag status={row.status} /></TableCell>
        <TableCell mono>{row.updatedLabel}</TableCell>
        <TableCell label="Signers" numeric>{row.signerCount}</TableCell>
        <TableCell align="end" mobile="actions"><TableActions><RowMenu row={row} /></TableActions></TableCell>
      </TableRow>
    ))}
    {!loading && rows.length === 0 ? <TableEmpty colSpan={6} title="Nothing matches" description="Try a different filter." /> : null}
  </TableBody>
</Table>
```

Do: keep columns that fit (truncate names with `truncate` inside a
`max-w-*` span); numbers right-aligned and tabular. Don't: let a table scroll
the page sideways on a phone; centre text.

### EmptyState

`import { EmptyState, SignLineIllustration } from "@/components/ui/empty-state"`

| Prop           | Type                                                                                                                                                    | Default   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `title`        | node **required**                                                                                                                                       |           |
| `description`  | one sentence                                                                                                                                            |           |
| `action`       | one action (second via `secondaryAction`)                                                                                                               |           |
| `tone`         | `default` (carbon-edged sheet, sign-line card as a Sticker, SignLines field fading in on the right) · `accent` (Ink violet slab, Rosette in Copy lilac) | `default` |
| `size`         | `default` · `compact` (no frame, inside a table/sheet)                                                                                                  | `default` |
| `illustration` | replaces the sticker (default tone); wrap your own mark in `<Sticker>`                                                                                  |           |

```tsx
<EmptyState
  title="No envelopes yet"
  description="Upload a PDF, add who signs, and send it in a couple of minutes."
  action={
    <Button asChild>
      <Link href="/envelopes/new">New envelope</Link>
    </Button>
  }
/>
```

Accent slab: at most one per screen, `Button variant="inverse"` for its
action. Left-aligned, never centred.

### Skeleton

`import { Skeleton, SkeletonText } from "@/components/ui/skeleton"`

`Skeleton` (`delay` ms; use 150 so fast loads never flash; `variant`
`block` (default) · `line`) shimmers at 1.2s (still tint with reduced
motion). **`variant="line"`** is a sign line (× + a shimmering 1.5px rule):
use it wherever a line of text is coming. `SkeletonText lines delay` now
draws sign lines. Keep `block` for avatars, thumbnails, buttons. Size
skeletons like the real content. Put `aria-busy` on the loading region.

### StatusPanel

`import { StatusPanel } from "@/components/shared/status-panel"` —
`{ title, description, tone: neutral | loading | error, eyebrow?, action?: { href, label }, footer? }`.
A whole-region state (route errors, load failures). Inside lists, prefer
TableEmpty / EmptyState.

---

## Motion helpers

### TextMorph

`import { TextMorph } from "@/components/ui/text-morph"` — `children:
string`, `live` (announce politely; for status text, not button labels).
Shared letters slide, the rest blur in and out, width glides.

```tsx
<Button loading={state === "sending"}>
  <TextMorph>
    {state === "sent" ? "Sent" : state === "sending" ? "Sending…" : "Send"}
  </TextMorph>
</Button>
```

Use for labels that change meaning (Send → Sent, Sign → Signed, Save →
Saved). Don't use for every label change or for long text.

### NumberRoll

`import { NumberRoll } from "@/components/ui/number-roll"` — `value`,
`format` (`Intl.NumberFormatOptions`), `locale` (default `en-US`). Only the
changed columns roll; screen readers read the number once.

```tsx
<span className="text-2xl font-semibold">
  <NumberRoll value={completedCount} />
</span>
```

### Hooks

`@/components/ui/hooks`: `useMediaQuery(query, serverValue)`,
`useIsDesktop()` (≥640), `usePrefersReducedMotion()`,
`useIsApplePlatform()` (⌘ vs Ctrl), `useElementSize()` (ResizeObserver),
`useControllableState()`, `mergeRefs()`.

---

## Other primitives

- `Separator` (`@/components/ui/separator`): a hairline.
- `Toggle` (`@/components/ui/toggle`): pressed/unpressed button (`variant`
  `default` · `outline`; `size` `default` `sm` `lg`). Pressed = carbon
  plate with Bond text. For one-of-many, use Segmented.
- CSS classes for one-off composition: `.menu-surface` (menu/popover motion),
  `.tooltip-surface`, `.tray-surface` + `.overlay-surface` (tray motion),
  `.row-link`, `.table-actions`, `.plate-label` (+ `data-size`,
  `data-tone`; `.tab-flag` is an alias), `.stamp`, `.sticker`,
  `.microtext`, `.crop-marks`, `.skeleton`, `.skeleton-line`, `.meta`,
  `.display-title`, `.paper-grain` (root layout only).
- Older classes (`.panel`, `.well`, `.pill*`, `.segmented*`, `.field-input`,
  `.btn-quiet*`, `.notice*`, `.section-eyebrow`, `.page-width`,
  `[data-paper-grid]`) are restyled to the branded material so old screens
  degrade gracefully: `.panel` carbon edge, `.panel-raised` print shadow,
  `.segmented` carbon plate for the active item, `.field-input` carbon
  focus edge, `.btn-quiet` letterpress, `.notice*` a 3px left rule in the
  tone, `[data-paper-grid]` the `#DAD8CF` desk with 1.5px `#B9B6AA` dots
  every 24px. Replace them as you rebuild a screen; don't use them in new
  work.

---

## Brand components (pass 3)

All decorative pieces are `aria-hidden` and **deterministic** (seeded from a
prop, never `Math.random()` at render), so server and browser render the
same markup. All render as Server Components (no hooks) unless noted.
Restraint (brand-depth.md §7): **one loud element per screen** (a stamp, a
starburst, a hard print shadow, or a sticker), never several; texture
never behind dense text or fields; yellow only for "sign here / your turn /
active marker".

### PlateLabel

`import { PlateLabel } from "@/components/ui/plate-label"`

| Prop              | Type                                                                                                                                                                                     | Default  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `size`            | `micro` 14px · `xs` 20 · `sm` 24 (mono caps) · `md` 32 · `lg` 48 (display 600)                                                                                                           | `sm`     |
| `tone`            | `carbon` (Bond text) · `carbon-yellow` · `accent` (install colour) · `violet` (brand violet, yellow text) · `yellow` (carbon text) · `accent-soft` · `neutral-soft` · `bond` (on carbon) | `carbon` |
| `mono`            | force mono caps on `md`/`lg`                                                                                                                                                             |          |
| `icon`, `asChild` |                                                                                                                                                                                          |          |

```tsx
<PlateLabel>02 Signers</PlateLabel>
<PlateLabel size="md" tone="carbon-yellow">Sent</PlateLabel>
<PlateLabel size="lg" tone="violet">No envelope fees</PlateLabel>
```

Use for section labels, the "SENT" banner, "Your turn", hero plates. Don't
use `yellow` for anything but sign-here / your turn / the active marker;
don't put a long sentence in a plate.

### Stamp

`import { Stamp } from "@/components/ui/stamp"`

| Prop         | Type                                                                            | Default   |
| ------------ | ------------------------------------------------------------------------------- | --------- |
| `children`   | `string` (SEALED, VERIFIED, SIGNED, VOID, DECLINED, EXPIRED, PART 11)           |           |
| `tone`       | `carbon` `success` `danger` `warning` `accent`                                  | `carbon`  |
| `variant`    | `outline` (inked impression) · `solid` (filled oval, Bond text)                 | `outline` |
| `size`       | `xs` 20 · `sm` 26 · `md` 44 · `lg` 72 · `xl` 104                                | `md`      |
| `rotate`     | degrees (default: a stable -4..4 from the word)                                 |           |
| `texture`    | ink speckle mask (default on for `md`+)                                         |           |
| `land`       | play the one-time landing (pressed down, one settle; fades with reduced motion) | `false`   |
| `decorative` | `aria-hidden` when the verdict is written elsewhere                             | `false`   |

```tsx
<Stamp tone="success" size="lg" land>Sealed</Stamp>      // detail page, thumbnail corner
<Stamp variant="solid" size="lg">Verified</Stamp>        // verify result
```

Use for verdicts on completed/void envelopes, verify results,
certificates, the corner of a signed field. Not for in-progress states
(use a plate) and never two on one screen (StatusFlag's xs stamps in a
list are the exception: they are the list's status column).

### Starburst

`import { Starburst } from "@/components/ui/starburst"`

`children` (short: "New", "3", "$0"), `caption` (mono line under it),
`tone` `violet` (Bond text) · `yellow` (carbon) · `carbon` (yellow), `size`
`sm` 56 · `md` 88 · `lg` 128, `rotate` (-8). 20-point burst from the sticker
sheet. Max one per screen; for "New", counts that need attention ("3
waiting on you"), plan/price facts. The text is real text.

```tsx
<Starburst caption="waiting on you" tone="yellow">
  3
</Starburst>
```

### Seal `ringText` (brand/marks.tsx)

`<Seal ringText="Sealed · SHA-256 · 17 Nov 2026 · " tone="paper" />` sets
mono caps on a circle between the scalloped edge and an inner ring (the
sticker sheet's seal). `tone`: `paper` (Bond, accent ink) · `flag`
(yellow, carbon) · `violet` (brand violet, Bond). End the text with a
separator so the ring closes; keep it to ~40 characters. Existing props
(`label`, `stamped`, `className`) unchanged. Pair with `<Sticker>` for the
"signer finishes" / "sealed" moments.

### Ribbon (brand/marks.tsx)

`<Ribbon height={24} strands={7} className="text-(--accent)" />`: the
guilloche ribbon as a horizontal band (interlaced sine strands, tiles
seamlessly, `currentColor`). Dividers on proof pages; the top edge of
`TrayContent tone="seal"`.

### SignLines

`import { SignLines } from "@/components/brand/sign-lines"`

| Prop            | Type                                                                                                                 | Default      |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| `density`       | `dense` 28 · `default` 34 · `sparse` 44 (px between rows)                                                            | `default`    |
| `accentRatio`   | share of strokes in the accent                                                                                       | `1/6`        |
| `fade`          | `left` `right` `both` `none` (mask)                                                                                  | `none`       |
| `tone`          | `paper` (grey + accent) · `carbon` (banner grey + yellow) · `inverse` (Bond at low strength, on violet/danger bands) | `paper`      |
| `seed`          | string/number: same seed, same field                                                                                 | `"signudoc"` |
| `rows`, `width` | how much to draw (default ~480 × 1400px; it is clipped to its box)                                                   |              |

An `<svg>` at 1:1 scale that fills its box (`h-full w-full` by default): position it absolutely in a sized `relative` parent and size it with `h-*`/`w-*` classes (an svg ignores `top` + `bottom` stretching).

```tsx
<div className="relative isolate">
  <SignLines
    className="absolute inset-y-0 right-0 -z-10 w-1/2 opacity-60"
    fade="left"
    seed="auth"
  />
  …
</div>
```

Used by PageHeader (behind actions), EmptyState, danger tray bands. Use on
auth/onboarding/done pages. Never behind body text or form fields.

### Sticker

`import { Sticker } from "@/components/brand/sticker"`

`rotate` (deg, default -4), `edge` (white die-cut width, 4), `peel` (peel
in on mount: from +6deg and 1.04, 420ms soft spring; fades with reduced
motion; default true), `delay` (ms, to scatter up to 3), `asChild`.

```tsx
<Sticker rotate={8}>
  <Seal className="size-32" ringText="Signed · 17 Nov 2026 · " />
</Sticker>
```

Only for celebratory/brand moments: done, sealed, empty states,
onboarding, 404, landing. Give it a shape (an SVG mark, a plate, a card);
the edge follows the content's alpha.

### CropMarks

`import { CropMarks } from "@/components/brand/crop-marks"`

Wraps a box and draws four L corners (1.5px, 14px) just outside it.
`offset` (8px gap), `size` (14), `tone` `ink` · `muted` · `accent` ·
`bond` (on dark). Leave ~12px of room around the box. Use around: the
document thumbnail on the detail page, the drop zone, the verify drop, the
document on the signing desk, the auth form card.

```tsx
<CropMarks><DocumentThumbnail … /></CropMarks>
```

### Microtext

`import { Microtext } from "@/components/brand/microtext"`

One line of 7.5px mono hash text (+0.1em, carbon 30%), a few groups
highlighted. `seed` (envelope id, digest; deterministic), `tone` `paper` ·
`carbon` · `accent`, `groups` (48), `highlight` (true). A divider under the
header on proof pages (PageHeader `microtext={envelope.id}` does it) and
the foot of the rail. Decorative: never the only place a hash is written.

### Ledger

`import { Ledger, LedgerRow, LedgerTotal } from "@/components/ui/ledger"`

| Part          | Props                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `Ledger`      | `title`, `eyebrow`, `actions`, `headingLevel` (`h2`), `variant` `card` (paper, carbon edge; default) · `bare` |
| `LedgerRow`   | `label`, `children` (value), `mono` (IDs, dates, hashes: mono caps), `wrap` (let long values wrap)            |
| `LedgerTotal` | `label`, `children`: 2px carbon rule above, value in 600                                                      |

```tsx
<Ledger eyebrow="ENV-8F3A21" title="Details">
  <LedgerRow label="Created" mono>
    17 Nov 2026 · 14:02
  </LedgerRow>
  <LedgerRow label="Signers">2</LedgerRow>
  <LedgerRow label="Envelope ID" mono>
    env_8f3a21c9
  </LedgerRow>
  <LedgerTotal label="Status">Sealed</LedgerTotal>
</Ledger>
```

A `<dl>` of `<dt>`/`<dd>` pairs. Replaces every "Details" / key-value
panel (envelope details, audit summary, plan facts, settings summaries).
Not for editable forms.

### App shell (layout/app-shell.tsx, brand.tsx)

Carbon rail: `PlateBrand` (the Plate logo; an install logo sits on a Bond
chip; an install name prints in mono under the plate), the violet
plate-ended "New envelope", nav in Bond 64% → 100% with one sliding Tab
yellow plate marker + yellow label underline, Microtext over the account
row. Phone: Bond header on a 2px carbon rule; carbon bottom bar with a
violet "New" plate and a yellow underline plate under the current place.
Accessible names unchanged ("Workspace" navs, "Account menu for …").
`PlateBrand` (`href`, `tone` `carbon` · `paper`, `showName`) is exported
from `@/components/layout/brand` for other shells; `Brand` is unchanged.

---

## Brand depth checklist

Tick every item on every screen you rebuild (brand-depth.md is binding):

- [ ] **Cover the logo test:** with the rail hidden, the screen still reads
      as SignuDoc (plates, stamps, ledger rules, sign lines, carbon edges).
- [ ] PageHeader with an eyebrow (× + rule + mono), display title, and the
      2px carbon rule; `titleAccent` only where a word carries meaning;
      `microtext` on proof pages (detail, audit, verify, certificate).
- [ ] Primary objects (the list, the details, the form) are `Sheet`
      (`ink`), `Table` (sheet) or `Ledger`; supporting sheets `quiet`.
      No grey-hairline-only cards for the main object.
- [ ] Key/value panels are `Ledger`s, not ad-hoc `dl`s or grids.
- [ ] Section headers inside a page use a 2px carbon rule (`ledger-rule`)
      or a `PlateLabel`, not a gap.
- [ ] Statuses use `StatusFlag` (plates in motion, stamps when terminal);
      verdict moments use a `Stamp` (max one loud element per screen).
- [ ] Empty states use `EmptyState` (sticker + sign lines); no icon in a circle.
- [ ] Loading text uses sign-line skeletons (`SkeletonText`,
      `Skeleton variant="line"`).
- [ ] Documents/drop zones/auth cards wrapped in `CropMarks`; document desks
      use `[data-paper-grid]`.
- [ ] At most **one** loud element: a Stamp, a Starburst, a Sticker, or a
      `print-shadow` object.
- [ ] Yellow only for sign here / your turn / the active marker.
- [ ] No texture (SignLines, Microtext, Rosette) behind body text or fields.
- [ ] Buttons are kit Buttons (letterpress); no custom shadows on them.
- [ ] Tokens only (`--ink-edge`, `--rule-color`, `--shadow-print*`,
      `--on-carbon*`…); no hex/rgba in components; weights 500/600.
- [ ] Contrast ≥4.5:1 for text (no violet text on carbon; Bond 64%+ on
      carbon); decorative pieces `aria-hidden`.
- [ ] Hydration-safe: seeds, not `Math.random()`; no `Date.now()` in render.
- [ ] Reduced motion: stickers/stamps fade only; nothing new travels.
- [ ] Checked at 375, 768, 1440.
