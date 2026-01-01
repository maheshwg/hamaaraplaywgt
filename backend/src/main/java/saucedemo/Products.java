package saucedemo;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.SelectOption;


import java.util.List;
import java.util.stream.Collectors;

public class Products {
    private final Page page;
    public final Locator productSortDropdown;
    public final Locator productNames;
    public final Locator productPrices;
    public final Locator productDescriptions;
    public final Locator addToCartButtons;
    public final Locator cartIcon;

    public Products(Page page) {
        this.page = page;
        productSortDropdown = page.locator("select[data-test='product-sort-container']");
        productNames = page.locator(".inventory_item_name");
        productPrices = page.locator(".inventory_item_price");
        productDescriptions = page.locator(".inventory_item_desc");
        addToCartButtons = page.locator("button[data-test^='add-to-cart']");
        cartIcon = page.locator("a.shopping_cart_link");
    }

    public void sortBy(String sortOption) {
        productSortDropdown.selectOption(new SelectOption().setLabel(sortOption));
    }

    public List<String> getProductNames() {
        return productNames.allTextContents();
    }

    public List<Double> getProductPrices() {
        return productPrices.allTextContents().stream()
            .map(s -> Double.parseDouble(s.replace("$", "")))
            .collect(Collectors.toList());
    }

    public String getProductDescription(String productName) {
        Locator desc = page.locator(".inventory_item:has(.inventory_item_name:text('" + productName + "')) .inventory_item_desc");
        return desc.textContent();
    }

    public double getProductPrice(String productName) {
        List<Locator> items = page.locator(".inventory_item").all();
        for (Locator item : items) {
            String name = item.locator(".inventory_item_name").textContent();
            if (name != null && name.trim().equalsIgnoreCase(productName.trim())) {
                String priceText = item.locator(".inventory_item_price").textContent();
                if (priceText != null) {
                    return Double.parseDouble(priceText.replace("$", ""));
                }
            }
        }
        throw new IllegalArgumentException("Product not found: " + productName);
    }

    public Boolean verifyProductPrice(String productName, String expectedPrice) {
        Locator price = page.locator(".inventory_item:has(.inventory_item_name:text('" + productName + "')) .inventory_item_price");
        Double actualPrice = Double.parseDouble(price.textContent().replace("$", ""));

// @log: Actual price '${actualPrice}' 
// @log: Expected Price '${expectedPrice}' 
        Boolean returnValue =  String.valueOf(actualPrice).toLowerCase().contains(expectedPrice.toLowerCase());
// @log: Return value '${returnValue}' 
return returnValue;
    }

    public void addToCart(String productName) {
        Locator addBtn = page.locator(".inventory_item:has(.inventory_item_name:text('" + productName + "')) button[data-test^='add-to-cart']");
        addBtn.click();
    }

    public void clickCartIcon() {
        cartIcon.click();
    }

    public boolean isSortedByNameAsc() {
        List<String> names = getProductNames();
        return names.equals(names.stream().sorted().collect(Collectors.toList()));
    }

    public boolean isSortedByNameDesc() {
        List<String> names = getProductNames();
        return names.equals(names.stream().sorted((a, b) -> b.compareTo(a)).collect(Collectors.toList()));
    }

    // @onFailure: Products not sorted by price in ascending order.
    // @onSuccess: Products sorted by price in ascending order.
    public boolean isSortedByPriceAsc() {
        List<Double> prices = getProductPrices();
        return prices.equals(prices.stream().sorted().collect(Collectors.toList()));
    }

    public boolean isSortedByPriceDesc() {
        List<Double> prices = getProductPrices();
        return prices.equals(prices.stream().sorted((a, b) -> Double.compare(b, a)).collect(Collectors.toList()));
    }
}
