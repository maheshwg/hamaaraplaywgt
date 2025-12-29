package testautomationpractice;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;

public class DateUtils {
    public static String formatDateMMDDYYYY(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("MM/dd/yyyy"));
    }

    public static String formatDateDDMMYYYY(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    public static String todayMMDDYYYY() {
        return formatDateMMDDYYYY(LocalDate.now());
    }

    public static String todayDDMMYYYY() {
        return formatDateDDMMYYYY(LocalDate.now());
    }

    public static String addDaysMMDDYYYY(int days) {
        return formatDateMMDDYYYY(LocalDate.now().plusDays(days));
    }

    public static String addDaysDDMMYYYY(int days) {
        return formatDateDDMMYYYY(LocalDate.now().plusDays(days));
    }
    /**
     * Selects a date in a jQuery-style date picker overlay (MM/dd/yyyy) by clicking the input and picking the day.
     * @param page Playwright page
     * @param dateInput Locator for the date input
     * @param date LocalDate to select
     */
    public static void selectDatePicker1(Page page, Locator dateInput, LocalDate date) {
        dateInput.click();
        // Assumes the overlay is now open. Navigate to correct month/year if needed.
        String desiredMonth = date.format(DateTimeFormatter.ofPattern("MMMM"));
        String desiredYear = date.format(DateTimeFormatter.ofPattern("yyyy"));
        String desiredDay = date.format(DateTimeFormatter.ofPattern("d"));
        // Navigate to correct year/month
        while (true) {
            String currentMonth = page.locator(".ui-datepicker-title .ui-datepicker-month").innerText();
            String currentYear = page.locator(".ui-datepicker-title .ui-datepicker-year").innerText();
            if (currentMonth.equals(desiredMonth) && currentYear.equals(desiredYear)) {
                break;
            }
            if (Integer.parseInt(currentYear) > Integer.parseInt(desiredYear) ||
                (currentYear.equals(desiredYear) && monthIndex(currentMonth) > monthIndex(desiredMonth))) {
                page.locator(".ui-datepicker-prev").click();
            } else {
                page.locator(".ui-datepicker-next").click();
            }
        }
        // Click the day
        page.locator(".ui-datepicker-calendar td a:text('" + desiredDay + "')").click();
    }

    /**
     * Selects a date in a date picker overlay (dd/MM/yyyy) by clicking the input and picking the day.
     * @param page Playwright page
     * @param dateInput Locator for the date input
     * @param date LocalDate to select
     */
    public static void selectDatePicker2(Page page, Locator dateInput, LocalDate date) {
        // If the overlay is different, adjust selectors accordingly
        selectDatePicker1(page, dateInput, date); // Reuse logic if same widget
    }

    /**
     * Selects a date range in a dual date picker overlay (for date picker 3).
     * @param page Playwright page
     * @param startInput Locator for the start date input
     * @param endInput Locator for the end date input
     * @param startDate LocalDate for start
     * @param endDate LocalDate for end
     */
    public static void selectDatePicker3Range(Page page, Locator startInput, Locator endInput, LocalDate startDate, LocalDate endDate) {
        selectDatePicker1(page, startInput, startDate);
        selectDatePicker1(page, endInput, endDate);
    }

    // Helper to get month index (0=Jan, 11=Dec)
    private static int monthIndex(String monthName) {
        String[] months = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};
        for (int i = 0; i < months.length; i++) {
            if (months[i].equalsIgnoreCase(monthName)) return i;
        }
        return -1;
    }
}
