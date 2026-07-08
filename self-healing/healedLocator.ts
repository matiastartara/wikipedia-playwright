/**
 * healedLocator.ts
 *
 * The main orchestrator of the self-healing pipeline. This is the only function
 * tests need to import — it wraps a regular Playwright locator call with automatic
 * recovery logic when a selector fails.
 *
 * Flow:
 *  1. Check the local cache first — if this broken locator was healed before, reuse it.
 *  2. Try the original selector with a short timeout (3s) — maybe it still works.
 *  3. If it fails, take a DOM snapshot and ask Groq to suggest a replacement.
 *  4. Validate the suggestion has sufficient confidence (≥ 0.75) and is visible.
 *  5. Cache the healed mapping for future runs to skip the LLM call entirely.
 *
 * The CONFIDENCE_THRESHOLD prevents the LLM from returning low-quality guesses
 * that might click the wrong element and corrupt the test state.
 */

import { Page, Locator } from '@playwright/test';
import { getDomSnapshot } from './domSnapshot';
import { healLocator } from './llmHealer';
import { getCachedLocator, setCachedLocator } from './healCache';

/** Minimum confidence score we accept from the LLM (0.75 = 75% certainty) */
const CONFIDENCE_THRESHOLD = 0.75;

/**
 * Short timeout used when probing whether a locator is visible.
 * We don't want to burn the full Playwright timeout (30s) just to detect a broken selector.
 */
const QUICK_TIMEOUT = 3000;

/**
 * Drop-in replacement for page.locator() with automatic self-healing.
 * If the given selector is broken (element not found/visible), it calls the LLM
 * to find an alternative and retries with the suggested selector.
 *
 * @param page     - The Playwright Page instance.
 * @param selector - The selector string to find (may be intentionally broken for testing).
 * @returns A visible Playwright Locator — either the original, the cached, or the LLM-healed one.
 * @throws If no working locator can be found with sufficient confidence.
 */
export async function healedLocator(page: Page, selector: string): Promise<Locator> {
  // Step 1: Check if we already have a healed version of this selector in the cache
  const cached = getCachedLocator(selector);
  if (cached) {
    console.log(`[self-heal] Cache hit for "${selector}" -> using "${cached}"`);
    const cachedLoc = page.locator(cached);
    // Verify the cached selector still works (page might have changed again)
    if (await isVisibleQuick(cachedLoc)) return cachedLoc;
    console.warn(`[self-heal] Cached locator "${cached}" is no longer valid, re-healing...`);
  }

  // Step 2: Try the original selector before assuming it's broken
  const original = page.locator(selector);
  if (await isVisibleQuick(original)) return original;

  // Step 3: Original failed — trigger the self-healing pipeline
  console.warn(`[self-heal] Broken locator: "${selector}". Attempting to heal...`);

  // Capture what's currently on the page so the LLM has real context
  const snapshot = await getDomSnapshot(page);
  const result = await healLocator(selector, snapshot);

  // Step 4: Reject low-confidence suggestions to avoid accidental wrong-element interactions
  if (!result || result.confidence < CONFIDENCE_THRESHOLD) {
    throw new Error(
      `[self-heal] Could not heal locator "${selector}" with sufficient confidence. ` +
      `LLM result: ${JSON.stringify(result)}`
    );
  }

  console.log(
    `[self-heal] Healed: "${selector}" -> "${result.selector}" (confidence: ${result.confidence})`
  );

  // Verify the LLM's suggestion actually resolves to a visible element
  const healed = page.locator(result.selector);
  if (!(await isVisibleQuick(healed))) {
    throw new Error(
      `[self-heal] LLM suggested selector is not visible on the page: "${result.selector}"`
    );
  }

  // Step 5: Save the mapping to cache so next run skips the LLM call entirely
  setCachedLocator(selector, result.selector);

  return healed;
}

/**
 * Checks whether a locator resolves to a visible element within a short timeout.
 * Used to quickly probe both original and healed selectors without blocking the test.
 *
 * @param locator - The Playwright Locator to probe.
 * @returns true if the element is visible within QUICK_TIMEOUT ms, false otherwise.
 */
async function isVisibleQuick(locator: Locator): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout: QUICK_TIMEOUT });
    return true;
  } catch {
    // Element not found or not visible — not an error, just means we need to heal
    return false;
  }
}
