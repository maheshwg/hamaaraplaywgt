import { Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NoProjectWarning() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <Settings2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-amber-900">No Project Selected</h3>
          <p className="text-sm text-amber-700 mt-1">
            Please select a project from the dropdown in the top navigation bar to view and manage data for that project.
          </p>
        </div>
      </div>
    </motion.div>
  );
}




