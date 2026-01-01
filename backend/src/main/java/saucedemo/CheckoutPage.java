package saucedemo;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class CheckoutPage {
    private final Page page;
    public final Locator firstNameInput;
    public final Locator lastNameInput;
    public final Locator postalCodeInput;
    public final Locator continueButton;

    public CheckoutPage(Page page) {
        this.page = page;
        firstNameInput = page.locator("input[data-test='firstName']");
        lastNameInput = page.locator("input[data-test='lastName']");
        postalCodeInput = page.locator("input[data-test='postalCode']");
        continueButton = page.locator("input[data-test='continue']");
    }

    public void fillCheckoutForm(String firstName, String lastName, String postalCode) {
        firstNameInput.fill(firstName);
        lastNameInput.fill(lastName);
        postalCodeInput.fill(postalCode);
    }

    public void clickContinue() {
        continueButton.click();
    }
}
