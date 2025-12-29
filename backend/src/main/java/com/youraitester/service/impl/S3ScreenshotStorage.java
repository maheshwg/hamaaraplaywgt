package com.youraitester.service.impl;

import com.youraitester.service.ScreenshotStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;

/**
 * AWS S3 implementation of screenshot storage
 * Used for production deployments
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "screenshot.storage.type", havingValue = "s3")
public class S3ScreenshotStorage implements ScreenshotStorageService {
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.s3.region:us-east-1}")
    private String region;
    
    @Value("${aws.access.key:}")
    private String accessKey;
    
    @Value("${aws.secret.key:}")
    private String secretKey;
    
    @Value("${aws.s3.cloudfront.url:}")
    private String cloudFrontUrl;
    
    private S3Client s3Client;
    
    @PostConstruct
    public void init() {
        try {
            if (accessKey.isEmpty() || secretKey.isEmpty()) {
                log.warn("AWS credentials not configured. S3 screenshot storage will not work.");
                return;
            }
            
            AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
            
            s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .build();
            
            log.info("S3 screenshot storage initialized for bucket: {} in region: {}", bucketName, region);
        } catch (Exception e) {
            log.error("Failed to initialize S3 client", e);
            throw new RuntimeException("Failed to initialize S3 screenshot storage", e);
        }
    }
    
    @PreDestroy
    public void cleanup() {
        if (s3Client != null) {
            s3Client.close();
        }
    }
    
    @Override
    public String storeScreenshot(byte[] screenshotBytes, String filename) throws IOException {
        try {
            if (s3Client == null) {
                throw new IOException("S3 client not initialized");
            }
            
            // Create S3 key with screenshots prefix
            String s3Key = "screenshots/" + filename;
            
            // Upload to S3
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType("image/png")
                    .build();
            
            s3Client.putObject(putRequest, RequestBody.fromBytes(screenshotBytes));
            
            // Return URL (CloudFront if configured, otherwise S3 direct URL)
            String url;
            if (!cloudFrontUrl.isEmpty()) {
                url = cloudFrontUrl + "/" + s3Key;
            } else {
                url = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);
            }
            
            log.info("Stored screenshot in S3: {} -> {}", filename, url);
            return url;
            
        } catch (Exception e) {
            log.error("Failed to upload screenshot to S3", e);
            throw new IOException("Failed to store screenshot in S3", e);
        }
    }
    
    @Override
    public boolean deleteScreenshot(String screenshotUrl) {
        try {
            if (s3Client == null) {
                return false;
            }
            
            // Extract S3 key from URL
            String s3Key;
            if (screenshotUrl.contains("amazonaws.com/")) {
                s3Key = screenshotUrl.substring(screenshotUrl.indexOf("amazonaws.com/") + 14);
            } else if (!cloudFrontUrl.isEmpty() && screenshotUrl.startsWith(cloudFrontUrl)) {
                s3Key = screenshotUrl.substring(cloudFrontUrl.length() + 1);
            } else {
                log.warn("Unable to parse S3 key from URL: {}", screenshotUrl);
                return false;
            }
            
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            
            s3Client.deleteObject(deleteRequest);
            log.info("Deleted screenshot from S3: {}", s3Key);
            return true;
            
        } catch (Exception e) {
            log.error("Failed to delete screenshot from S3: {}", screenshotUrl, e);
            return false;
        }
    }
    
    @Override
    public String getStorageType() {
        return "s3";
    }
}
