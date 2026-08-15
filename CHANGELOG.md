# Changelog

All notable changes to BECOME A CHEF are documented here.

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
