#!/bin/bash
# Generate bcrypt hash for "password" using Spring Boot's password encoder
cd /Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend
java -cp "target/test-automation-backend-1.0.0.jar" -DFiDE org.springframework.boot.loader.JarLauncher &
sleep 2
# Update password directly (bcrypt hash for "password")
psql -U postgres -d test_automation -c "UPDATE users SET password = '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye83JN/4YMbKC9XKf0Vfz4z4z0z0z0z0z' WHERE email = 'abc@abc.com';"
