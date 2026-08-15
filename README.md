# BECOME A CHEF

An AI-assisted cooking companion that turns the ingredients already at home into practical meal ideas. The product is designed around a common daily problem: deciding what to cook without buying a completely new set of groceries.

**Current version:** `1.0.0`  
**Live demo:** [jinwan-chisha.miaochuan89.chatgpt.site](https://jinwan-chisha.miaochuan89.chatgpt.site/)

## Product highlights

- Accepts free-form ingredients, including unusual but valid food combinations.
- Generates three recipes based on available time, serving count, and cooking goal.
- Uses a primary and fallback AI model for more reliable recipe generation.
- Clearly separates required ingredients from optional flavor upgrades.
- Creates a shopping list only after the user commits to one dish.
- Provides step-by-step cooking mode with practical substitutions and safety notes.
- Saves the pantry locally in the browser; no account is required.
- Falls back to a curated recipe library if the AI service is unavailable.

## Recommendation flow

1. The user adds ingredients to the pantry.
2. The interface sends a sanitized request to the server-side recipe endpoint.
3. The endpoint asks Groq-hosted models for structured recipe data and retries with a second model if needed.
4. The user chooses one recipe, then receives a dish-specific preparation list and cooking steps.

The API key is used only on the server and is never sent to the browser.

## Technology

- TypeScript
- React 19
- Next.js-compatible App Router powered by [vinext](https://github.com/cloudflare/vinext)
- Vite and Cloudflare Workers
- Groq Chat Completions API with structured JSON output
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

## Version 1.0.0

- Public, account-free cooking experience
- AI-generated recipes with automatic model fallback
- Pantry-aware ranking and graceful offline fallback
- Dish-specific shopping list
- Guided cooking mode
- Responsive orange chef-inspired brand system
