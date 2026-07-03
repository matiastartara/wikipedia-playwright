import { Page, Locator } from '@playwright/test'

export class LoginPage {
    readonly page: Page;
    readonly usernameInput: Locator;
    readonly passwordInput: Locator;
    readonly loginBtn: Locator;

    constructor(page: Page) {
        this.page = page;
        this.usernameInput = page.getByRole('textbox', { name: 'Username' });
        this.passwordInput = page.getByRole('textbox', { name: 'Password' });
        this.loginBtn = page.getByRole('button', { name: 'Log in' });
    }

    async login(username:string, password:string) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.loginBtn.click();        
    }

    async getErrorMessage(): Promise<string> {
        const errorMessageLocator = this.page.locator('.cdx-message--error');
        return await errorMessageLocator.innerText();   
    }
}