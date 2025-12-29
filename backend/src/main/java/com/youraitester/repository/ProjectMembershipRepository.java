package com.youraitester.repository;

import com.youraitester.model.Project;
import com.youraitester.model.ProjectMembership;
import com.youraitester.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectMembershipRepository extends JpaRepository<ProjectMembership, Long> {
    List<ProjectMembership> findByProject(Project project);
    List<ProjectMembership> findByUser(User user);
    Optional<ProjectMembership> findByProjectAndUser(Project project, User user);
}
