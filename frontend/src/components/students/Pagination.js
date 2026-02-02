import React, { useMemo } from 'react';

/**
 * Pagination - Modern pagination component with smart page number display
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingsCount = 1
}) {
  // Generate page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages = [];
    const leftSiblingIndex = Math.max(currentPage - siblingsCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingsCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (totalPages <= 7) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (shouldShowLeftDots) {
        pages.push('left-dots');
      }

      // Show pages around current
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (shouldShowRightDots) {
        pages.push('right-dots');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages, siblingsCount]);

  if (totalPages <= 1) return null;

  return (
    <nav className="ms-pagination" aria-label="Students pagination">
      {/* Previous Button */}
      <button
        className="ms-pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="ms-pagination-btn-text">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="ms-pagination-pages">
        {pageNumbers.map((page, index) => {
          if (page === 'left-dots' || page === 'right-dots') {
            return (
              <span key={page} className="ms-pagination-ellipsis">
                •••
              </span>
            );
          }

          return (
            <button
              key={page}
              className={`ms-pagination-page ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        className="ms-pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <span className="ms-pagination-btn-text">Next</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
}
