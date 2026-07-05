import { test, expect } from '@playwright/test';
import { LanguagePage } from '../pages/LanguagePage';
import { HomePage } from '../pages/HomePage';

test.describe('Wikipedia - Search test', () => {
  test('Search for a term', async ({ page }) => {
    const languagePage = new LanguagePage(page);
    const homePage = new HomePage(page);

    await languagePage.goTo();
    await languagePage.selectLanguage('English')
    await homePage.search('Playwright (software)');

  });
})