package com.youraitester.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/screenshots")
@CrossOrigin(origins = "*")
@Slf4j
public class ScreenshotController {
    
    @Value("${screenshot.storage.local.directory:./screenshots}")
    private String storageDirectory;
    
    /**
     * Serve screenshots via base64-encoded path (frontend compatibility)
     */
    @GetMapping("/image")
    public ResponseEntity<Resource> getScreenshotByEncodedPath(@RequestParam String path) {
        try {
            // Decode the base64 path
            String decodedPath = new String(Base64.getDecoder().decode(path));
            log.info(">>> Decoded screenshot path: {}", decodedPath);

            // If the decoded path is an absolute filesystem path, attempt to serve it directly
            // but ONLY if it's within an allowlisted directory.
            if (decodedPath.startsWith("/")) {
                Path requested = Paths.get(decodedPath).normalize().toAbsolutePath();

                Path storageRoot = Paths.get(storageDirectory).normalize().toAbsolutePath();
                Path pwJavaRoot = Paths.get(System.getProperty("java.io.tmpdir"), "playwright-java-screenshots").normalize().toAbsolutePath();
                Path pwMcpRoot = Paths.get("/tmp/playwright-mcp-output").normalize().toAbsolutePath();

                List<Path> allowedRoots = List.of(storageRoot, pwJavaRoot, pwMcpRoot);
                boolean allowed = allowedRoots.stream().anyMatch(requested::startsWith);

                if (!allowed) {
                    log.warn("Blocked screenshot request outside allowed roots. requested='{}' allowedRoots={}", requested, allowedRoots);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }

                if (!Files.exists(requested)) {
                    log.error("Screenshot not found: {}", requested);
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
                }

                Resource resource = new FileSystemResource(requested);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.IMAGE_PNG);
                headers.setCacheControl("max-age=3600");
                return ResponseEntity.ok().headers(headers).body(resource);
            }

            // Otherwise treat it as a URL-ish path like /api/screenshots/<filename>
            String filename = decodedPath.substring(decodedPath.lastIndexOf('/') + 1);
            log.info(">>> Extracted filename: {}", filename);
            return getScreenshot(filename);
            
        } catch (Exception e) {
            log.error("Error decoding screenshot path", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    /**
     * Serve local screenshots (used when screenshot.storage.type=local)
     */
    @GetMapping("/{filename}")
    public ResponseEntity<Resource> getScreenshot(@PathVariable String filename) {
        try {
            Path screenshotPath = Paths.get(storageDirectory, filename);
            
            log.debug("Attempting to serve screenshot: {}", screenshotPath);
            
            if (!Files.exists(screenshotPath)) {
                log.error("Screenshot not found: {}", screenshotPath);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            
            Resource resource = new FileSystemResource(screenshotPath);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setCacheControl("max-age=3600");
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);
                    
        } catch (Exception e) {
            log.error("Error serving screenshot", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
