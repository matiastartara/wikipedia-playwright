---
name: playwright-qa-expert
description: Official Playwright + TypeScript best practices for writing, reviewing, and debugging end-to-end tests — locator strategy, web-first assertions, test isolation, fixtures, avoiding flakiness, network mocking, and CI configuration. Use whenever writing a new test, reviewing test code, fixing a flaky test, or deciding how to locate/assert against an element in this repo.
---

# Playwright QA Automation Expert

Reference guide distilled from the official Playwright documentation
(playwright.dev). Apply this when writing, reviewing, or debugging any
`.spec.ts` file or Page Object in this repo. Project-specific architecture
(Page Object Model layout, self-healing locators, visual regression config)
is documented in `CLAUDE.md` — this skill covers the general engineering
practices that inform *how* that code should be written.

## 1. Locators — user-facing first, CSS/XPath last resort

Priority order, matching how a real user or assistive technology perceives
the page:

1. `getByRole` — the most resilient; mirrors accessibility tree (`button`,
   `link`, `heading`, `checkbox`, ...).
2. `getByLabel` — form fields associated with a `<label>`.
3. `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle`.
4. `getByTestId` — only when no stable user-facing attribute exists. Requires
   a `data-testid` the app under test actually renders.
5. CSS / XPath (`page.locator('#foo')`, `.filter()`, `nth()`) — last resort,
   for third-party markup you don't control (e.g. live Wikipedia's
   `#mp-tfa`-style IDs) or where no accessible role exists.

Rules of thumb:
- Never use auto-generated, brittle selectors (deep CSS chains, positional
  XPath) when a role/label/text locator would do.
- Chain and filter locators (`locator.filter({ hasText })`,
  `locator.and()`, `locator.or()`) instead of writing one giant CSS
  selector.
- Locators are lazy and auto-retrying — they don't query the DOM until an
  action/assertion runs, and every action retries until it succeeds or times
  out. Don't manually loop or poll around them.
- Never resolve a `Locator` to an `ElementHandle` and reuse it across
  steps — the underlying element can be re-rendered, and the handle goes
  stale. Re-query via the locator each time.

## 2. Assertions — always web-first, never manual polling

Use `expect(locator)...` matchers (`toBeVisible`, `toHaveText`,
`toHaveValue`, `toHaveCount`, `toHaveScreenshot`, ...). They auto-retry
until the condition holds or the timeout elapses — this is what makes
Playwright tests deterministic against an async UI.

- Never write `await page.waitForTimeout(ms)` to "wait for something to
  happen." If you're tempted to add a sleep, there's a missing assertion or
  wait condition instead (`waitFor`, `toBeVisible`, `waitForResponse`,
  `waitForURL`).
- Never assert on a plain value pulled out via `.textContent()` /
  `.innerText()` in an `if`/manual retry loop — assert on the locator
  directly so Playwright retries it.
- Use `expect.soft()` only when a failure shouldn't abort the rest of the
  test (e.g. checking several independent UI details in one test) — know
  that soft assertions still fail the test at the end.
- Prefer `.toHaveScreenshot()` / `.toMatchAriaSnapshot()` for visual/DOM
  structure checks over manual pixel or string diffing.

## 3. Test structure & isolation

- Each test must be fully independent: no test should rely on state left
  by another. Playwright runs tests in parallel by default and in
  arbitrary order.
- Use fixtures (`test.extend`) for setup/teardown instead of shared
  module-level state or `beforeAll` mutation of shared objects. A fresh
  `page` (and browser context) is created per test — don't fight that by
  caching pages across tests.
- Use `test.beforeEach` for per-test setup (navigation, auth) rather than
  duplicating it in every test body.
- Use `test.step()` to name logical phases of a test — it makes the HTML
  report and trace viewer readable and pinpoints exactly which step failed.
- One behavior per test. A test named "user can search and log in" that
  actually checks five unrelated things makes failures ambiguous and
  reruns expensive.
- Avoid conditional logic (`if (await x.isVisible())`) inside a test to
  branch behavior — it makes the test non-deterministic and hides which
  path actually ran. If the app genuinely has two valid states, write two
  tests.

## 4. Page Object Model conventions

This repo already follows POM (`pages/`) — keep new code consistent:

- A page object exposes **locators as readonly properties** (constructed
  once in the constructor) and **actions/queries as methods** — never raw
  selectors inlined in test files.
- Methods should read like user intent (`login(user, pass)`,
  `search(term)`), not low-level DOM steps.
- Page objects should not contain assertions. Assertions belong in the
  test (`expect(...)`); the page object returns locators/values for the
  test to assert on. Keeps the object reusable across tests with different
  expectations.
