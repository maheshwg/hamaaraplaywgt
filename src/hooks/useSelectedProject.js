import { useState, useEffect } from 'react';

/**
 * Custom hook to track the selected project ID from localStorage
 * and listen for project changes
 */
export function useSelectedProject() {
  const [selectedProjectId, setSelectedProjectId] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null
  );

  useEffect(() => {
    const handleProjectChange = () => {
      const newProjectId = localStorage.getItem('selectedProjectId');
      setSelectedProjectId(newProjectId);
    };
    
    // Listen for custom project change events
    window.addEventListener('projectChanged', handleProjectChange);
    
    // Also listen for storage events (for multi-tab support)
    window.addEventListener('storage', (e) => {
      if (e.key === 'selectedProjectId') {
        setSelectedProjectId(e.newValue);
      }
    });
    
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange);
      window.removeEventListener('storage', handleProjectChange);
    };
  }, []);

  return selectedProjectId;
}




