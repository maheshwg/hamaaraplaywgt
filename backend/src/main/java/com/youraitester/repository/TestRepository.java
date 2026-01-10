package com.youraitester.repository;

import com.youraitester.model.Test;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TestRepository extends JpaRepository<Test, String> {
    List<Test> findByStatus(String status);
    List<Test> findByTagsContaining(String tag);
    List<Test> findByProjectId(String projectId);

    long countByAppId(Long appId);

    /**
     * Unlink tests from an app before deleting the app record.
     * Keeps tests intact (they can still run via non-app / AI paths) while removing the app metadata dependency.
     */
    @Modifying
    @Query("update Test t set t.appId = null where t.appId = :appId")
    int clearAppIdForTests(@Param("appId") Long appId);
}
