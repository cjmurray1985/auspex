# Auspex — Product Architecture (Platform & Experiences)

Approved at the Sprint 1 demo (Gate 2). This defines how the product is named and
structured so new experiences have a home.

## The model
**Auspex is the platform/brand.** It is the umbrella, the account, the progression,
and the chrome. Under it live discrete **experiences**, each with its own name, entry
point, and identity lockup.

```
Auspex (platform)
└── Draft Academy        ← the draft simulator + coach (today's app)
    (future)
    ├── Puzzles          ← single-pick / board-state problems
    ├── Training         ← guided lessons (chess.com "Lessons" model)
    ├── News             ← set/meta content
    ├── Arena Plugins    ← companion tools for live Arena
    └── (other TCGs)     ← the model is not MTG-only
```

## Naming & labeling rules
- **Platform chrome shows "Auspex"** — the top-level wordmark, account/profile
  ("Seer Profile"), progression ("Path of Foresight"), and global nav.
- **Each experience carries its own name.** Today's draft simulator is **Draft Academy**
  and is presented with a `AUSPEX / DRAFT ACADEMY` lockup (platform over experience).
- **The Draft Rating and account are platform-level** (shared across experiences), so a
  player's identity and progress persist as new experiences launch.
- New experiences slot into the platform nav (the concept mockup's Replays / Learn /
  Library / Decks / Shop rail is the illustrative target) without re-theming — they
  inherit the brand from `docs/BRAND.md`.

## Why
- Gives the retired "Draft Academy" name a real, correct home as a sub-brand.
- Lets Auspex grow beyond one mode (and beyond MTG) without a rename.
- Matches the chess.com pattern (Play / Puzzles / Lessons / News) the exec called out.

## Implications for this sprint
- **PRE-29** reflects this in the app shell: Auspex as platform wordmark, Draft
  Academy as the experience lockup on the home/menu.
- Future experiences are out of scope now; this doc reserves the architecture for them.
