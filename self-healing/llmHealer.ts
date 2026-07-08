/**
 * llmHealer.ts
 *
 * The Groq integration layer. This module is responsible for:
 *  1. Building a structured prompt that gives the LLM enough context to reason
 *     about which DOM element matches the intent of a broken locator.
 *  2. Calling the Groq API (llama-3.1-8b-instant model — fast and free-tier friendly).
 *  3. Parsing and validating the JSON response from the LLM.
 *  4. Returning a HealResult with the suggested selector and a confidence score.
 *
 * The LLM is instructed to respond with ONLY a JSON object — no markdown, no prose.
 * We strip any accidental code fences before parsing.
 */

import Groq from 'groq-sdk';
import { DomElement } from './domSnapshot';

/** Initialize the Groq client — API key is loaded from .env via playwright.config.ts */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * The structure we expect back from the LLM.
 * - selector: a valid Playwright selector string (e.g. "#id", "[name='x']", "text=Login")
 * - confidence: a float 0.0–1.0 indicating how certain the LLM is about its suggestion
 */
interface HealResult {
  selector: string;
  confidence: number;
}

/**
 * Sends a broken locator + DOM snapshot to Groq and asks it to suggest a replacement.
 *
 * @param brokenLocator - The selector string that failed to find an element on the page.
 * @param domSnapshot   - The list of interactive elements currently present in the DOM.
 * @returns A HealResult if the LLM responded with a valid JSON, or null if parsing failed.
 */
export async function healLocator(
  brokenLocator: string,
  domSnapshot: DomElement[]
): Promise<HealResult | null> {
  // Build the prompt — we provide explicit intent hints per element type so the LLM
  // can infer purpose from the broken selector name (e.g. "wpNameXYZ" → username field)
  const prompt = `
You are an assistant that repairs broken Playwright selectors.

The following locator stopped working: "${brokenLocator}"

This is the current snapshot of interactive DOM elements on the page (JSON):
${JSON.stringify(domSnapshot, null, 2)}

Find the element that best matches the original intent of the broken locator.
For example:
- If it was looking for a username field, find inputs related to username/user/login.
- If it was looking for a password field, find inputs with type="password".
- If it was looking for a login button, find buttons with text related to "login" / "sign in".

Respond ONLY with a JSON object — no extra text, no markdown — using this exact format:
{"selector": "a valid Playwright selector, e.g. #id or [name='x'] or text=Login", "confidence": 0.0 to 1.0}
`.trim();

  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,      // Deterministic output — we want consistent selector suggestions
    max_tokens: 200,     // The response is tiny (just a JSON object), so 200 tokens is plenty
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '';

  try {
    // Strip accidental markdown code fences the model might add despite instructions
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate the shape of the response before trusting it
    if (typeof parsed.selector === 'string' && typeof parsed.confidence === 'number') {
      return parsed as HealResult;
    }

    return null;
  } catch {
    // Log the raw response to help diagnose prompt engineering issues
    console.error('[self-heal] Could not parse LLM response:', raw);
    return null;
  }
}
