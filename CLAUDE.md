# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

End-to-end test suite for live Wikipedia (`https://www.wikipedia.org/`) built with Playwright + TypeScript, using the Page Object Model. Tests run against the real production site — there is no mocked backend or local fixture server.

## Commands

```bash
# Install deps and browsers (first time)
npm install
npx playwright install

# Run all tests
npx playwright test

# Run a single test file
npx playwright test tests/visual.spec.ts

# Run a single test by name
npx playwright test -g "Search for a term"

# Headed / debug
npx playwright test --headed
npx playwright test --debug

# Update visual baselines (only after confirming the diff is an intentional UI change)
npx playwright test --update-snapshots

# Inspect the last run (opens HTML report with visual diffs, traces)
npx playwright show-report
```

There is no separate lint, typecheck, or build script defined in `package.json` — TypeScript is executed directly via Playwright's built-in transform (`tsconfig.json` has no `build`/`emit` usage). There is no test runner other than Playwright itself (no Jest/Vitest).

## Environment

Config is loaded from `.env` (gitignored) via `dotenv` in `playwright.config.ts`, read before the config object is built:

- `WIKIPEDIA_USERNAME` / `WIKIPEDIA_PASSWORD` — required only for the "Valid login" test in `tests/login.spec.ts`; that test self-skips if unset.
- `GROQ_API_KEY` — required for the self-healing locator pipeline (`tests/self-healing-login.spec.ts`); healing calls fail without it.

## Architecture

**Page Object Model** (`pages/`): each class wraps a Page/Locator set for one logical page/component — `HomePage`, `LoginPage`, `LanguagePage`, `ArticlePage`. Tests should drive the site through these objects rather than inlining raw locators, matching the existing pattern.

**Self-healing locators** (`self-healing/`): an experimental pipeline that lets tests survive selector breakage by asking an LLM (Groq, `llama-3.1-8b-instant`) to find a replacement at runtime. `healedLocator(page, selector)` in `healedLocator.ts` is the only entry point tests should import — it replaces `page.locator()` calls that need this resilience:

1. Check `.self-heal-cache.json` (gitignored, repo root) for a previously healed mapping.
2. Try the original selector with a 3s probe (`isVisibleQuick`).
3. On failure, extract a trimmed DOM snapshot of interactive elements (`domSnapshot.ts`, capped at 60 elements) and send it with the broken selector to Groq (`llmHealer.ts`).
4. Accept the suggestion only if confidence ≥ `CONFIDENCE_THRESHOLD` (0.75 in `healedLocator.ts`) and the resulting locator is actually visible.
5. Persist accepted mappings to `.self-heal-cache.json` (`healCache.ts`) so subsequent runs skip the LLM call entirely.

This pipeline is only wired into `tests/self-healing-login.spec.ts`, which deliberately uses broken selectors (e.g. `#wpNameXYZ` instead of the real `#wpName1`) to exercise the healing flow. When touching this pipeline, changes to the confidence threshold or prompt in `llmHealer.ts` directly affect whether tests silently interact with the wrong element — treat threshold changes carefully.

**Visual regression** (`tests/visual.spec.ts`): uses Playwright's `toHaveScreenshot` with WebP snapshots (`playwright.config.ts` sets `type: 'webp'`, `maxDiffPixelRatio: 0.02`, `retryStrategy: 'bounce'` globally). Dynamic homepage sections (`#mp-tfa`, `#mp-itn`, `#mp-otd`, `#mp-tfp`, `#mp-dyk`, `#mp-tfl`) are masked in the full-page screenshot since their content changes daily on the real site. Snapshot filenames encode browser + OS (e.g. `homepage-full-chromium-darwin.webp`) — baselines generated on macOS will not match Linux CI renders, so cross-platform baselines should be generated in the environment they'll be compared in (see CI workflow).

**CI** (`.github/workflows/playwright.yml`): runs on Ubuntu via `npx playwright test` on push/PR to `main`/`master`, uploads the `playwright-report/` artifact. Only the `chromium` project is configured (see `playwright.config.ts`); no other browsers are installed or run.
