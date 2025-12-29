package com.youraitester.controller;

import com.youraitester.model.User;
import com.youraitester.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Locale;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
public class DevTokenController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Demo secret; replace with RS256 + JWKS in production
    private final String jwtSecret = "change-me-super-secret-key-32-bytes-min";

    @GetMapping("/dev-token")
    public ResponseEntity<Map<String, Object>> issueToken(
        @RequestParam String role,
            @RequestParam String sub,
            @RequestParam(required = false, defaultValue = "youraitester") String aud,
            @RequestParam(required = false, defaultValue = "youraitester-issuer") String iss
    ) {
        Instant now = Instant.now();
    // Normalize role to uppercase underscores expected by Spring Security mapping
    String normRole = role.toUpperCase();
    String token = Jwts.builder()
                .setSubject(sub)
                .setAudience(aud)
                .setIssuer(iss)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(900))) // 15 minutes
        .claim("role", normRole)
                .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();

        // simple refresh token (longer TTL) for dev use only
    String refreshToken = Jwts.builder()
                .setSubject(sub)
                .setAudience(aud)
                .setIssuer(iss)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(3600))) // 60 minutes
        .claim("role", normRole)
                .claim("type", "refresh")
                .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();

        return ResponseEntity.ok(Map.of("token", token, "expiresIn", 900, "refreshToken", refreshToken));
    }

    @GetMapping("/refresh-token")
    public ResponseEntity<Map<String, Object>> refresh(@RequestParam String refreshToken) {
        Instant now = Instant.now();
        var key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        var claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(refreshToken).getBody();
        if (!"refresh".equals(claims.get("type", String.class))) {
            return ResponseEntity.status(400).body(Map.of("error", "invalid_refresh_token"));
        }
    String role = claims.get("role", String.class);
        String sub = claims.getSubject();
        String aud = claims.getAudience();
        String iss = claims.getIssuer();
        String newAccess = Jwts.builder()
                .setSubject(sub)
                .setAudience(aud)
                .setIssuer(iss)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(900)))
        .claim("role", role)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
        return ResponseEntity.ok(Map.of("token", newAccess, "expiresIn", 900));
    }

    // Login endpoint supporting both hardcoded superadmin and database users
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "");
        String password = body.getOrDefault("password", "");

        // Normalize username/email to reduce "random" login failures from casing/whitespace
        String normalizedUsername = username == null ? "" : username.trim();
        String normalizedEmail = normalizedUsername.toLowerCase(Locale.ROOT);
        if (!normalizedUsername.equals(username)) {
            username = normalizedUsername;
        }
        
        // Check hardcoded super admin first (for development)
        if ("superadmin".equals(username) && "tiana123!".equals(password)) {
            Map<String, Object> tokenResponse = issueToken("SUPER_ADMIN", "superadmin", "youraitester", "youraitester-issuer").getBody();
            // Create a mutable map and add user details for superadmin (no actual user in DB)
            Map<String, Object> response = new HashMap<>(tokenResponse);
            response.put("userId", -1); // Special ID for hardcoded superadmin
            response.put("tenantId", -1);
            response.put("email", "superadmin");
            response.put("name", "Super Admin");
            return ResponseEntity.ok(response);
        }
        
        // Check database users (by email)
        log.info("Login attempt for username/email='{}'", normalizedEmail);
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Verify password
            if (passwordEncoder.matches(password, user.getPassword())) {
                log.info("Login success for userId={}, email='{}', role={}", user.getId(), user.getEmail(), user.getTenantRole());
                // Issue token with user's role
                String role = user.getTenantRole().name(); // SUPER_ADMIN, VENDOR_ADMIN, CLIENT_ADMIN, or MEMBER
                Map<String, Object> tokenResponse = issueToken(role, user.getEmail(), "youraitester", "youraitester-issuer").getBody();
                
                // Create a mutable map and add user details to response
                Map<String, Object> response = new HashMap<>(tokenResponse);
                response.put("userId", user.getId());
                response.put("tenantId", user.getTenant().getId());
                response.put("email", user.getEmail());
                response.put("name", user.getName());
                
                return ResponseEntity.ok(response);
            }
            log.warn("Login failed (password mismatch) for email='{}' userId={}", normalizedEmail, user.getId());
        } else {
            log.warn("Login failed (user not found) for email='{}'", normalizedEmail);
        }
        
        return ResponseEntity.status(401).body(Map.of("error", "invalid_credentials"));
    }
}
