import { Pagination, Text } from "@shopify/polaris";
 
export function PaginationBar({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "12px 0",
      }}
    >
      {/* <Text variant="bodySm" tone="subdued">
        Showing {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} of {totalItems}
      </Text> */}
         <div className="pagination-gap-fix">
        <Pagination
          hasPrevious={currentPage > 1}
          onPrevious={() => onPageChange(currentPage - 1)}
          hasNext={currentPage < totalPages}
          onNext={() => onPageChange(currentPage + 1)}
        />
      </div>

      <style>{`
        .pagination-gap-fix .Polaris-ButtonGroup {
          gap: 6px;
      }
      `}</style>
    </div>
    
  );
}