import React from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from './pagination';

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(
                    <PaginationItem key={i}>
                        <PaginationLink isActive={currentPage === i} onClick={() => onPageChange(i)} className="cursor-pointer">
                            {i}
                        </PaginationLink>
                    </PaginationItem>
                );
            }
        } else {
            // Always show first
            pages.push(
                <PaginationItem key={1}>
                    <PaginationLink isActive={currentPage === 1} onClick={() => onPageChange(1)} className="cursor-pointer">
                        1
                    </PaginationLink>
                </PaginationItem>
            );

            if (currentPage > 3) {
                pages.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
            }

            // Show current and neighbors
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(
                    <PaginationItem key={i}>
                        <PaginationLink isActive={currentPage === i} onClick={() => onPageChange(i)} className="cursor-pointer">
                            {i}
                        </PaginationLink>
                    </PaginationItem>
                );
            }

            if (currentPage < totalPages - 2) {
                pages.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
            }

            // Always show last
            pages.push(
                <PaginationItem key={totalPages}>
                    <PaginationLink isActive={currentPage === totalPages} onClick={() => onPageChange(totalPages)} className="cursor-pointer">
                        {totalPages}
                    </PaginationLink>
                </PaginationItem>
            );
        }
        return pages;
    };

    return (
        <div className="py-4">
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                    {renderPageNumbers()}
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
};
