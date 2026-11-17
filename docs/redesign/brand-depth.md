> **Superseded by [calm.md](calm.md).** Kept for history: this direction was rejected as cluttered.

# Brand depth: from "nice SaaS" to SignuDoc

Feedback on pass 2: clean, but it looks like every other SaaS. The brand
world (security printing, notary stamps, receipts, sign-here flags, plates)
has to be visible in the material of every page and component, while
staying clean and intuitive. This file is binding and overrides
art-direction.md where they disagree.

The test for every screen: **cover the logo. Can you still tell it is
SignuDoc?** If not, it is not done.

## 1. The material: printed matter, not glass

SignuDoc is made of paper, ink and stamps. Not translucent panels, not soft
grey cards.

| Was                                     | Now                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Faint grey 1px border on every card     | **Ink rules.** Primary objects (sheets, stat tiles, envelope rows group, trays, inputs on focus) use carbon edges: `1px solid rgb(var(--fg-rgb)/0.9)` for primary objects, `--border` hairlines only _inside_ them. Like the price-list receipt card.               |
| Sections separated by gaps              | **Ledger rules.** Section headers carry a 2px carbon top rule (`border-top: 2px solid var(--fg)`), rows below are 1px rules. Key/value panels look like a receipt.                                                                                                  |
| Flat Bond page                          | **Paper.** A barely visible fibre grain over the page (`.paper-grain`, SVG feTurbulence, 3–4% opacity, fixed, pointer-events none). Desks for documents keep the dot grid (`#DAD8CF` desk with `#B9B6AA` 1.5px dots every 24px, from the sticker sheet).            |
| Generic soft shadows on floating things | **Offset print shadow** on floating objects: `4px 4px 0 var(--fg)` for "stamped" emphasis objects (primary sheet on a focus page, the active tray, the dock), plus the soft shadow for menus only. Use the hard offset shadow sparingly: max one object per screen. |
| Rounded everything at 12px              | Keep 12px for sheets, but **plates** (skewed -12deg, pointed right end) for labels/flags/banners and **stamps** (oval, ring inside) for verdicts.                                                                                                                   |

## 2. New brand components (build once, use everywhere)

All in `src/components/brand/` (marks) or `src/components/ui/` (UI):

1. **`SignLines`**: the field of `×` + sign-line strokes from the profile
   banner (rows 34px apart, skewX(-12), random lengths seeded, most strokes
   `--border-hover`, ~1 in 6 in accent). Props: `density`, `accentRatio`,
   `fade` (mask to transparent at one side). Use: right side of every
   PageHeader (masked fade), empty states, auth/onboarding, done pages.
2. **`Plate`** label/banner (`ui/plate-label.tsx`): skewed plate silhouette
   with text, tones carbon/yellow, violet/yellow-text, yellow/carbon. Sizes
   sm (section label), md (banner), lg (hero). The existing TabFlag becomes a
   size of this.
3. **`Stamp`** (`ui/stamp.tsx`): the oval stamp (carbon ellipse, inner ring
   in Bond, text) for verdicts: SEALED, VERIFIED, SIGNED, VOID, DECLINED,
   EXPIRED, PART 11. Slightly rotated (-4..4deg), with an optional ink
   texture mask so it reads as stamped. Used on completed/void envelopes,
   verify results, certificates, signed fields' corner.
4. **`Starburst`** (`ui/starburst.tsx`): the 34-point burst badge (violet
   with Bond text, or yellow with carbon) for "New", counts that need
   attention (e.g. "3 waiting on you"), plan/price facts. Max one per screen.
5. **`Seal` ring text**: extend `Seal` with `ringText` (text on a circular
   path between the scalloped edge and the inner ring), e.g.
   `SEALED · SHA-256 · 17 NOV 2026 ·`. Variants: violet/Bond, yellow/carbon.
6. **`Sticker`** wrapper: die-cut white outline (`filter: drop-shadow(4px 0 0
#fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0
-4px 0 #fff) drop-shadow(0 8px 12px rgb(var(--fg-rgb)/.25))`) + rotation
   prop. Only for celebratory/brand moments (done, sealed, empty states,
   onboarding, 404, landing). Peels in on mount (rotate from +6deg, scale
   1.04, 420ms soft spring).
7. **`CropMarks`**: four L-shaped corner marks (1.5px carbon, 14px) placed
   just outside a box, like the brand board corners. Use around: the
   document thumbnail on the detail page, the drop zone, the verify drop,
   the document on the signing desk, the auth form card.
8. **`Microtext`** rule: a 1-line band of tiny mono hash text (7–8px,
   letter-spacing .1em, `--tertiary` at 50%) used as a divider under page
   headers on proof-related pages (detail, audit, verify, certificate) and as
   the bottom edge of the sidebar.
