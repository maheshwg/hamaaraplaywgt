package com.youraitester.service;

import com.microsoft.playwright.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScreenshotService {
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.s3.region}")
    private String region;
    
    @Value("${aws.access.key:}")
    private String accessKey;
    
    @Value("${aws.secret.key:}")
    private String secretKey;
    
    public String captureScreenshot(Page page, String sessionId) {
        try {
            // Create temp directory if not exists
            Path tempDir = Paths.get(System.getProperty("java.io.tmpdir"), "screenshots");
            Files.createDirectories(tempDir);
            
            // Capture screenshot
            String filename = sessionId + "_" + System.currentTimeMillis() + ".png";
            Path screenshotPath = tempDir.resolve(filename);
            page.screenshot(new Page.ScreenshotOptions()
                    .setPath(screenshotPath)
                    .setFullPage(false));
            
            // Upload to S3 if configured
            if (accessKey != null && !accessKey.isEmpty()) {
                return uploadToS3(screenshotPath, filename);
            } else {
                // Return local file path for development
                log.info("AWS credentials not configured. Screenshot saved locally: {}", screenshotPath);
                return screenshotPath.toString();
            }
            
        } catch (Exception e) {
            log.error("Failed to capture screenshot", e);
            return null;
        }
    }
    
    private String uploadToS3(Path filePath, String filename) {
        try {
            S3Client s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)))
                    .build();
            
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key("screenshots/" + filename)
                    .contentType("image/png")
                    .build();
            
            s3Client.putObject(request, RequestBody.fromFile(filePath));
            
            String url = String.format("https://%s.s3.%s.amazonaws.com/screenshots/%s", 
                    bucketName, region, filename);
            
            log.info("Screenshot uploaded to S3: {}", url);
            
            // Delete local file
            Files.deleteIfExists(filePath);
            
            return url;
            
        } catch (Exception e) {
            log.error("Failed to upload screenshot to S3", e);
            return filePath.toString();
        }
    }
}
