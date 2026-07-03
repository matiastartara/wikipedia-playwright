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
}