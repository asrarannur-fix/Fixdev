import React from 'react';
import { Badge } from '../../ui/Badge';
import { ServiceStatus, SERVICE_STATUS_META, SERVICE_TERMINAL_STATUSES } from '../../../domain/serviceWorkflow';

interface StatusBadgeProps {
  status: ServiceStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const meta = SERVICE_STATUS_META[status] || { label: status, tone: 'gray' };
  const isTerminal = SERVICE_TERMINAL_STATUSES.has(status);
  
  return (
    <div className="flex items-center gap-2">
      <Badge tone={meta.tone} size={size}>
        {meta.label}
      </Badge>
      {isTerminal && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium" title="Status Terminal">
          ✓
        </span>
      )}
    </div>
  );
};