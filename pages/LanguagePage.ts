import { Page, Locator } from '@playwright/test'

export class LanguagePage {
    readonly page: Page;
    readonly languages: Locator;

    constructor(page: Page) {
        this.page = page;
        this.languages = page.locator('.link-box strong');
    }

    async selectLanguage(language: string) {
        await this.languages.filter({ hasText: language}).click();
    }
}