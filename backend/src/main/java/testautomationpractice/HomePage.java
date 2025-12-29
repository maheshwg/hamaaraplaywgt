package testautomationpractice;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class HomePage {
    private final Page page;

    // Form fields
    public final Locator nameInput;
    public final Locator emailInput;
    public final Locator phoneInput;
    public final Locator addressInput;
    public final Locator maleRadio;
    public final Locator femaleRadio;
    public final Locator daysCheckboxes;
    public final Locator countryDropdown;
    public final Locator colorsDropdown;
    public final Locator sortedList;
    public final Locator datePicker1;
    public final Locator datePicker2;
    public final Locator datePicker3Start;
    public final Locator datePicker3End;
    public final Locator submitButton;

    // File upload
    public final Locator singleFileUpload;
    public final Locator multipleFileUpload;

    // Static Web Table
    public final Locator staticWebTable;

    // Dynamic Web Table
    public final Locator dynamicWebTable;

    // Pagination Web Table
    public final Locator paginationWebTable;

    // Tabs
    public final Locator tabSection1;
    public final Locator tabSection2;
    public final Locator tabSection3;

    // Dynamic Button
    public final Locator startButton;

    // Alerts & Popups
    public final Locator simpleAlertButton;
    public final Locator confirmationAlertButton;
    public final Locator promptAlertButton;
    public final Locator newTabButton;
    public final Locator popupWindowButton;

    // Mouse Hover
    public final Locator mouseHoverButton;
    public final Locator mouseHoverDropdown;

    // Double Click
    public final Locator doubleClickButton;
    public final Locator doubleClickField1;
    public final Locator doubleClickField2;

    // Drag and Drop
    public final Locator dragSource;
    public final Locator dropTarget;

    // Slider
    public final Locator slider;

    // SVG Elements
    public final Locator svgImages;

    // Scrolling Dropdown
    public final Locator scrollingDropdown;

    // Labels and Links
    public final Locator mobileLabels;
    public final Locator laptopLinks;
    public final Locator brokenLinks;

    // Visitors Table
    public final Locator visitorsTable;

    public HomePage(Page page) {
        this.page = page;
        // Updated selectors based on live page attributes
        nameInput = page.locator("#name");
        emailInput = page.locator("#email");
        phoneInput = page.locator("#phone");
        addressInput = page.locator("#textarea");
        maleRadio = page.locator("#male");
        femaleRadio = page.locator("#female");
        daysCheckboxes = page.locator("#sunday, #monday, #tuesday, #wednesday, #thursday, #friday, #saturday");
        countryDropdown = page.locator("#country");
        colorsDropdown = page.locator("#colors");
        sortedList = page.locator("#animals");
        datePicker1 = page.locator("#datepicker");
        datePicker2 = page.locator("#txtDate");
        datePicker3Start = page.locator("#start-date");
        datePicker3End = page.locator("#end-date");
        submitButton = page.locator("button.submit-btn, button[type='submit'], input[type='submit']");
        singleFileUpload = page.locator("#singleFileInput");
        multipleFileUpload = page.locator("#multipleFilesInput");
        staticWebTable = page.locator("table[name='BookTable']");
        dynamicWebTable = page.locator("#taskTable");
        paginationWebTable = page.locator("#productTable");
        tabSection1 = page.locator("#section1");
        tabSection2 = page.locator("#section2");
        tabSection3 = page.locator("#section3");
        startButton = page.locator("button.start");
        simpleAlertButton = page.locator("#alertBtn");
        confirmationAlertButton = page.locator("#confirmBtn");
        promptAlertButton = page.locator("#promptBtn");
        newTabButton = page.locator("button[onclick='myFunction()']");
        popupWindowButton = page.locator("#PopUp");
        mouseHoverButton = page.locator("button.dropbtn");
        mouseHoverDropdown = page.locator(".dropdown-content");
        doubleClickButton = page.locator("button[ondblclick='myFunction1()']");
        doubleClickField1 = page.locator("#field1");
        doubleClickField2 = page.locator("#field2");
        dragSource = page.locator("#draggable");
        dropTarget = page.locator("#droppable");
        slider = page.locator("input[type='range']");
        svgImages = page.locator("svg.image");
        scrollingDropdown = page.locator("select#scrollingDropdown");
        mobileLabels = page.locator(".mobile-labels span");
        laptopLinks = page.locator(".laptop-links a");
        brokenLinks = page.locator(".broken-links a");
        visitorsTable = page.locator("table#visitorsTable");
    }

        // // --- Date Picker 1 Methods --- 
        // /**
        //  * Populates datePicker1 by directly filling the input field.
        //  * @param date Date string in format 'MM/dd/yyyy' or as required by the widget
        //  */
        // public void setDatePicker1(String date) {
        //     datePicker1.fill(""); // Clear any existing value
        //     datePicker1.fill(date);
        // }

        /**
        /**
         * Populates datePicker1 using the overlay calendar widget by navigating to the desired month and year, then selecting the day.
         * @param monthName Full month name as visible in the widget (e.g., "December")
         * @param year Four-digit year as String (e.g., "2025")
         * @param day Day of the month to select (e.g., "15")
         */
        public void selectDatePicker1ByOverlay(String monthName, String year, String day) {
            datePicker1.click();
            // Wait for overlay to appear
            page.waitForSelector(".ui-datepicker-calendar");

            // Get current month and year from overlay
            String currentMonth = page.locator(".ui-datepicker-title .ui-datepicker-month").textContent().trim();
            String currentYear = page.locator(".ui-datepicker-title .ui-datepicker-year").textContent().trim();

            // Navigate to correct year
            while (!currentYear.equals(year)) {
                if (Integer.parseInt(currentYear) < Integer.parseInt(year)) {
                    page.locator(".ui-datepicker-next").click();
                } else {
                    page.locator(".ui-datepicker-prev").click();
                }
                currentYear = page.locator(".ui-datepicker-title .ui-datepicker-year").textContent().trim();
            }

            // Navigate to correct month
            while (!currentMonth.equals(monthName)) {
                page.locator(".ui-datepicker-next").click();
                currentMonth = page.locator(".ui-datepicker-title .ui-datepicker-month").textContent().trim();
            }

            // Select day
            Locator calendarDay = page.locator(".ui-datepicker-calendar td a", new Page.LocatorOptions().setHasText(day));
            calendarDay.first().click();
        }

    // Example page methods
    public void fillForm(String name, String email, String phone, String address) {
        nameInput.fill(name);
        emailInput.fill(email);
        phoneInput.fill(phone);
        addressInput.fill(address);
    }

    public void selectGender(String gender) {
        if (gender.equalsIgnoreCase("male")) {
            maleRadio.check();
        } else if (gender.equalsIgnoreCase("female")) {
            femaleRadio.check();
        }
    }

    public void selectCountry(String country) {
        countryDropdown.selectOption(country);
    }

    public void submitForm() {
        submitButton.click();
    }

    // --- Static Web Table methods using UtilityMethods ---
    /**
     * Gets the value from a target column in the static web table where the match column has matchValue.
     * @param matchCol Locator for the column to match (e.g., Author column)
     * @param targetCol Locator for the column to get value from (e.g., Price column)
     * @param matchValue Value to match in matchCol
     * @return Value from targetCol in the matching row, or null if not found
     */
    public String getStaticTableValueByColumnMatch(Locator matchCol, Locator targetCol, String matchValue) {
        return UtilityMethods.getValueByColumnMatch(matchCol, targetCol, matchValue);
    }

    /**
     * Verifies if a row exists in the static web table where matchCol has matchValue and targetCol has expectedValue.
     * @param matchCol Locator for the column to match
     * @param targetCol Locator for the column to check value
     * @param matchValue Value to match in matchCol
     * @param expectedValue Value to check in targetCol
     * @return true if such a row exists, false otherwise
     */
    public boolean verifyStaticTableValueByColumnMatch(Locator matchCol, Locator targetCol, String matchValue, String expectedValue) {
        return UtilityMethods.verifyValueByColumnMatch(matchCol, targetCol, matchValue, expectedValue);
    }
}
