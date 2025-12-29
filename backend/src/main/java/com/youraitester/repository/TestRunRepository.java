package com.youraitester.repository;

import com.youraitester.model.TestRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TestRunRepository extends JpaRepository<TestRun, String> {
    List<TestRun> findByTestId(String testId);
    List<TestRun> findByBatchId(String batchId);
    List<TestRun> findByStatus(String status);
    List<TestRun> findByProjectId(String projectId);
}
