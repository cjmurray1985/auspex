# Preordain — Brand Guide

**Direction: "Foreseen — The Pool of Knowledge"** (approved at Gate 2, Sprint 2).

Preordain is the **platform**; *Draft Academy* is its first **experience**. This guide
defines the identity all experiences share. It is the source of truth for the component
reskin (PRE-32), whimsy (PRE-33), typography (PRE-31), and the app shell (PRE-29).

## The seed
One physical metaphor drives every surface (the Hearthstone "seed" principle): **the
seer's scrying chamber — the Pool of Knowledge.** It ties the name → the *Preordain* card
(`{U}` "Scry 2, then draw a card") → the product. The card's own flavor is our thesis:

> "Raw power wins battles, but those who choose the shape of the battlefield win the war."
> — *The Pool of Knowledge*

Choosing the shape of the battlefield = making the right pick = what the coach teaches.

## Identity
- **Wordmark:** `PREORDAIN` in an engraved display face, with a **scrying-eye sigil** above.
- **Experience lockup:** `DRAFT ACADEMY` set smaller beneath the platform wordmark.
- **Motif:** the scrying eye / the glowing pool. Foresight is the through-line.
- **Voice:** the honest seer-coach — precise, evidence-backed, encouraging, never hype.

## Color (with roles — do not repurpose)
| Token | Hex | Role |
|---|---|---|
| `--pk-obsidian` | `#0a0e1a` | App canvas (deepest) |
| `--pk-stone` | `#131a2e` | Chamber walls / base panels |
| `--pk-panel` | `#1b2440` | Raised skeuomorphic panels |
| `--pk-edge` | `#2c3860` | Bevels / rune-etched borders |
| `--pk-foresight` | `#4db2ff` | **Insight / focus / primary CTA only** |
| `--pk-foresight-glow` | `#6cc6ff` | Glow/hover state of foresight blue |
| `--pk-arcane-deep` | `#1e5fae` | Foresight gradient shadow |
| `--pk-gold` | `#d4af6a` | **Rank / milestone / earned celebration ONLY** |
| `--pk-gold-bright` | `#f0cd8a` | Foil highlight on milestones |
| `--pk-text` | `#e8ecf5` | Primary text |
| `--pk-text-dim` | `#98a2c0` | Secondary text |
| `--pk-success` | `#5fd39a` | Positive grade/state |
| `--pk-danger` | `#e5716b` | Misplay/negative |

**Role discipline:** foresight-blue is reserved for insight/focus/CTA; **gold is milestone-only**
(never general chrome — that keeps celebration "earned," per the balanced-whimsy choice).
Blue is Preordain's mana color — on-brand and card-accurate.

## Typography
- **Display (titles/headings ONLY):** an engraved, ornate-but-legible face — **Cinzel**
  (open-license; Roman-engraved capitals = fantasy authority, legible). Moderate
  ornamentation only.
- **Body / data:** a clean humanist sans, comfortably sized. Data (ratings, curves,
  stats) stays in the sans for clarity.
- **Readability (fixes Sprint-1 feedback):** raise the base to **17px** and use a
  coherent scale; generous line-height on prose; WCAG AA contrast on all text.

> ⚠️ **IP:** Do **not** use **Beleren** (Wizards' typeface) for Preordain's own chrome —
> it's WOTC IP. Beleren/MTG assets belong only to *card content*, never our brand.

## Surfaces & skeuomorphism
- Forged dark-iron / tarnished-silver **rune-etched frames**; beveled panels with **inner
  glow** and subtle stone/arcane texture (never behind long body text — legibility first).
- **Gem/mana sockets** for stat chips; tactile depth (the app feels like objects, not flat
  cards). MTG card art stays as content *inside* our frames.

## Motion (balanced whimsy — reduced-motion safe)
- Panels open like tomes; the **pool ripples** on a new pack; a **"scry-reveal" shimmer**
  divines the grade; a **gold-foil surge** on rank-up / personal best. All gated by
  `prefers-reduced-motion` (see `src/fx/reducedMotion.ts`).

## Reference lock
- **Primary:** Hearthstone "seed" craft (one physical metaphor → everything).
- **Preserve:** obsidian canvas, foresight-blue glow, forged/rune skeuomorphic frames,
  scrying-eye sigil, tactile depth.
- **Borrow:** Skyrim's diegetic legibility (ornate titles, clean body); card-UI gem sockets.
- **Reject:** flat SaaS cards, default indigo gradients, Inter-everywhere, modern-minimal
  flatness, and any WOTC chrome/marks.

## Decision ledger
| Decision | Source | Why |
|---|---|---|
| Scrying-pool "seed" | Preordain card + Pool of Knowledge flavor | Ties name → card → product |
| Blue foresight accent | Preordain is `{U}` | On-brand, ownable |
| Skeuomorphic forged/rune frames | Hearthstone seed + fantasy card-UI kits | Exec: game-UI + skeuomorphism |
| Ornate titles + clean body | Skyrim legibility guidance | Fantasy feel + readability |
| Gold = milestone-only | reference role-discipline | "Earned" balanced whimsy |
| Cinzel display, not Beleren | IP guardrail | Own our chrome; respect WOTC IP |

A visual concept mockup of the menu ("Seer Profile / Pool / Enter Draft") was approved as
the mood target; production chrome is original (no WOTC marks).
