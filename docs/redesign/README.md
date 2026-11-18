# SignuDoc redesign: the standard

The brand makeover of every page, section, component, modal, interaction and
journey in SignuDoc. This folder is the record: what exists, what it becomes,
and the rules every change is held to.

- [`README.md`](README.md): this file. Brand, principles, foundations.
- [`motion.md`](motion.md): the motion system, with every curve and duration.
- [`inventory.md`](inventory.md): every route, component, modal and journey,
  each with its redesign brief and status.

Source of the brand: the "SignuDoc brand identity" canvas (logo, marks,
colour and type, patterns, stickers, social, website).

## The idea in one sentence

**Security printing, made kind.** SignuDoc looks like the instruments of a
notary (guilloche, hash microtext, scalloped seals, a yellow sign-here flag)
but behaves like Family: one calm surface that reveals what you need as you
need it, and moves so you never lose your place.

## Brand world

| Token      | Hex       | Role                                                                                                                      |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| Ink violet | `#3F22EC` | The one accent. Primary actions, links, focus, current step. Flat, never a gradient. An install's own colour replaces it. |
| Carbon     | `#0D0B14` | Type, plates, dark grounds, the logo plate.                                                                               |
| Bond       | `#EEEDE8` | The page. Paper, not white.                                                                                               |
| Tab yellow | `#FFE83A` | **Sign here, only.** Signing fields, the "your turn" flag, the signature line. Never decoration.                          |
| Copy lilac | `#C9C2FF` | Tints and pattern lines on ink.                                                                                           |
| Deep ink   | `#1B0F6B` | Shadowed ink, proof and data grounds.                                                                                     |

Cards are a lighter sheet (`--paper #FAF9F6`) on Bond, separated by a 1px
hairline, not a shadow. Shadows only on things that float (menus, dialogs,
the dragged field).

Type: **Geist** for everything, weight 500 for UI, 400 for reading, 600 for
headlines with tight tracking (`-0.03em` at 30px+). **Geist Mono** only for
IDs, hashes, timestamps and the audit trail. Sentence case everywhere.

Marks used in product:

- **The plate** (skewed carbon plate, italic wordmark, yellow x and line):
  marketing, auth, signer header when the install has no logo, sealed PDF.
- **The seal** (scalloped notary edge with S): completion, verification,
  the certificate. It is the reward moment.
- **App icon S**: favicon, compact header, mobile.
- **Guilloche rosette and ribbon**: auth backgrounds, completion, the seal
  and verify pages, empty states. Never behind working content.
- **Hash microtext (Digest)**: audit trail, verify, certificate surfaces.
- **The x and sign line**: every signature field and every "sign here".

White-label rule: an install's logo and colour replace Ink violet and the
plate in the chrome its signers see. The texture, type, Tab yellow and seal
stay: they are SignuDoc's, and they are what make a document feel sealed.

## Principles

1. **Gradual revelation.** The basics in reach, everything else appears when
   it becomes relevant. Trays and inspectors, not walls of settings.
2. **One object.** Things travel, they don't swap. The "Send" button becomes
   the confirmation; the field you drop becomes the field you edit; the
   signer's row becomes their detail. Never fade one thing out while another
   fades in.
3. **Fluid, not slow.** Under 300ms for UI. Keyboard actions never animate.
   Exits are shorter than entrances.
4. **Selective delight.** The rarer the moment, the more it may celebrate:
   the first send, the seal landing on a finished document, verification
   passing. The daily path (dashboard, list, field placement) stays crisp.
5. **Proof is beautiful.** Hashes, audit chains and certificates are shown,
   in mono, with the Digest texture, as the product's evidence.
6. **Every state exists.** Rest, hover, press, focus-visible, selected,
   disabled, loading, empty, error, refused; each designed and each
   transition between them designed.
7. **Enterprise density, phone first.** Dense, scannable tables and an
   expansive builder at 1440px; the same flows complete with one thumb at
   375px. Nothing is "desktop only".
8. **Honest to assistive tech.** Real buttons and labels, visible focus,
   `aria-live` on changing values, reduced motion read once.

References the team agreed on: Benji Taylor's _Family Values_ (trays,
gradual revelation, text morphs, Delight-Impact curve) and _Honkish_
(presence, little big details, colour-coded consequence); Emil Kowalski's
design engineering; Bencho/useLayouts studio-grade interaction; DialKit as
inspiration for the field inspector (direct manipulation, dials over forms).
Inspiration only: nothing is copied.

## Foundations

All tokens live in `src/app/globals.css`. Components use tokens, never raw
hex or `rgba(...)`. Existing variable names are kept, so retheming the
tokens restyled the whole app before any page was touched.

| Group          | Tokens                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Ground and ink | `--page`, `--paper`, `--paper-raised`, `--surface`, `--surface-strong`, `--fg`, `--secondary`, `--tertiary`, `--placeholder`                  |
| Accent         | `--accent`, `--accent-hover`, `--accent-ink`, `--accent-soft`, `--accent-soft-hover`, `--accent-softer`, `--accent-rgb` (install-overridable) |
| Sign here      | `--sign-here`, `--sign-here-ink`                                                                                                              |
| Status         | `--danger*`, `--success*`, `--warning*`                                                                                                       |
| Edges          | `--border`, `--border-strong`, `--border-hover`, `--hover`, `--press`, `--focus-ring`                                                         |
| Elevation      | `--shadow-card` (hairline), `--shadow-lift`, `--shadow-soft`                                                                                  |
| Motion         | `--ease-*`, `--dur-*` (see motion.md)                                                                                                         |

Contrast is checked with `contrastRatio` in `src/lib/brand-color.ts`; every
text token passes 4.5:1 on the surfaces it sits on.

Radii: 10px cards and sheets, 8px controls, 6px fields on the document,
pill for status and chips. Inner radius = outer minus padding.

## How the work is staged

1. **Foundations** (done): tokens, fonts, motion tokens, entrance motion.
2. **Primitives**: Button, Input, Field, Select, Checkbox, Toggle, Tabs,
   Tooltip, Dropdown, Dialog becomes Tray, Toast, Skeleton, Status pill,
   Avatar, Empty state, Plate and Seal marks.
3. **Shell**: app shell (sidebar at desktop, bottom bar on phone),
   command menu, account tray.
4. **Journeys, in order of reach**: signer journey, send flow (upload,
   signers, builder, review), envelope detail, dashboard, templates,
   settings and admin, auth and setup, verify and download, legal pages,
   emails, sealed PDF and certificate.
5. **Polish pass**: the checklist in motion.md on every screen at 375,
   768, 1440, keyboard only, reduced motion, 200% zoom.

Status for each item lives in inventory.md.
