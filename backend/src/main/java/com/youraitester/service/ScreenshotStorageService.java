package com.youraitester.service;

import java.io.IOException;

/**
 * Interface for screenshot storage implementations
 * Supports both local file system and cloud storage (S3)
 */
public interface ScreenshotStorageService {
    
    /**
     * Store a screenshot and return its URL
     * @param screenshotBytes The screenshot image bytes
     * @param filename The filename for the screenshot
     * @return URL where the screenshot can be accessed
     * @throws IOException if storage fails
     */
    String storeScreenshot(byte[] screenshotBytes, String filename) throws IOException;
    
    /**
     * Delete a screenshot by its URL
     * @param screenshotUrl The URL of the screenshot to delete
     * @return true if deletion was successful
     */
    boolean deleteScreenshot(String screenshotUrl);
    
    /**
     * Get the storage type identifier
     * @return "local" or "s3"
     */
    String getStorageType();
}
