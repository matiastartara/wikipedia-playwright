---
name: test-scaffolder
description: Scaffold a new Playwright Page Object (pages/*.ts) plus a matching spec (tests/*.spec.ts) for a Wikipedia page/feature with no coverage yet, following this repo's exact conventions (constructor-only locators, no assertions in page objects, "Wikipedia - <Feature> test" describe blocks, LanguagePage->English entry flow, env-var credential skip pattern). Use whenever the user asks to add/create/scaffold a new E2E test, page object, or coverage for something not yet in pages/ or tests/. Complements playwright-qa-expert (general best practices) with this repo's concrete file templates.
---

# Test Scaffolder

Generates a new Page Object + spec file that are indistinguishable from
this repo's hand-written ones — not generic Playwright output.

## Relationship to `playwright-qa-expert`

That skill has the *why* (locator priority order, web-first assertions,
POM rules, flakiness avoidance). This skill has the *what to type* for
this specific repo — exact imports, field ordering, indentation, describe
titles. Consult both; this one wins on repo-specific formatting, that one
wins on general Playwright reasoning.

## Workflow

1. **Clarify the target.** Confirm: the feature/page name; how a user
   reaches it from Wikipedia's home page (search term / nav click / direct
   URL); which elements matter (inputs, buttons, text to assert on);
   whether it needs authenticated state.
2. **Check for reuse first.** Look in `pages/` for an existing Page Object
   that already covers part of the flow (`HomePage`, `LanguagePage`,
   `ArticlePage`, `LoginPage`). Every existing spec composes these rather
   than duplicating navigation — only add a new Page Object for elements
   not already exposed.
3. **Resolve real selectors against live markup before writing locators.**
   This repo has no mocked backend (see root `CLAUDE.md`) — Wikipedia's
   markup is real production HTML. Use
   `npx playwright codegen https://www.wikipedia.org/wiki/<Page>` and
   upgrade any raw CSS it emits to role/label locators per
   `playwright-qa-expert`'s priority order, or ask the user for the
   relevant HTML fragment if browsing isn't available. Never fabricate a
   role, label, or `data-testid` that wasn't actually observed.
4. **Write `pages/<Name>Page.ts`** from the Page Object template below.
5. **Write `tests/<name>.spec.ts`** from the spec template below, starting
   from `LanguagePage.goTo()` + `selectLanguage('English')` unless the
   user explicitly wants direct-URL navigation.
6. **Insert the env-credential skip block verbatim** (below) only if the
   scenario needs `WIKIPEDIA_USERNAME`/`WIKIPEDIA_PASSWORD`.
7. **Remind the user to run the new test once** against the live site
   before trusting it:
   `npx playwright test tests/<name>.spec.ts --headed` (or
   `-g "<test name>"`) — selectors chosen in step 3 can still drift from
   what's actually rendered.

## Page Object template

```ts
import { Page, Locator } from '@playwright/test';

export class <Name>Page {
    readonly page: Page;
    readonly <elementName>: Locator;

    constructor(page: Page) {
        this.page = page;
        this.<elementName> = page.getByRole('<role>', { name: '<accessible name>' });
        // fall back to page.locator('<css selector>') only when live markup
        // has no accessible role/label (e.g. #mp-tfa-style block IDs)
    }

    async <verbAction>(<params>) {
        await this.<elementName>.<action>(<args>);
    }

    async get<Something>(): Promise<<ReturnType>> {
        return await this.<elementName>.<innerText|textContent>();
    }
}
```

- Never call `expect(...)` in this file. Return a value/`Locator` for the
  test to assert on, or `throw new Error('<message>')` for a hard
  precondition the caller can't recover from (see
  `HomePage.selectElementFromList`).
- Omit the return type on async methods with no meaningful return value;
  annotate `Promise<T>` when returning a value.
- Constructor takes only `page: Page` — never add other params.
- 4-space indent, single quotes, semicolons, no trailing whitespace.
- Class name = file name, PascalCase, always suffixed `Page`.

## Spec template

```ts
import { test, expect } from '@playwright/test';
import { LanguagePage } from '../pages/LanguagePage';
import { HomePage } from '../pages/HomePage';
import { <Name>Page } from '../pages/<Name>Page';

test.describe('Wikipedia - <Feature> test', () => {
    test('<Scenario, capitalized, describes the behavior under test>', async ({ page }) => {
        const languagePage = new LanguagePage(page);
        const homePage = new HomePage(page);
        const <name>Page = new <Name>Page(page);

        await languagePage.goTo();
        await languagePage.selectLanguage('English');
        // ...drive the flow through page object methods...

        await expect(<locator or page>).<matcher>(<expected>);
        // or: expect(<plain value>).<matcher>(<expected>);
    });
});
```

- `test.describe` title is always the literal `Wikipedia - ` prefix +
  Title Case feature name + `test` (or `tests` if the file covers multiple
  unrelated scenarios, matching `visual.spec.ts`).
- Instantiate Page Objects inline at the top of each `test()` body — no
  fixtures, no `test.step()`. Use `test.beforeEach` only for a navigation
  step shared across multiple tests in one file (per `visual.spec.ts`'s
  pattern) — even then, Page Objects used *inside* a test body are still
  instantiated per-test, not in the hook.
- `console.log(...)` right before an assertion is fine for debug
  visibility but optional.
- 4-space indent — a deliberate choice over the 2-space seen in some
  existing specs, to match the majority/foundational `pages/*.ts` style.

## Env-credential skip pattern

Insert verbatim at the top of any test body that needs logged-in state:

```ts
        const wikipediaUsername = process.env.WIKIPEDIA_USERNAME;
        const wikipediaPassword = process.env.WIKIPEDIA_PASSWORD;

        if (!wikipediaUsername || !wikipediaPassword) {
            test.skip(true, 'WIKIPEDIA_USERNAME or WIKIPEDIA_PASSWORD not set in .env');
        }
```

Use `wikipediaUsername!`/`wikipediaPassword!` on later usages — `test.skip`
doesn't narrow TypeScript's type (see `tests/login.spec.ts`).

## Repo inconsistencies — do not copy

Existing files aren't a perfectly clean reference. When reading them for
patterns, correct these rather than propagating them into new files:

- `pages/ArticlePage.ts` imports `Page, Locator` from `'playwright/test'`
  instead of `'@playwright/test'` — always use `'@playwright/test'`.
- Import lines should end with a semicolon even where some existing files
  omit it.
- Indentation is inconsistent repo-wide (2-space in some specs, 4-space
  elsewhere) — always output 4-space in new files.
- `tests/self-healing-login.spec.ts` is an intentional, isolated
  experiment (raw `page.goto`/`page.click`, no Page Object, no `describe`
  wrapper) — never model a new spec on it unless explicitly asked to
  generate a self-healing test.

## Naming cheat sheet

- Page Object file/class: `<Name>Page.ts` → `export class <Name>Page`.
- Spec file: `<feature>.spec.ts`, kebab-case for multi-word features
  (e.g. `self-healing-login.spec.ts`).
- Describe title: `Wikipedia - <Feature> test`.
- Method naming: verb-first, user-intent phrasing — `login`, `search`,
  `goTo`, `selectLanguage`, `getErrorMessage`, `getArticleTitle`.

## Post-scaffold checklist

- [ ] Page Object has zero `expect(...)` calls.
- [ ] Import is from `@playwright/test`, not `playwright/test`.
- [ ] Locators chosen in role/label priority order; raw `page.locator`
      only where live markup was actually confirmed to have no accessible
      role.
- [ ] Spec instantiates Page Objects inline, no fixtures/`test.step`.
- [ ] `test.describe` title follows `Wikipedia - <Feature> test` format.
- [ ] Env-credential block included verbatim if the scenario needs auth.
- [ ] New spec run at least once against the live site to confirm
      selectors resolve.
