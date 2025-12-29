package com.youraitester.service.impl;

import com.youraitester.service.ScreenshotStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

/**
 * Local file system implementation of screenshot storage
 * Used for local development and testing
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "screenshot.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalScreenshotStorage implements ScreenshotStorageService {
    
    @Value("${screenshot.storage.local.directory:./screenshots}")
    private String storageDirectory;
    
    @Value("${server.port:8080}")
    private String serverPort;
    
    @Value("${server.public.url:http://localhost:8080}")
    private String serverPublicUrl;
    
    @PostConstruct
    public void init() {
        try {
            Path directory = Paths.get(storageDirectory);
            if (!Files.exists(directory)) {
                Files.createDirectories(directory);
                log.info("Created local screenshot directory: {}", directory.toAbsolutePath());
            }
            log.info("Local screenshot storage initialized at: {}", directory.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to create screenshot storage directory", e);
            throw new RuntimeException("Failed to initialize local screenshot storage", e);
        }
    }
    
    @Override
    public String storeScreenshot(byte[] screenshotBytes, String filename) throws IOException {
        Path filePath = Paths.get(storageDirectory, filename);
        
        // Write the screenshot to disk
        Files.write(filePath, screenshotBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        
        // Return URL to access the screenshot via the backend API
        String url = String.format("%s/api/screenshots/%s", serverPublicUrl, filename);
        
        log.info("Stored screenshot locally: {} -> {}", filename, url);
        return url;
    }
    
    @Override
    public boolean deleteScreenshot(String screenshotUrl) {
        try {
            // Extract filename from URL
            String filename = screenshotUrl.substring(screenshotUrl.lastIndexOf('/') + 1);
            Path filePath = Paths.get(storageDirectory, filename);
            
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Deleted local screenshot: {}", filename);
                return true;
            }
            return false;
        } catch (IOException e) {
            log.error("Failed to delete screenshot: {}", screenshotUrl, e);
            return false;
        }
    }
    
    @Override
    public String getStorageType() {
        return "local";
    }
}
