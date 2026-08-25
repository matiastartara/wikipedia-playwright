import { Page, Locator } from '@playwright/test'

export class HomePage {
    readonly page: Page;
    readonly loginBtn: Locator;
    readonly searchInput: Locator;
    readonly resultList: Locator;
    // Main Page sections whose content changes daily and must be masked in visual regression tests.
    readonly featuredArticle: Locator;
    readonly inTheNews: Locator;
    readonly onThisDay: Locator;
    readonly featuredPicture: Locator;
    readonly didYouKnow: Locator;
    readonly featuredList: Locator;

    constructor(page: Page) {
        this.page = page;
        this.loginBtn = page.locator('span').filter({ hasText: 'Log in' }).first();
        this.searchInput = page.locator('#searchInput');
        this.resultList = page.locator('[role="option"] .cdx-menu-item__text .cdx-menu-item__text__label bdi');
        this.featuredArticle = page.locator('#mp-tfa');
        this.inTheNews = page.locator('#mp-itn');
        this.onThisDay = page.locator('#mp-otd');
        this.featuredPicture = page.locator('#mp-tfp');
        this.didYouKnow = page.locator('#mp-dyk');
        this.featuredList = page.locator('#mp-tfl');
    }

    get dynamicMainPageBlocks(): Locator[] {
        return [
            this.featuredArticle,
            this.inTheNews,
            this.onThisDay,
            this.featuredPicture,
            this.didYouKnow,
            this.featuredList,
        ];
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

        return { small, standard, large };
    }

    async search(term: string) {
        await this.searchInput.fill(term);
        await this.selectElementFromList(term);
    }

    async selectElementFromList(element: string) {
        await this.resultList.first().waitFor({ state: 'visible' });

        const item = this.resultList.filter({ hasText: element });
        const count = await item.count();

        if (count === 0) {
            throw new Error(`No results found for: "${element}"`);
        }

        await item.click();
    }
}