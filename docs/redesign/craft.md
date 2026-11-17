# Craft: the component bar

The calm direction (calm.md) decides _what_ is on a screen. This file
decides _how well each thing is made_. The reference the owner gave is a
folder component: a back plate, three cards and a translucent flap,
every layer with its own inner shadow and hairline stroke. At rest it
is quiet. On hover the cards rise a little, each on its own spring with a
staggered delay, and the flap tilts open. On click it opens fully. That
bar of physical, layered, spring-driven craft applies to every component
we ship. We don't use folders: our objects are documents, envelopes,
seals and signatures.

## What makes it premium (copy the qualities, not the folder)

1. **Real material layers.** Objects are built from layers (back, contents,
   front), each with its own fill, a 1px hairline stroke a shade darker or
   lighter, and an _inner_ shadow. There are no flat rectangles with a
   drop shadow.
2. **Physics, not timelines.** State changes use springs (stiffness about
   120–300, damping 13–30), not durations. Interruptible: hover out halfway
   and it settles back from where it is.
3. **Staggered siblings.** Parts of one object move on their own springs
   with small delays (0–0.12s), and the order flips between open and close.
4. **Three states, not two.** Rest (quiet, slightly alive), hover
   (anticipation), active (the full reveal). Each state is a designed pose.
5. **Depth through perspective.** `perspective` plus `rotateX`/`rotateY`
   with `transformOrigin` at the hinge, `preserve-3d`, and backface hidden.
   Translucent layers use a small backdrop blur, clipped to their real
   shape.
6. **Themeable by tokens.** Every colour comes from a small theme map built
   from our tokens, with light and dark variants and a size scale
   (sm 0.65 / md 1 / lg 1.35) that transforms one master geometry.
7. **Touch-correct.** `touch-action: manipulation`, no tap highlight, hover
   only with fine pointers, tap toggles the active state on touch.
8. **Honest to assistive tech.** The object is `aria-hidden` art inside a
   real button or link that carries the name. Reduced motion jumps to each
   pose (hydration-safe; see `src/components/ui/text-morph.tsx`).
9. **Performance.** Transform and opacity only. Backdrop blur only on small
   areas, `will-change` only while moving.

## Our signature objects (`src/components/objects/`)

| Object         | Rest                                   | Hover                              | Active                                                                 |
| -------------- | -------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Envelope       | closed, flap flush on the top edge     | flap tilts open, the letter rises  | letter out; on send it reverses, a seal presses on, the envelope lifts |
| Document stack | real first pages stacked, 2–4° offsets | pages fan out on staggered springs | pages spread like a hand of cards                                      |
| Paper sheet    | inner edge highlight, hairline, shadow | tilts 2–3° toward the pointer      | presses flat (`scale .98`)                                             |
| Seal           | pressed into the paper                 | —                                  | —                                                                      |

Every part of an object comes from one master geometry (width, height,
corner radius, hinge, centre), so edges align to the pixel at every size
and pose. Check zoomed 2x/4x screenshots of every pose in light and dark.

## Primitives get the same care

Buttons are layered (fill, inner top highlight, hairline, contact shadow)
and sink on a fast spring; inputs sit in an inner well with a spring focus
ring; segmented thumbs and tabs stretch toward their target; menus have a
highlight that slides between items; toasts stack with depth; avatars
spread on hover; status dots breathe once when the status changes. Use
`tactile` plus one `mat-*` class to give any control the same feel.

Restraint still rules: daily surfaces get subtle versions; the full reveal
is for moments the person causes (hover, press, send, complete).
