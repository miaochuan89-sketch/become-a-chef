# Changelog

All notable changes to BECOME A CHEF are documented here.

## 1.2.2 — 2026-08-15

### Changed

- New visitors now start with an empty ingredient field instead of five prefilled ingredients.
- Expanded the one-tap common ingredient suggestions from four visible options to twelve.
- Added a migration that clears only the untouched legacy default pantry while preserving customized saved ingredients.

## 1.2.1 — 2026-08-15

### Fixed

- Portrait dish photos now retain their complete composition in previews and community cards.
- Implausible AI recipes are rejected before they reach the interface.

### Improved

- Lowered generation randomness and required familiar cooking templates with pantry relevance.
- Expanded single-ingredient fallback options for common eggs, chicken, tofu, and fruit.

## 1.2.0 — 2026-08-15

### Added

- Account-free Chef's Table with one-photo dish posts.
- Required publisher name and one-sentence caption.
- Public likes and named comments.
- Durable D1 metadata and R2 image storage.
- Persistent bottom directory for Recipe Ideas and Chef's Table.

### Changed

- Removed the decorative `B` avatar and moved the main page destinations into the bottom directory.
- Added transient retry handling across production AI models.
- Replaced the generic busy error with three pantry-aware emergency recipes.
- Removed the low-value serving-count selector.
- Replaced arbitrary emergency combinations with ranked, established recipe pairings.
- Limited production generation to Groq's production GPT-OSS models and honored provider retry timing.

## 1.1.1 — 2026-08-15

### Added

- Subtle `Developed by Miaochuan` attribution linked to the developer's GitHub profile.

## 1.1.0 — 2026-08-15

### Changed

- Replaced the separate pantry and preparation-list pages with one continuous cooking flow.
- Renamed pantry language to focus on ingredients the user already has.
- Shows the shopping list immediately after a recipe is selected.

### Added

- Copyable, dish-specific shopping lists.
- One-click action to mark required purchases as available ingredients.
- Clearer empty and ready-to-cook states.

## 1.0.0 — 2026-08-15

### Added

- Free-form pantry input with locally saved ingredients.
- AI-generated recipe recommendations based on time, servings, and cooking goal.
- Automatic fallback between two Groq-hosted models.
- Curated local recipes when the AI service is unavailable.
- Dish-specific shopping list and guided cooking mode.
- Responsive orange visual identity and chef cloche branding.
- Public, account-free deployed experience.
- Production rendering and API safety tests.

### Improved

- Corrected structured-output settings for reasoning models.
- Added sanitized provider error handling and basic rate limiting.
- Removed unused starter authentication, database examples, and placeholder assets.
- Replaced starter documentation and tests with product-specific material.

### Security

- Kept AI credentials server-side and excluded local environment files from source control.
- Added bounded request input and checks for missing credentials.
