# BodyVerse – Explore Your Amazing Body!

Interactive 3D human anatomy for learners aged 1–18, from toddlers to Class 11–12
BiPC / NEET students. Next.js (App Router, TypeScript strict) · React Three Fiber ·
next-intl · Zustand · Tailwind CSS + shadcn/ui.

## Requirements

- Node.js ≥ 20.9 (`.nvmrc` pins 22 → run `nvm use`)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:3000 (redirects to `/en`) |
| `npm run build` / `npm start` | Production build (SSG) and server |
| `npm run build:export` | Fully static site in `out/` for any static host (schools) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc --noEmit` |
| `npm run models` | Rebuild the 3D anatomy GLBs from BodyParts3D (downloads ~750 MB of STL into `.cache/` on first run) |

## 3D anatomy models

The models are real human anatomy from **BodyParts3D** (© The Database Center
for Life Science, **CC BY-SA 2.1 JP**). `scripts/build-models.mjs` converts,
simplifies and meshopt-compresses them into five lazily loaded files in
`public/models/` (about 4.5 MB in total: skin, skeleton, muscles, organs,
circulatory) and writes `src/generated/model-index.json`. Which structures go
into which named node is set in `scripts/anatomy-manifest.mjs`. The derived
models keep the CC BY-SA licence (see `public/models/ATTRIBUTION.txt`).
Reproductive structures are excluded, and the skin is shown wearing swim shorts.

## Routes

`/[locale]` (age picker) · `/[locale]/explore` · `/[locale]/explore/[system]` (skeletal, muscular,
circulatory, nervous, respiratory, digestive, urinary, sensory, immune, endocrine) ·
`/[locale]/explore/part/[id]` · `/[locale]/games` (Find It!, Build a Skeleton, Body Quiz) ·
`/[locale]/stickers`, all pre-rendered at build time. The games and sticker book are for
the three kids modes; BiPC mode only shows the explorer.

Explorer levels: whole body → layers/systems → organ close-up with cross-section →
tissue view → cell view (tissue and cell scenes are simplified procedural models;
their text lives in `content/micro/`). The spinal cord and nerves are schematic
tubes generated from bone landmarks, because BodyParts3D v3 has no nerve meshes.

## Configuration

- `NEXT_PUBLIC_SITE_NAME` – product name (default `BodyVerse`)
- `NEXT_PUBLIC_SITE_URL` – canonical URL for metadata, sitemap and robots

## Content

All learning content lives in `/content` as JSON (never in components).
`src/lib/parts.ts` validates it at load time: each mode listed in
`visibleInModes` must have content, every `meshName` must exist in the model
index, and reproductive parts can only be BiPC.

Kids features: `content/stickers.json` (sticker rules), `content/facts.json`
(fact of the day), `content/quiz/kids.json` (quiz levels), `content/games/find-it.json`
(targets per mode) and `content/journeys/` (guided tours). Sound effects are made
with the Web Audio API, so there are no audio files, and they follow the sound toggle.

## Privacy

No accounts, ads, tracking or network calls. Settings and sticker progress are
stored in `localStorage` on the device only.

## Project setup (Phase 1)

```bash
npx create-next-app@latest bodyverse --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
```
