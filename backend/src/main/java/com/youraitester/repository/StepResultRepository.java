package com.youraitester.repository;

import com.youraitester.model.StepResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Repository
public interface StepResultRepository extends JpaRepository<StepResult, Long> {
    List<StepResult> findByTestRunId(String testRunId);

    // Always return step results in a stable order so the UI doesn't mis-attribute screenshots to "Step N".
    // Use native query to get deterministic ordering even when stepNumber/executedAt are null.
    @Query(value = """
        SELECT *
        FROM test_run_step_results
        WHERE test_run_id = :testRunId
        ORDER BY
          step_number ASC NULLS LAST,
          executed_at ASC NULLS LAST,
          id ASC
        """, nativeQuery = true)
    List<StepResult> findByTestRunIdOrdered(@Param("testRunId") String testRunId);
    
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM test_run_step_results WHERE test_run_id = :testRunId", nativeQuery = true)
    void deleteByTestRunId(@Param("testRunId") String testRunId);
}
