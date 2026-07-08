import { test, expect } from '@playwright/test';
import { healedLocator } from '../self-healing/healedLocator';

test('Login with self-healing - Wikipedia', async ({ page }) => {
  // Navigate to the language selection page and select English to reach Main Page
  await page.goto('https://www.wikipedia.org/');
  await page.click('a#js-link-box-en');

  // Click on the Log in link (standard header element)
  await page.click('text=Log in');

  // Get credentials from .env file (already loaded by playwright.config.ts)
  const wikipediaUsername = process.env.WIKIPEDIA_USERNAME;
  const wikipediaPassword = process.env.WIKIPEDIA_PASSWORD;

  if (!wikipediaUsername || !wikipediaPassword) {
    test.skip(true, 'WIKIPEDIA_USERNAME or WIKIPEDIA_PASSWORD not set in .env');
  }

  // Broken locators on purpose (appended "XYZ") to trigger self-healing
  // Real locators on Wikipedia login form: #wpName1, #wpPassword1, #wpLoginAttempt
  const username = await healedLocator(page, '#wpNameXYZ');
  const password = await healedLocator(page, '#wpPasswordXYZ');
  const loginBtn = await healedLocator(page, '#wpLoginAttemptXYZ');

  // Perform actions on the healed locators
  await username.fill(wikipediaUsername!);
  await password.fill(wikipediaPassword!);
  await loginBtn.click();

  // Validate successful login checking the URL or user page presence
  await expect(page).toHaveURL(/wiki\/Main_Page/);
  const displayName = wikipediaUsername!.charAt(0).toUpperCase() + wikipediaUsername!.slice(1);
  await expect(page.locator('#pt-userpage-2 span')).toContainText(displayName);
});
