# BECOME A CHEF

An AI-assisted cooking companion that turns the ingredients already at home into practical meal ideas. The product is designed around a common daily problem: deciding what to cook without buying a completely new set of groceries.

**Current version:** `1.3.1`
**Latest maintenance update:** October 4, 2026 — Chef's Table history pagination
**Live demo:** [jinwan-chisha.miaochuan89.chatgpt.site](https://jinwan-chisha.miaochuan89.chatgpt.site/)

## Design approach

The experience starts with what the visitor already has, rather than asking them to choose a dish first. A continuous flow connects ingredient entry, recipe selection, missing-item preparation, and guided cooking. Chef's Table lets visitors share the result without creating an account.

Recipe generation combines AI suggestions with explicit validation and curated fallback recipes. The goal is to make the next cooking decision practical: show familiar dishes, distinguish essential ingredients from optional upgrades, and explain what to do next.

## Product highlights

- Accepts free-form ingredients, including unusual but valid food combinations.
- Starts with an empty ingredient field and offers twelve optional one-tap common ingredients.
- Generates three recipes based on available time and cooking goal, using standard household portions.
- Tries two production AI models, validates every result, then fills gaps only with familiar pantry-matched recipes.
- Clearly separates required ingredients from optional flavor upgrades.
- Reveals an actionable shopping list directly below the selected dish.
- Supports copying the list and moving purchased ingredients into the saved pantry.
- Includes an account-free Chef's Table for photo posts, likes, and named comments.
- Shows the total number of shared dishes and lets visitors load older posts beyond the first 24.
- Preserves the full composition of both portrait and landscape dish photos.
- Keeps Recipe Ideas and Chef's Table visible in a persistent two-tab page directory.
- Provides step-by-step cooking mode with practical substitutions and safety notes.
- Saves the pantry locally in the browser; no account is required.
- Falls back to recipes built from the visitor's current ingredients if the AI service is unavailable.

## Recommendation flow

1. The user adds ingredients to the pantry.
2. The interface sends a sanitized request to the server-side recipe endpoint.
3. The endpoint asks Groq-hosted production models for structured recipe data.
4. Every AI recipe passes deterministic checks for pantry coverage, exact core quantities, timing, structure, and incompatible ingredient groups.
5. Rejected or missing AI recipes are replaced only by established recipes with a real pantry match; unrelated dishes are never added just to reach three results.
6. The user chooses one recipe, then receives a dish-specific preparation list and cooking steps.

The API key is used only on the server and is never sent to the browser.

## Chef's Table and saved data

1. Choose a JPG, PNG, or WebP dish photo up to 5 MB, enter a name and a one-sentence caption, then publish.
2. The shared feed displays the newest 24 posts first. Select **加载更早的作品** (Load older works) to continue through the history.
3. Each loaded post retains its photo, likes, and comments. Failed loads show a retry action while keeping already displayed posts.

The 24-post page size is a display limit, not a storage limit. Post metadata and comments are stored in Cloudflare D1; photo files are stored in Cloudflare R2. Pantry ingredients are saved separately in the visitor's browser and are specific to that browser.

## Technology

- TypeScript
- React 19
- Next.js-compatible App Router powered by [vinext](https://github.com/cloudflare/vinext)
- Vite and Cloudflare Workers
- Groq Chat Completions API with structured JSON output
- Cloudflare D1 for posts, likes, and comments
- Cloudflare R2 for dish photo storage
- Responsive, dependency-light CSS
- Node.js test runner for server-rendering and API behavior

## Run locally

### Requirements

- Node.js `>=22.13.0`
- A Groq API key for live AI recommendations

### Setup

```bash
pnpm install
copy .env.example .env.local
```

Add your key to `.env.local`:

```env
GROQ_API_KEY=your_key_here
```

Then start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
pnpm lint
pnpm test
```

`pnpm test` creates a production build and runs checks for the rendered product shell, input validation, and safe behavior when AI credentials are unavailable. The community pagination regression test uses an in-memory SQLite database to verify history beyond 24 posts, matching timestamps, new posts arriving between pages, comments on older posts, invalid cursors, and storage errors.

## Project structure

```text
app/
  api/recommend/route.ts  Server-side AI recommendation endpoint
  api/recommend/fallback.ts  Curated pantry-matched fallback recipes
  api/posts/             Photo publishing, history, likes, and comments
  community-feed.tsx     Chef's Table interface and older-post loading
  globals.css            Responsive visual system
  layout.tsx             Metadata and root layout
  page.tsx               Pantry, recipe, shopping, and cooking experience
public/                   Static brand assets
db/                       D1 and R2 access helpers
drizzle/                  Database migration SQL
tests/                    Product and API behavior checks
worker/                   Cloudflare Worker entry point
```

## Privacy and security

- `.env.local` and all `.env*` files are ignored, except the blank `.env.example` template.
- Requests are length-limited and normalized before reaching the AI provider.
- Basic per-IP request limiting protects the public endpoint.
- Pantry preferences are stored only in the visitor's browser.
- No passwords, personal profiles, or payment data are collected.

## Latest maintenance update — October 4, 2026

- Fixed older Chef's Table posts becoming inaccessible after the latest 24 entries.
- Added cursor-based history loading, total dish counts, and lazy loading for feed photos.
- Added clear loading and retry states instead of displaying a failed request as an empty feed.
- Verified all 45 posts present at the time of deployment could be loaded across two pages, including an August 16 photo that remained accessible.
- Passed all 10 automated checks and completed a production build before publishing.

See [CHANGELOG.md](CHANGELOG.md) for the full release history. This maintenance update retains the existing `1.3.1` package version.

## Version 1.3.1

- Removed the experimental email-notification flow from Chef's Table.
- Tightened AI recipe validation to allow at most one missing core ingredient.
- Rejects recipes that mix multiple main proteins or staple systems without a reliable cooking basis.
- Verifies that every core ingredient is actually used in the cooking steps.
- Aligns AI ingredient names with the visitor's own pantry wording so match and shopping-list labels stay accurate.

## Version 1.2.3

- Strengthened pantry coverage and exact-quantity checks for every AI recipe.
- Added common Chinese and English ingredient alias matching.
- Replaces rejected AI results only with genuinely pantry-matched classic recipes.
- Prevents unrelated fallback dishes from being added just to fill the result count.

## Version 1.2.2

- Removed the five prefilled ingredients so every cooking session starts clean.
- Added twelve common ingredient shortcuts below the input.
- Migrates the old untouched default pantry to an empty state without overwriting a customized pantry.

## Version 1.2.1

- Displays portrait and landscape uploads without cropping the dish.
- Added server-side plausibility validation before AI recipes reach the interface.
- Reduced AI randomness and strengthened familiar dish-template rules.
- Expanded pantry-anchored fallback choices for eggs, chicken, tofu, and fruit.

## Version 1.2.0

- Added Chef's Table photo publishing with a name and one-sentence caption.
- Added anonymous likes and named comments without an account system.
- Added durable D1 and R2 storage for the shared community feed.
- Removed the decorative `B` avatar from the header.
- Added a persistent two-entry directory for Recipe Ideas and Chef's Table.
- Added production-model retries and pantry-aware fallback recipes.
- Removed the serving-count control and standardized recipes to practical household portions.
- Replaced arbitrary fallback combinations with a curated classic-pairing engine.

## Version 1.1.1

- Added a subtle English developer credit linked to Miaochuan's GitHub profile.

## Version 1.1.0

- Unified the pantry input, recipe choice, shopping list, and cooking steps into one page.
- Removed duplicated pantry and empty preparation-list navigation.
- Added list copying and one-click purchased-item synchronization.

## Version 1.0.0

- Public, account-free cooking experience
- AI-generated recipes with automatic model fallback
- Pantry-aware ranking and graceful offline fallback
- Dish-specific shopping list
- Guided cooking mode
- Responsive orange chef-inspired brand system
