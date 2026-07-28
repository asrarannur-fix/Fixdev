import React from 'react';
import { Button } from '../../ui/Button';
import { Trash2, Download, Printer } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedIds: string[];
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
  onPrint: () => void;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedIds,
  onClear,
  onDelete,
  onExport,
  onPrint,
}) => {
  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
        {selectedIds.length} dipilih
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrint}
        className="gap-1"
      >
        <Printer className="h-4 w-4" />
        Cetak
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        className="gap-1"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={onDelete}
        className="gap-1"
      >
        <Trash2 className="h-4 w-4" />
        Hapus
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
      >
        Batal
      </Button>
    </div>
  );
};