- Don't have a page object reach into another page object's internals —
  compose at the test level, or return a new page object from a navigation
  method (e.g. `goToLogin()` could return a `LoginPage`).

## 5. Avoiding flakiness

- Never hardcode waits/sleeps; rely on auto-waiting and explicit
  `waitForResponse`/`waitForURL`/`waitForLoadState` only when there's no
  UI signal to assert on instead.
- Mask or otherwise neutralize sections of the page whose content is
  non-deterministic (timestamps, live/rotating content, ads) rather than
  disabling the whole check — see `mask` usage and
  `freezeDynamicBlockHeights` pattern in `tests/visual.spec.ts` /
  `pages/HomePage.ts` for this repo's approach.
- Network calls to third parties (analytics, ads) that aren't part of what
  you're testing should be blocked or mocked via `page.route()` so their
  latency/flakiness doesn't leak into the test.
- Set explicit, generous but bounded timeouts at the assertion/action
  level rather than globally cranking the test timeout to "make flakiness
  go away."
- When a test is flaky, use `--trace on` and `npx playwright show-report`
  (or `show-trace`) to see exactly what the DOM/network looked like at
  failure time before changing the test — don't guess.

## 6. Network mocking

- `page.route(url, handler)` to intercept and mock/modify requests —
  fulfill with `route.fulfill()`, or observe with `route.continue()`.
- Use `page.waitForResponse()` when a test genuinely needs to wait on a
  specific network call's completion before asserting.
- Prefer mocking only the specific third-party/non-deterministic calls
  that would otherwise make the test flaky or slow — this repo intentionally
  tests against live Wikipedia with no mocked backend (see `CLAUDE.md`), so
  default to *not* mocking core site behavior; only mock what's explicitly
  called out as necessary (e.g. an external LLM call in the self-healing
  pipeline, not Wikipedia itself).

## 7. Debugging workflow

In priority order when a test fails or is being newly written:

1. `npx playwright test --ui` — UI mode: time-travel through actions, watch
   locators highlight live.
2. `npx playwright codegen <url>` — generate locators by recording
   interactions; use as a starting point, then upgrade to role-based
   locators if codegen emitted a CSS selector.
3. `npx playwright test --debug` — Playwright Inspector, step through.
4. `npx playwright show-report` — HTML report with screenshots, video,
   trace links for CI failures.
5. `npx playwright show-trace trace.zip` — full trace viewer (DOM
   snapshots, network, console) for a specific run/CI artifact.

## 8. CI & config best practices

- `retries` should be 0 (or low) locally, higher only in CI
  (`process.env.CI ? 2 : 0`) — retries in local dev mask real bugs.
- `workers`/parallelism: let Playwright parallelize across files by
  default; only serialize (`fullyParallel: false` / `workers: 1`) for
  suites with genuine shared-resource constraints, not as a flakiness
  band-aid.
- Pin browser versions via `npx playwright install` in CI so a browser
  auto-update doesn't silently shift visual baselines or timing.
- Snapshot/baseline files are OS+browser specific (already noted in
  `CLAUDE.md` for this repo) — generate baselines in the same environment
  CI will compare against, never assume a local macOS snapshot is valid on
  Linux CI.
- Keep `trace`/`video`/`screenshot` set to `on-first-retry` (or
  `retain-on-failure`) rather than `on` for every run — full artifacts on
  every passing test bloat CI storage for no benefit.

## 9. Linting / static hygiene

- Prefer the official `eslint-plugin-playwright` if ESLint is introduced to
  this repo — it catches exactly the anti-patterns above (missing
  `await`, `page.waitForTimeout`, conditional `expect`, etc.) automatically.
- TypeScript: keep locators typed as `Locator`, not `any`; keep page object
  constructors free of side effects beyond locator wiring (no navigation,
  no `await`, in a constructor — constructors can't be async).

## Quick review checklist

When reviewing or writing a test/page object, flag any of these:

- [ ] `page.waitForTimeout(...)` present → replace with a real wait/assertion.
- [ ] Raw CSS/XPath locator where a role/label/text/testid locator would
      work.
- [ ] Assertion on a value read out of the locator instead of on the
      locator itself (loses auto-retry).
- [ ] Test depends on execution order or leftover state from another test.
- [ ] `ElementHandle` captured and reused instead of re-querying the
      `Locator`.
- [ ] Assertions living inside a page object method instead of the test.
- [ ] `if (await locator.isVisible())`-style branching driving different
      assertions in the same test.
- [ ] New selector logic duplicated inline in a test instead of added to
      the relevant page object.
