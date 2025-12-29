package com.youraitester.repository;

import com.youraitester.model.Project;
import com.youraitester.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByTenant(Tenant tenant);
}
