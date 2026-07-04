import { Page, Locator } from '@playwright/test'

export class HomePage {
    readonly page: Page;
    readonly loginBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.loginBtn = page.locator('span').filter({ hasText: 'Log in' }).first();
    }

    async goToLogin() {
        await this.loginBtn.click();
    }

    async getFontSizes(): Promise<{ small: number; standard: number; large: number }> {
        const heading = this.page.getByRole('heading', { name: 'Welcome to Wikipedia' });

        await this.page.getByRole('radio', { name: 'Small' }).check();
        const small = parseFloat(await heading.evaluate(el => getComputedStyle(el).fontSize));

        await this.page.locator('#skin-client-pref-vector-feature-custom-font-size-value-1').check();
        const standard = parseFloat(await heading.evaluate(el => getComputedStyle(el).fontSize));

        await this.page.getByRole('radio', { name: 'Large' }).check();
        const large = parseFloat(await heading.evaluate(el => getComputedStyle(el).fontSize));
    
       return { small, standard, large};
    }

}