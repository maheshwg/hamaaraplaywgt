package com.youraitester.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
public class Tenant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // Seat-based licensing: max seats and current usage
    @Column(name = "max_seats")
    private Integer maxSeats = 1;

    @Column(name = "used_seats")
    private Integer usedSeats = 0;

    // Optional: billing email/contact
    private String billingEmail;
}
