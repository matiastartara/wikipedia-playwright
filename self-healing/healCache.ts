/**
 * healCache.ts
 *
 * Provides a simple file-based cache to avoid redundant LLM calls.
 * When a broken locator is successfully healed, the mapping (broken -> healed)
 * is persisted to a local JSON file (.self-heal-cache.json).
 *
 * On subsequent test runs, if the same broken locator is encountered again,
 * we return the cached result immediately — no Groq API call needed.
 *
 * The cache file is excluded from git via .gitignore since it's environment-specific.
 */

import fs from 'fs';

/** Path to the local cache file — stored at the project root */
const CACHE_FILE = '.self-heal-cache.json';

/** The cache structure: a flat map of brokenLocator -> healedLocator */
type Cache = Record<string, string>;

/**
 * Reads the cache from disk.
 * Returns an empty object if the file doesn't exist yet.
 */
function readCache(): Cache {
  if (!fs.existsSync(CACHE_FILE)) return {};
  return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
}

/**
 * Writes the updated cache back to disk in a human-readable format.
 */
function writeCache(cache: Cache): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Looks up a previously healed locator for the given broken selector.
 *
 * @param brokenLocator - The original selector that failed to find an element.
 * @returns The healed selector string if found in cache, or null if not cached yet.
 */
export function getCachedLocator(brokenLocator: string): string | null {
  const cache = readCache();
  return cache[brokenLocator] || null;
}

/**
 * Saves a healed locator mapping to the cache so future runs skip the LLM call.
 *
 * @param brokenLocator - The original selector that failed.
 * @param healedLocator - The working selector suggested by the LLM.
 */
export function setCachedLocator(brokenLocator: string, healedLocator: string): void {
  const cache = readCache();
  cache[brokenLocator] = healedLocator;
  writeCache(cache);
}
