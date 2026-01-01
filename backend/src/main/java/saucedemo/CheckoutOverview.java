package saucedemo;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class CheckoutOverview {
    private final Page page;
    public final Locator cartItems;
    public final Locator paymentInfo;
    public final Locator shippingInfo;
    public final Locator itemTotal;
    public final Locator tax;
    public final Locator total;
    public final Locator finishButton;

    public CheckoutOverview(Page page) {
        this.page = page;
        cartItems = page.locator(".cart_item");
        paymentInfo = page.locator(".summary_value_label[data-test='payment-info-value']");
        shippingInfo = page.locator(".summary_value_label[data-test='shipping-info-value']");
        itemTotal = page.locator(".summary_subtotal_label");
        tax = page.locator(".summary_tax_label");
        total = page.locator(".summary_total_label");
        finishButton = page.locator("button[data-test='finish']");
    }

    public int getProductQuantity(String productName) {
        for (int i = 0; i < cartItems.count(); i++) {
            Locator item = cartItems.nth(i);
            String name = item.locator(".inventory_item_name").textContent();
            if (name != null && name.trim().equalsIgnoreCase(productName.trim())) {
                String qtyText = item.locator(".cart_quantity").textContent();
                return Integer.parseInt(qtyText.trim());
            }
        }
        throw new IllegalArgumentException("Product not found: " + productName);
    }

    public String getPaymentInfo() {
        return paymentInfo.textContent();
    }

    public String getShippingInfo() {
        return shippingInfo.textContent();
    }

    public String getItemTotal() {
        return itemTotal.textContent();
    }

    public String getTax() {
        return tax.textContent();
    }

    public String getTotal() {
        return total.textContent();
    }

    public void clickFinish() {
        finishButton.click();
    }
}
