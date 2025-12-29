package com.youraitester.repository;

import com.youraitester.model.Test;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TestRepository extends JpaRepository<Test, String> {
    List<Test> findByStatus(String status);
    List<Test> findByTagsContaining(String tag);
    List<Test> findByProjectId(String projectId);
}
