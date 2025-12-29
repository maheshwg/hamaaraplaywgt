package com.youraitester.model;

public enum Role {
    VENDOR_ADMIN, // Manages clients (tenants)
    CLIENT_ADMIN, // Manages team, billing, projects within a tenant
    MEMBER,        // Regular user with project access
    SUPER_ADMIN    // Global admin for the platform
}
