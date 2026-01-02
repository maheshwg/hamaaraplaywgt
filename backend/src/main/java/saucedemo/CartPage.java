package saucedemo;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class CartPage {
    private final Page page;
    public final Locator cartItems;
    public final Locator checkoutButton;
    public final Locator continueShoppingButton;
    public final Locator removeButtons;

    public CartPage(Page page) {
        this.page = page;
        cartItems = page.locator(".cart_item");
        checkoutButton = page.locator("button[data-test='checkout']");
        continueShoppingButton = page.locator("button[data-test='continue-shopping']");
        removeButtons = page.locator("button[data-test^='remove']");
    }

    public int getCartItemCount() {
        return cartItems.count();
    }

    public void removeItem(String productName) {
        Locator removeBtn = page.locator(".cart_item:has(.inventory_item_name:text('" + productName + "')) button[data-test^='remove']");
        removeBtn.click();
    }

    public void clickCheckout() {
        checkoutButton.click();
    }

    public void clickContinueShopping() {
        continueShoppingButton.click();
    }

        /**
         * Gets the quantity for a given product in the cart.
         * @param productName Name of the product
         * @return Quantity of the product
         */
        public int getProductQuantity(String productName) {
            Locator item = cartItems.filter(new Locator.FilterOptions().setHasText(productName)).first();
            String qtyText = item.locator(".cart_quantity").textContent();
            return Integer.parseInt(qtyText.trim());
        }
}
