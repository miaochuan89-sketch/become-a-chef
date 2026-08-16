# BECOME A CHEF

An AI-assisted cooking companion that turns the ingredients already at home into practical meal ideas. The product is designed around a common daily problem: deciding what to cook without buying a completely new set of groceries.

**Current version:** `1.2.0`  
**Live demo:** [jinwan-chisha.miaochuan89.chatgpt.site](https://jinwan-chisha.miaochuan89.chatgpt.site/)

## Product highlights

- Accepts free-form ingredients, including unusual but valid food combinations.
- Generates three recipes based on available time and cooking goal, using standard household portions.
- Retries transient failures across two production AI models, then ranks a curated library of familiar pairings instead of inventing unusual combinations.
- Clearly separates required ingredients from optional flavor upgrades.
- Reveals an actionable shopping list directly below the selected dish.
- Supports copying the list and moving purchased ingredients into the saved pantry.
- Includes an account-free Chef's Table for photo posts, likes, and named comments.
- Keeps Recipe Ideas and Chef's Table visible in a persistent two-tab page directory.
- Provides step-by-step cooking mode with practical substitutions and safety notes.
- Saves the pantry locally in the browser; no account is required.
- Falls back to recipes built from the visitor's current ingredients if the AI service is unavailable.

## Recommendation flow

1. The user adds ingredients to the pantry.
2. The interface sends a sanitized request to the server-side recipe endpoint.
3. The endpoint asks Groq-hosted production models for structured recipe data and follows provider retry timing for temporary failures.
4. If every AI route is unavailable, the endpoint ranks established recipes by pantry match and never force-combines arbitrary ingredients.
5. The user chooses one recipe, then receives a dish-specific preparation list and cooking steps.

The API key is used only on the server and is never sent to the browser.

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

`pnpm test` creates a production build and verifies the rendered product shell, input validation, and safe behavior when AI credentials are unavailable.

## Project structure

```text
app/
  api/recommend/route.ts  Server-side AI recommendation endpoint
  globals.css            Responsive visual system
  layout.tsx             Metadata and root layout
  page.tsx               Pantry, recipe, shopping, and cooking experience
public/                   Static brand assets
tests/                    Product and API behavior checks
worker/                   Cloudflare Worker entry point
```

## Privacy and security

- `.env.local` and all `.env*` files are ignored, except the blank `.env.example` template.
- Requests are length-limited and normalized before reaching the AI provider.
- Basic per-IP request limiting protects the public endpoint.
- Pantry preferences are stored only in the visitor's browser.
- No passwords, personal profiles, or payment data are collected.

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
