import { test, expect } from '@playwright/test';
import { LanguagePage } from '../pages/LanguagePage';
import { HomePage } from '../pages/HomePage';

test.describe('Wikipedia - Visual Regression Tests', () => {
    test.beforeEach(async ({ page }) => {
        const languagePage = new LanguagePage(page);
        await languagePage.goTo();
        await languagePage.selectLanguage('English');
    });

    test('Full home page visual regression test', async ({ page }) => {
        // Dynamic content blocks on Wikipedia Main Page that change frequently:
        // #mp-tfa: Today's featured article
        // #mp-itn: In the news
        // #mp-otd: On this day
        // #mp-tfp: Today's featured picture
        // #mp-dyk: Did you know...
        // #mp-tfl: Today's featured list
        const homePage = new HomePage(page);
        await homePage.freezeDynamicBlockHeights();
        await expect(page).toHaveScreenshot('homepage-full.webp', {
            fullPage: true,
            mask: homePage.dynamicMainPageBlocks,
        });
    });

    test('Search input component visual regression test', async ({ page }) => {
        const homePage = new HomePage(page);
        await expect(homePage.searchInput).toHaveScreenshot('search-input.webp', {
            maxDiffPixelRatio: 0.01,
        });
    });
});
