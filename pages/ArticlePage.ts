import { Page, Locator } from 'playwright/test';

export class ArticlePage {
    readonly page: Page;
    readonly articleTitle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.articleTitle = page.locator('#firstHeading');
    }

    async getArticleTitle(): Promise<string> {
        return this.articleTitle.innerText();
    }
}