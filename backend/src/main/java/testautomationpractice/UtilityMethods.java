package testautomationpractice;

import com.microsoft.playwright.Locator;
import java.util.List;

public class UtilityMethods {
    /**
     * Returns the value from targetCol in the row where matchCol has matchValue.
     * @param matchCol Locator for the column to match
     * @param targetCol Locator for the column to return value from
     * @param matchValue The value to match in matchCol
     * @return The value from targetCol in the matching row, or null if not found
     */
    public static String getValueByColumnMatch(Locator matchCol, Locator targetCol, String matchValue) {
        List<String> matchColValues = matchCol.allInnerTexts();
        List<String> targetColValues = targetCol.allInnerTexts();
        for (int i = 0; i < matchColValues.size(); i++) {
            if (matchColValues.get(i).trim().equals(matchValue)) {
                if (i < targetColValues.size()) {
                    return targetColValues.get(i).trim();
                }
            }
        }
        return null;
    }

    /**
     * Returns true if a row exists where matchCol has matchValue and targetCol has expectedValue.
     * @param matchCol Locator for the column to match
     * @param targetCol Locator for the column to check value
     * @param matchValue The value to match in matchCol
     * @param expectedValue The value to check in targetCol
     * @return true if such a row exists, false otherwise
     */
    public static boolean verifyValueByColumnMatch(Locator matchCol, Locator targetCol, String matchValue, String expectedValue) {
        List<String> matchColValues = matchCol.allInnerTexts();
        List<String> targetColValues = targetCol.allInnerTexts();
        for (int i = 0; i < matchColValues.size(); i++) {
            if (matchColValues.get(i).trim().equals(matchValue)) {
                if (i < targetColValues.size() && targetColValues.get(i).trim().equals(expectedValue)) {
                    return true;
                }
            }
        }
        return false;
    }
}
