import { Page, Locator } from '@playwright/test'

export class HomePage {
    readonly page: Page;
    readonly loginBtn: Locator;
    readonly searchInput: Locator;
    readonly resultList: Locator;
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

    // Fixed heights for the masked blocks above, so a block with more/fewer
    // items today doesn't reflow the rest of the page and break the
    // full-page screenshot. Values are just a stable reference height per
    // block, not a real layout constraint - the block is masked anyway.
    private static readonly frozenBlockHeights: Record<string, number> = {
        'mp-tfa': 560,
        'mp-itn': 535,
        'mp-otd': 740,
        'mp-tfp': 465,
        'mp-dyk': 620,
        'mp-tfl': 400,
    };

    async freezeDynamicBlockHeights(): Promise<void> {
        for (const block of this.dynamicMainPageBlocks) {
            if (await block.count() === 0) continue;
            const id = await block.getAttribute('id');
            const height = id && HomePage.frozenBlockHeights[id];
            if (!height) continue;
            await block.evaluate((el, h) => {
                (el as HTMLElement).style.height = `${h}px`;
                (el as HTMLElement).style.overflow = 'hidden';
            }, height);
        }
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