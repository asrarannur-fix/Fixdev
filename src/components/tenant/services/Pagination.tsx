import React from 'react';
import { Button } from '../../ui/Button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 20,
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const visiblePages = getVisiblePages();
  const showFirst = visiblePages[0] > 1;
  const showLast = visiblePages[visiblePages.length - 1] < totalPages;

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {showFirst && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onPageChange(1)} className="h-8 w-8 p-0">
            1
          </Button>
          {visiblePages[0] > 2 && (
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              ...
            </Button>
          )}
        </>
      )}
      
      {visiblePages.map(page => (
        <Button
          key={page}
          variant={page === currentPage ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onPageChange(page)}
          className="h-8 w-8 p-0"
        >
          {page}
        </Button>
      ))}
      
      {showLast && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
              ...
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onPageChange(totalPages)} className="h-8 w-8 p-0">
            {totalPages}
          </Button>
        </>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};