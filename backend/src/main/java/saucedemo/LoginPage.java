package saucedemo;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class LoginPage {
    private final Page page;
    public final Locator usernameInput;
    public final Locator passwordInput;
    public final Locator loginButton;
    public final Locator errorMessage;

    public LoginPage(Page page) {
        this.page = page;
        usernameInput = page.locator("#user-name");
        passwordInput = page.locator("#password");
        loginButton = page.locator("#login-button");
        errorMessage = page.locator("h3[data-test='error']");
    }

    public void login(String username, String password) {
        page.locator("#user-name").fill(username);
        page.locator("#password").fill(password);
        page.locator("#login-button").click();
    }

    public boolean isErrorVisible() {
        return errorMessage.isVisible();
    }
}