9. **`Ledger`** (`ui/ledger.tsx`): receipt-style key/value list: title in
   display 600 with 2px carbon rule below, rows label left / value right
   (value 500, mono for IDs/dates), 1px rules (carbon at 20%), optional
   totals row with 2px rule. Replaces every "Details" panel.
10. **`Guilloche` band** (`brand/marks.tsx` `Ribbon`): the ribbon pattern as
    a horizontal band (sine bands interlaced) for dividers on proof pages and
    the top edge of trays in `tone="seal"`.

## 3. Shell: the plate rail

- The desktop rail becomes **Carbon** (`--fg` background, Bond text) with
  the **Plate** logo at the top (or the org logo on a Bond chip when the
  install has a logo).
- "New envelope" is an Ink violet plate-ended button (right end pointed,
  skewed like the plate) with Bond text.
- Nav items: Bond at 64% → 100% on hover; the active item gets a **Tab
  yellow plate marker** that slides between items (the plate shape, 6px wide
  stripe on the left edge + yellow label underline), not a pill.
- Bottom of the rail: account row, and a Microtext band.
- Phone: header stays Bond but gets a 2px carbon bottom rule; bottom bar is
  Carbon with Bond icons and a violet centre "New" plate; active tab marked
  with a yellow underline plate.

## 4. Page anatomy, branded

1. Mono eyebrow preceded by the yellow `×` mark and a short rule:
   `× —— 8 DOCUMENTS · 4 WAITING`.
2. Display title, 44–56px desktop, `-0.05em`, carbon. One word or phrase
   may be set in Ink violet when it carries meaning (e.g. the envelope
   status word on the detail page: "consulting agreement — **sealed**").
3. Right side of the header: `SignLines` field masked to fade left, behind
   the actions, at low contrast.
4. A 2px carbon rule under the header (full content width) before the
   content.

## 5. Component-level rules

- **Buttons:** primary = Ink violet with a 1px carbon edge and a 2px carbon
  bottom "ink" edge (`box-shadow: 0 2px 0 var(--fg)`; pressed: translateY(2px)
  and shadow 0, like a stamp being pressed). Secondary = Bond with 1px
  carbon edge and the same ink edge. Ghost unchanged. This "letterpress"
  press is the signature interaction of every button.
- **Inputs:** Bond-white fill, 1px carbon at 25% edge, 2px carbon bottom
  edge on focus with the accent ring; label in 500; mono hint. Signature-ish
  inputs (name in signature tray, typed signature) sit on a yellow sign line
  with `×`.
- **Tables:** header row carbon text mono on a 2px carbon top rule; row
  rules at carbon 12%; the hovered row gets a yellow 3px left tab; selected
  rows a violet tab.
- **Status:** StatusFlag keeps the glyph+mono label but drawn as a mini
  plate (skewed, pointed end) for Waiting/Sent ("in motion"), a mini Stamp
  for terminal states (Completed → SEALED stamp in success ink, Voided →
  VOID, Declined → DECLINED, Expired → EXPIRED).
- **Segmented / tabs:** the active thumb is a carbon plate with Bond text
  (not a white pill).
- **Trays:** Bond paper, carbon 1px edge, hard offset shadow `6px 6px 0
var(--fg)` on desktop, a mono "§ 01 / 03" step counter, title in display 600. Danger trays: header band in danger with diagonal hazard sign-lines.
- **Toasts:** small receipts: carbon edge, mono meta line, a tiny stamp
  glyph for success.
- **Empty states:** sticker + sign-lines composition, never a generic icon
  in a circle.
- **Skeletons:** sign-line shapes (× + line) shimmering, not grey blocks,
  where a line of text is expected.
- **Avatars / signer chips:** keep colours, add a carbon 1px edge and the
  order number in a tiny plate.
- **Icons:** lucide at stroke 1.75, but field-type icons in the builder and
  signing view are custom brand glyphs (nib for signature, monogram for
  initials, calendar stub, etc.) drawn at the plate's -12deg skew.

## 6. Moments (Delight-Impact)

| Moment                        | Brand treatment                                                            |
| ----------------------------- | -------------------------------------------------------------------------- |
| Envelope sent                 | The envelope card slides into a carbon plate "SENT" banner; toast receipt. |
| Signer finishes               | Seal with ring text stamps as a sticker (peel-in), yellow sign line draws. |
| Envelope sealed (detail page) | SEALED oval stamp lands on the thumbnail corner; ring-text seal.           |
| Verify match                  | Microtext resolves, VERIFIED stamp lands.                                  |
| Setup complete                | Plate assembles, stickers scatter onto the slab (3 max).                   |
| 404                           | "No envelope" mark as a sticker.                                           |

## 7. Restraint (still clean, still intuitive)

- One loud element per screen (a stamp, a starburst, a hard shadow, or a
  sticker), never several.
- Texture never sits behind dense text or form fields.
- Yellow stays reserved for "sign here / your turn / active marker".
- Everything still passes contrast; textures are decorative and `aria-hidden`.
