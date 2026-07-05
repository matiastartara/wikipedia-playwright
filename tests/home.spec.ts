import { test, expect } from '@playwright/test';
import { LanguagePage } from '../pages/LanguagePage';
import { HomePage } from '../pages/HomePage';

test.describe('Wikipedia - Home page test', () => {
    test('Size heading test', async ({ page }) => {
        const languagePage = new LanguagePage(page);
        const homePage = new HomePage(page);

        await languagePage.goTo();
        await languagePage.selectLanguage('English');
        const {small, standard, large} = await homePage.getFontSizes();
        console.log('Font sizes:', { small, standard, large });

        expect(small).toBeLessThan(standard);
        expect(standard).toBeLessThan(large);
    });
})  