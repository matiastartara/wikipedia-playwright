import { test, expect } from '@playwright/test';
import { LanguagePage } from '../pages/LanguagePage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';


test.describe('Wikipedia - Login test', () => {

  test('Invalid login', async ({ page }) => {
    const languagePage = new LanguagePage(page);
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    await languagePage.goTo();
    await languagePage.selectLanguage('English');
    await homePage.goToLogin();
    await loginPage.login('invalidUser', 'invalidPassword');

    const errorMessage = await loginPage.getErrorMessage();
    console.log('Error message:', errorMessage);
    expect(errorMessage).toContain('Incorrect username or password entered. Please try again.');

  });
});



