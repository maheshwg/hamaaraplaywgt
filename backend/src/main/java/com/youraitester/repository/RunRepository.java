package com.youraitester.repository;

import com.youraitester.model.Run;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RunRepository extends JpaRepository<Run, String> {
    List<Run> findByProjectId(String projectId);
    List<Run> findByStatus(String status);
}

