# Motion system

Every animation answers three questions first: should it animate at all
(how often is it seen?), what is it for (spatial continuity, state,
feedback, explanation), and what is the curve and duration from the table.

## Curves (`--ease-*` in globals.css)

| Token                | Curve                          | Use                                                                                |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| `--ease-out`         | `cubic-bezier(.22,1,.36,1)`    | Default. Anything arriving, opening, settling.                                     |
| `--ease-spring`      | `cubic-bezier(.24,1.34,.38,1)` | Small things that may overshoot once: chips, toggles, the nav pill, press release. |
| `--ease-soft-spring` | `cubic-bezier(.3,1.12,.4,1)`   | Panels and trays that settle with barely a bounce.                                 |
| `--ease-pop`         | `cubic-bezier(.34,1.56,.64,1)` | Tiny pops: a checkbox tick, a field count badge.                                   |
| `--ease-in-out`      | `cubic-bezier(.65,0,.2,1)`     | On-screen moves and morphs.                                                        |
| `--ease-exit`        | `cubic-bezier(.4,0,1,1)`       | Exits only, about 60% of the entrance duration.                                    |
| `--ease-drawer`      | `cubic-bezier(.32,.72,0,1)`    | Sheets and phone trays.                                                            |

Never `ease-in` on an entrance, never bare `ease`, never `transition: all`.

## Durations (`--dur-*`)

| Token         | ms  | Use                                                |
| ------------- | --- | -------------------------------------------------- |
| `--dur-press` | 120 | Press down, colour on hover.                       |
| `--dur-hover` | 160 | Hover, toggles.                                    |
| `--dur-move`  | 220 | Anything moving position.                          |
| `--dur-open`  | 260 | Menus, popovers, page entrance.                    |
| `--dur-panel` | 320 | Panels and inspectors resizing.                    |
| `--dur-morph` | 420 | One-object morphs (button to tray, row to detail). |

## Rules

- **Press**: `scale(.97)` on buttons, `.985` on large cards. Every pressable thing.
- **Enter**: from `opacity 0`, `translateY(6px)`, `blur(2px)`, never `scale(0)`.
- **Popovers** scale from their trigger (`--radix-*-transform-origin`); dialogs stay centred.
- **Stagger**: 40ms per item, total under 250ms, never blocks input.
- **Hover** only under `@media (hover: hover) and (pointer: fine)`.
- **Keyboard-initiated** (shortcuts, command menu, Escape): no animation.
- **Text morphs** for labels that change meaning (Send to Confirm, Sign to Signed): shared letters stay, the rest blurs across.
- **Numbers** that change use tabular figures and roll only the changed columns.
- **Drag**: the thing under the pointer is rigid and tracks exactly; snapping guides and neighbours have mass.
- **Reduced motion**: keep state changes and opacity, drop travel. Today a global rule caps every duration at 1ms; replace it with per-component reduced variants as each component is rebuilt.

## Delight map (Delight-Impact curve)

| Moment                            | Frequency                     | Treatment                                                                                         |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Field placement, dashboard, lists | many times a day              | Crisp: press, hover wash, no flourish.                                                            |
| Sending an envelope               | daily                         | The Send button morphs into the confirmation tray; on send, the envelope card flies to Documents. |
| Signing                           | once per document, per signer | The yellow flag guides from field to field; the signature writes on; Finish morphs to Signed.     |
| Document sealed                   | rare                          | The seal stamps down with a single settle, the guilloche draws on once.                           |
| Verify passes                     | rare                          | The digest microtext resolves into the matching hash, then the seal.                              |
| First setup complete              | once                          | The plate assembles, the rosette draws on.                                                        |

## Review checklist (run on every screen)

- [ ] Every animation has a stated purpose and a frequency check.
- [ ] Curves and durations come from the tokens.
- [ ] Exits faster than entrances.
- [ ] Popovers origin-aware; dialogs centred.
- [ ] Press feedback on every pressable thing.
- [ ] Hover gated to fine pointers.
- [ ] Full state matrix designed.
- [ ] Works at 375, 768, 1440; keyboard only; 200% zoom; reduced motion.
- [ ] No `will-change` left on, no permanent rAF, no layout read per frame.
