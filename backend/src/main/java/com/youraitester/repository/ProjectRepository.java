package com.youraitester.repository;

import com.youraitester.model.Project;
import com.youraitester.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByTenant(Tenant tenant);

    /**
     * Native projection used for SUPER_ADMIN listing to avoid failures when there are dangling tenant references
     * (e.g. projects.tenant_id pointing to a deleted tenant). This avoids forcing Hibernate to hydrate relations.
     *
     * Row shape: [id, name, description, tenant_id, tenant_name]
     */
    @Query(
            value = "select p.id, p.name, p.description, p.tenant_id, t.name as tenant_name " +
                    "from projects p " +
                    "left join tenants t on p.tenant_id = t.id",
            nativeQuery = true
    )
    List<Object[]> findAllProjectRowsWithTenant();

    /**
     * Row shape: [id, name, description, tenant_id]
     */
    @Query(
            value = "select p.id, p.name, p.description, p.tenant_id " +
                    "from projects p " +
                    "where p.tenant_id = :tenantId",
            nativeQuery = true
    )
    List<Object[]> findProjectRowsByTenantId(@Param("tenantId") Long tenantId);
}
