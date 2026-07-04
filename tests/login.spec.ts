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

  test('Valid login', async ({ page }) => {
    const languagePage = new LanguagePage(page);
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    const wikipediaUsername = process.env.WIKIPEDIA_USERNAME;
    const wikipediaPassword = process.env.WIKIPEDIA_PASSWORD;

    if (!wikipediaUsername || !wikipediaPassword) {
      test.skip(true, 'WIKIPEDIA_USERNAME or WIKIPEDIA_PASSWORD not set in .env');
    }

    console.log('Using credentials:', { username: wikipediaUsername, password: wikipediaPassword });

    await languagePage.goTo();
    await languagePage.selectLanguage('English');
    await homePage.goToLogin();
    await loginPage.login(wikipediaUsername!, wikipediaPassword!);

    await expect(page).toHaveURL(/wiki\/Main_Page/);
    const displayName = wikipediaUsername!.charAt(0).toUpperCase() + wikipediaUsername!.slice(1);
    await expect(page.locator('#pt-userpage-2 span')).toContainText(displayName);
  })

});



