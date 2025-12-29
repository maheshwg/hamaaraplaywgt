package com.youraitester.dto;

import lombok.Data;

@Data
public class CreateClientRequest {
    private String clientName;
    private Integer maxSeats;
    private String adminName;
    private String adminEmail;
    private String adminPassword;
}

