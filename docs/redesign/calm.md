# Calm: the SignuDoc standard (pass 4)

**This file replaces `brand-depth.md` and overrides `art-direction.md`
wherever they disagree.** Read it before touching any UI.

## What the owner said, in order

1. Pass 1 (tokens only): "the bare minimum".
2. Pass 2 (dense SaaS layouts): "looks like every other SaaS".
3. Pass 3 (stamps, plates, microtext, sign-lines, grain, carbon rail,
   letterpress): "way too cluttered, sloppy… we went too far the wrong way…
   not so branded, should be clean… I wanted better UI, dashboard, UX…
   Family values style. This is NOT that."

So: **premium comes from simplicity, fluidity and selective delight, not
from decoration.** The brand is felt through colour, type, the S icon, the
yellow sign-here and one seal moment, and above all through how the product
_behaves_.

## The three values, applied to SignuDoc

### Simplicity through gradual revelation

- Each screen has one job and one primary action. Everything else appears
  when it becomes relevant: on hover/selection, in a "More" menu, behind a
  disclosure, or in a tray.
- Show the state people care about in words ("Waiting for Riley · sent 2h
  ago"), not codes, IDs, counts and labels. IDs and hashes live in detail
  views only.
- Flows are short steps. A complex flow starts in a tray and grows into a
  full screen only when it needs the room (New envelope: tray → builder).

### Fluidity through seamless transitions

- Things travel instead of swapping: a row's thumbnail becomes the detail
  page's thumbnail; "New envelope" opens a tray from the button; the tray
  grows into the builder; Send morphs to Sent.
- Tabs and segmented controls move directionally: left tab → content
  slides from the left, and the reverse.
- Labels that change meaning use TextMorph (Continue → Confirm, Send →
  Sending… → Sent, Sign → Signed).
- Never duplicate an element that persists into the next state.

### Delight through selective emphasis (Delight-Impact curve)

- Daily surfaces (Documents, the builder, lists) are calm and fast.
- Rare moments get the magic: the first send, a signer finishing (the seal),
  a document completing, setup finishing, verification passing.
- One moment per screen, at most.

## Visual system

| Thing       | Rule                                                                                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page        | `--page` Bond-light `#F3F2EE`. No grain, no texture, no dot grid except the document desk.                                                                                                                                                                                                                    |
| Surfaces    | White `#FFFFFF` cards, **no border lines**, soft elevation: `0 0 0 1px rgb(fg/.04), 0 1px 2px rgb(fg/.04), 0 6px 20px -8px rgb(fg/.08)`. Radius **20px** for cards, **28px** trays, **14px** inner wells.                                                                                                     |
| Type        | Geist. Page title 28px/600/-0.03em (phone 24px). Section title 16px/600. Body 15px/400, UI 14px/500. Secondary text `#6B6976`. **No uppercase mono eyebrows.** Mono only for IDs, hashes, codes, in detail views.                                                                                             |
| Buttons     | Pill radius. 40px tall (36 compact, 48 hero/phone primary). Primary Ink violet, white text. Secondary white with the soft ring. Ghost text-only. Press `scale(.97)`. No ink edges, no letterpress, no hard shadows.                                                                                           |
| Inputs      | 44px, radius 14px, white, 1px ring `rgb(fg/.10)`, focus ring accent at 30%. Labels 14px/500 sentence case above.                                                                                                                                                                                              |
| Status      | Soft pill: tinted background + coloured dot + sentence-case word (Draft, Waiting, Completed, Declined, Voided, Expired). No stamps, no plates, no mono caps.                                                                                                                                                  |
| Icons       | lucide, stroke 1.75. Category icons sit in a soft rounded tile (32px, radius 10, tinted by meaning).                                                                                                                                                                                                          |
| Colour      | Carbon text, Ink violet for primary action and selection only. Status tints: success green, waiting amber, danger red, neutral grey. **Tab yellow only for "sign here" in the signing view and builder.**                                                                                                     |
| Spacing     | 8px grid. Page padding 40px desktop / 20px phone. Section gap 32px. Content max-width 1080px (settings 880px).                                                                                                                                                                                                |
| Brand marks | App icon S in the shell and auth. Seal: only on a completed document's detail page (small) and the signer's done screen. Rosette: auth side panel and done screen only, ≤10% opacity. Nothing else: no plates, stamps, starbursts, stickers, crop marks, microtext, sign-line fields, ribbons, print shadows. |

## Signature components

- **Tray** (Family-style): white, radius 28px, a header row with title and
  an icon button (close on the first tray, back on later ones), one task per
  tray, height animates between steps with a directional content slide.
  Desktop: centred, 440px wide (560 for rich content). Phone: **floating
  bottom tray inset 8px from the screen edges** (not edge-to-edge), drag to
  dismiss. Danger trays tint the header icon and primary button red, nothing
  more.
- **Segmented control**: pill track `rgb(fg/.05)`, white sliding thumb with
  soft shadow, spring.
- **List rows** (instead of heavy tables): 64px rows, 40px thumbnail or icon
  tile, title 15/500, a plain-language secondary line, trailing avatars and
  status pill, chevron on hover. Grouped by time (Today, This week,
  Earlier) with small 13px/500 group labels. Dense enough for enterprise,
  calm enough to scan.
- **Empty state**: an icon tile, one sentence, one button. Centred in its
  card, not the page.
- **Toast**: white pill, soft shadow, icon + one line, bottom-centre.

## Shell

- Light rail the same colour as the page (no border, no dark fill): app
  icon + org name, a full-width "New envelope" primary pill, nav items as
  rounded pills with one white sliding active pill, account at the bottom.
- Phone: simple top bar (icon + title) and a **floating bottom tab bar**
  (white pill, inset 12px, soft shadow) with a centred violet + button.

## Rules a check can enforce

- No imports of `@/components/brand/{sign-lines,sticker,crop-marks,microtext}`
  or `@/components/ui/{stamp,starburst,plate-label,ledger}` outside the
  allowed moments above.
- No `uppercase` + `font-mono` together in page UI.
- No `print-shadow*`, `ink-edge`, `ledger-rule`, `paper-grain` classes.
- No border on cards (`Sheet`/`Card` default is borderless).
