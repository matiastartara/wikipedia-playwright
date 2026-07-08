/**
 * domSnapshot.ts
 *
 * Responsible for extracting a lightweight snapshot of interactive DOM elements
 * from the current page. Instead of sending the full HTML to the LLM (which would
 * be too large and noisy), we query only actionable elements (inputs, buttons, links,
 * ARIA roles) and map them to a clean JSON structure.
 *
 * This snapshot is what gets passed to the LLM so it can reason about which element
 * best matches a broken locator.
 */

import { Page } from '@playwright/test';

/** Shape of each element we extract from the DOM */
export interface DomElement {
  tag: string;
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  text?: string;
  ariaLabel?: string;
  testId?: string;
}

/**
 * Queries the live DOM for interactive elements and returns a trimmed list.
 * We cap at 60 elements to keep the LLM prompt short and within token limits.
 *
 * @param page - The Playwright Page instance to run the evaluation against.
 * @returns An array of DomElement objects representing the current page state.
 */
export async function getDomSnapshot(page: Page): Promise<DomElement[]> {
  return page.evaluate(() => {
    // Target only elements a user can interact with
    const selectors = 'input, button, a, [role="button"], [role="textbox"]';
    const elements = Array.from(document.querySelectorAll(selectors));

    // Map each element to a plain object — only include defined attributes
    return elements.slice(0, 60).map((el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      name: el.getAttribute('name') || undefined,
      type: el.getAttribute('type') || undefined,
      placeholder: el.getAttribute('placeholder') || undefined,
      // Trim text content to avoid bloating the prompt
      text: el.textContent?.trim().slice(0, 40) || undefined,
      ariaLabel: el.getAttribute('aria-label') || undefined,
      testId: el.getAttribute('data-testid') || undefined,
    }));
  });
}
