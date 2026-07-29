import React, { useState, useEffect } from 'react';
import { ServiceStatus, SERVICE_STATUS_META, SERVICE_TERMINAL_STATUSES } from '../../../domain/serviceWorkflow';
import { Check, X, AlertCircle, Filter as FilterIcon } from 'lucide-react';

interface ServiceStatusFilterProps {
  selectedStatus: string | 'ALL';
  onStatusChange: (status: string | 'ALL') => void;
  onClearFilters: () => void;
}

export const ServiceStatusFilter: React.FC<ServiceStatusFilterProps> = ({
  selectedStatus,
  onStatusChange,
  onClearFilters
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activeStatusCount = Object.values(ServiceStatus).filter(
    s => s !== ServiceStatus.DRAFT && s !== ServiceStatus.BOOKING
  ).length;

  const filteredStatuses = Object.entries(ServiceStatus).filter(([key, value]) => {
    if (value === ServiceStatus.DRAFT || value === ServiceStatus.BOOKING) return false;
    if (searchTerm === '') return true;
    return SERVICE_STATUS_META[value]?.label?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
      >
        <FilterIcon className="h-4 w-4" />
        Status {selectedStatus === 'ALL' ? '(Semua)' : `(${selectedStatus})`}
        <AlertCircle className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Cari status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          
          <div className="p-2">
            <button
              onClick={() => { onStatusChange('ALL'); setIsOpen(false); }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded ${
                selectedStatus === 'ALL' 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'hover:bg-gray-100'
              }`}
            >
              Semua Status ({activeStatusCount})
            </button>

            {filteredStatuses.map(([key, value]) => {
              const meta = SERVICE_STATUS_META[value];
              return (
                <button
                  key={key}
                  onClick={() => { onStatusChange(value); setIsOpen(false); }}
                  className={`w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2 ${
                    selectedStatus === value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: meta?.tone || '#3b82f6' }} />
                  {meta?.label || value}
                  {selectedStatus === value && <Check className="ml-auto h-4 w-4" />}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t">
            <button
              onClick={() => { onClearFilters(); setIsOpen(false); }}
              className="w-full px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Reset Semua Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};